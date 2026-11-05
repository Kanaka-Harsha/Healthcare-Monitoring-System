from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.db.session import get_db
from app.core.security import hash_aadhaar, mask_aadhaar, get_password_hash
from app.core.clinical_risk import compute_vitals_risk
from app.models.user import User
from app.models.patient import Patient
from app.models.vitals import VitalsRecord
from app.schemas.patient import PatientCreate, PatientOut, BatchPatientSyncRequest
from app.schemas.vitals import VitalsRecordCreate, BatchVitalsSyncRequest, VitalsRecordOut, VitalsWithPatientOut
from app.api.deps import get_current_user, require_role, log_audit_event

router = APIRouter()

# Staff allowed to register patients and submit vitals
camp_staff_or_admin = require_role(["camp_assistant", "volunteer", "doctor", "admin", "collector", "registrar"])

@router.get("/patient/search", response_model=PatientOut)
def search_patient_for_camp(
    phone: Optional[str] = Query(None, description="10-digit mobile number"),
    query: Optional[str] = Query(None, description="Phone, Aadhaar, or Name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(camp_staff_or_admin)
):
    """
    Search the master patient registry by phone number, Aadhaar, or Name.
    Allows Assistant/Camp to immediately locate patients registered by Volunteers
    without requiring re-registration.
    """
    search_val = (phone or query or "").strip()
    if not search_val:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a phone number or name to search."
        )

    clean_digits = "".join(filter(str.isdigit, search_val))

    patient = None
    # 1. Search by normalized mobile number. Older records may include +91,
    # spaces, or punctuation, so also match the final ten digits.
    if len(clean_digits) >= 10:
        last_10 = clean_digits[-10:]
        patient = db.query(Patient).filter(
            or_(Patient.phone == last_10, Patient.phone.ilike(f"%{last_10}"))
        ).first()

        # Some earlier registration flows created the patient login first.
        # Resolve that account back to its patient profile before offering a
        # second registration.
        if not patient:
            patient_user = db.query(User).filter(
                User.role == "patient",
                or_(
                    User.phone == last_10,
                    User.phone.ilike(f"%{last_10}"),
                    User.username == last_10,
                ),
            ).first()
            if patient_user:
                patient = db.query(Patient).filter(
                    or_(Patient.id == patient_user.id, Patient.phone.ilike(f"%{last_10}"))
                ).first()

    # 2. Search by 12-digit Aadhaar number
    if not patient and len(clean_digits) == 12:
        aadhaar_h = hash_aadhaar(clean_digits)
        patient = db.query(Patient).filter(Patient.aadhaar_hash == aadhaar_h).first()

    # 3. Fallback: match by full name or partial phone
    if not patient:
        filters = [Patient.full_name.ilike(f"%{search_val}%"), Patient.aadhaar_masked.like(f"%{search_val}%")]
        if clean_digits:
            filters.append(Patient.phone.like(f"%{clean_digits}%"))
        patient = db.query(Patient).filter(or_(*filters)).first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No registered citizen found for '{search_val}'. Please verify the mobile number or register them below."
        )

    return patient

@router.post("/patient", response_model=PatientOut)
def register_or_get_patient(
    payload: PatientCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(camp_staff_or_admin)
):
    """
    Register a new patient or update existing patient in the village health camp.
    Saves separated address fields, clinical categorization, and automatically creates
    the patient's portal login with Phone as Username.
    """
    clean_phone = "".join(filter(str.isdigit, payload.phone))[-10:]
    aadhaar_h = hash_aadhaar(payload.aadhaar_number)
    aadhaar_m = mask_aadhaar(payload.aadhaar_number)

    # Compile address string if separate fields are provided
    addr_parts = [
        payload.house_number,
        payload.village_or_town,
        payload.city,
        payload.district,
        payload.state,
        payload.pincode
    ]
    compiled_address = ", ".join([p for p in addr_parts if p and p.strip()]) or payload.address

    # Check if patient exists by phone or aadhaar hash
    patient = db.query(Patient).filter(
        or_(
            Patient.phone == clean_phone,
            Patient.aadhaar_hash == aadhaar_h
        )
    ).first()

    initial_pin = payload.patient_pin or clean_phone[-4:]

    if patient:
        # Update existing details
        patient.full_name = payload.full_name
        patient.phone = clean_phone
        patient.aadhaar_masked = aadhaar_m
        patient.aadhaar_hash = aadhaar_h
        if payload.age is not None:
            patient.age = payload.age
        if payload.gender:
            patient.gender = payload.gender
        
        # Address fields
        if payload.house_number: patient.house_number = payload.house_number
        if payload.village_or_town: patient.village_or_town = payload.village_or_town
        if payload.city: patient.city = payload.city
        if payload.district: patient.district = payload.district
        if payload.state: patient.state = payload.state
        if payload.country: patient.country = payload.country
        if payload.pincode: patient.pincode = payload.pincode
        patient.address = compiled_address

        # Health issue
        if payload.primary_health_issue: patient.primary_health_issue = payload.primary_health_issue
        if payload.health_issues_list: patient.health_issues_list = payload.health_issues_list
        if payload.emergency_contact: patient.emergency_contact = payload.emergency_contact
        if payload.medical_history: patient.medical_history = payload.medical_history
        
        patient.is_scanned = True
        patient.registered_by_id = current_user.id
        
        # Ensure User account exists and password updated if PIN provided
        user = db.query(User).filter(or_(User.id == patient.id, User.phone == clean_phone)).first()
        if user:
            user.full_name = patient.full_name
            user.username = clean_phone
            if payload.patient_pin:
                user.password_hash = get_password_hash(payload.patient_pin)
        else:
            user = User(
                id=patient.id,
                username=clean_phone,
                full_name=patient.full_name,
                phone=clean_phone,
                role="patient",
                password_hash=get_password_hash(initial_pin),
                is_active=True
            )
            db.add(user)

        db.commit()
        db.refresh(patient)
        
        log_audit_event(
            db=db,
            action="PATIENT_UPDATED",
            user_id=current_user.id,
            resource_type="patient",
            resource_id=str(patient.id),
            details=f"Patient {patient.full_name} updated by {current_user.full_name} ({current_user.role})",
            ip_address=request.client.host if request.client else None
        )
        return patient

    # Create new patient
    new_patient = Patient(
        full_name=payload.full_name,
        phone=clean_phone,
        aadhaar_masked=aadhaar_m,
        aadhaar_hash=aadhaar_h,
        age=payload.age,
        gender=payload.gender,
        house_number=payload.house_number,
        village_or_town=payload.village_or_town,
        city=payload.city,
        district=payload.district,
        state=payload.state,
        country=payload.country or "India",
        pincode=payload.pincode,
        address=compiled_address,
        primary_health_issue=payload.primary_health_issue or "General Checkup",
        health_issues_list=payload.health_issues_list,
        risk_category="Green",
        is_scanned=True,
        registered_by_id=current_user.id,
        emergency_contact=payload.emergency_contact,
        medical_history=payload.medical_history
    )
    db.add(new_patient)
    db.flush()

    # Ensure User record exists for patient so they can log in
    user = db.query(User).filter(or_(User.phone == clean_phone, User.username == clean_phone)).first()
    if not user:
        user = User(
            id=new_patient.id,
            username=clean_phone,
            full_name=new_patient.full_name,
            phone=clean_phone,
            role="patient",
            password_hash=get_password_hash(initial_pin),
            is_active=True
        )
        db.add(user)

    db.commit()
    db.refresh(new_patient)

    log_audit_event(
        db=db,
        action="PATIENT_REGISTERED",
        user_id=current_user.id,
        resource_type="patient",
        resource_id=str(new_patient.id),
        details=f"Patient {new_patient.full_name} registered in village camp by {current_user.full_name} ({current_user.role})",
        ip_address=request.client.host if request.client else None
    )

    return new_patient

@router.post("/patient/batch-sync")
def batch_sync_offline_patients(
    payload: BatchPatientSyncRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(camp_staff_or_admin)
):
    """
    Offline-first sync endpoint for patient registrations:
    Receives batch of locally registered patients when village connection is restored.
    """
    synced_count = 0
    updated_count = 0
    errors = []

    for item in payload.patients:
        try:
            clean_phone = "".join(filter(str.isdigit, item.phone))[-10:]
            aadhaar_h = hash_aadhaar(item.aadhaar_number)
            aadhaar_m = mask_aadhaar(item.aadhaar_number)

            addr_parts = [
                item.house_number,
                item.village_or_town,
                item.city,
                item.district,
                item.state,
                item.pincode
            ]
            compiled_address = ", ".join([p for p in addr_parts if p and p.strip()]) or item.address

            patient = db.query(Patient).filter(
                or_(
                    Patient.phone == clean_phone,
                    Patient.aadhaar_hash == aadhaar_h
                )
            ).first()

            initial_pin = item.patient_pin or clean_phone[-4:]

            if patient:
                patient.full_name = item.full_name
                patient.phone = clean_phone
                patient.aadhaar_masked = aadhaar_m
                patient.aadhaar_hash = aadhaar_h
                if item.age is not None: patient.age = item.age
                if item.gender: patient.gender = item.gender
                if item.house_number: patient.house_number = item.house_number
                if item.village_or_town: patient.village_or_town = item.village_or_town
                if item.city: patient.city = item.city
                if item.district: patient.district = item.district
                if item.state: patient.state = item.state
                if item.pincode: patient.pincode = item.pincode
                patient.address = compiled_address
                if item.primary_health_issue: patient.primary_health_issue = item.primary_health_issue
                patient.is_scanned = True
                updated_count += 1
            else:
                new_patient = Patient(
                    full_name=item.full_name,
                    phone=clean_phone,
                    aadhaar_masked=aadhaar_m,
                    aadhaar_hash=aadhaar_h,
                    age=item.age,
                    gender=item.gender,
                    house_number=item.house_number,
                    village_or_town=item.village_or_town,
                    city=item.city,
                    district=item.district,
                    state=item.state,
                    country=item.country or "India",
                    pincode=item.pincode,
                    address=compiled_address,
                    primary_health_issue=item.primary_health_issue or "General Checkup",
                    health_issues_list=item.health_issues_list,
                    risk_category="Green",
                    is_scanned=True,
                    registered_by_id=current_user.id,
                    emergency_contact=item.emergency_contact,
                    medical_history=item.medical_history
                )
                db.add(new_patient)
                db.flush()

                # Create user
                user = db.query(User).filter(or_(User.phone == clean_phone, User.username == clean_phone)).first()
                if not user:
                    user = User(
                        id=new_patient.id,
                        username=clean_phone,
                        full_name=new_patient.full_name,
                        phone=clean_phone,
                        role="patient",
                        password_hash=get_password_hash(initial_pin),
                        is_active=True
                    )
                    db.add(user)

                synced_count += 1
        except Exception as e:
            errors.append(f"Failed to process patient {item.full_name}: {str(e)}")

    db.commit()

    log_audit_event(
        db=db,
        action="OFFLINE_PATIENT_BATCH_SYNC",
        user_id=current_user.id,
        resource_type="patient",
        details=f"Staff {current_user.full_name} synced {synced_count} new patients, updated {updated_count} records",
        ip_address=request.client.host if request.client else None
    )

    return {
        "success": True,
        "synced_count": synced_count,
        "updated_count": updated_count,
        "errors": errors
    }

@router.post("/vitals", response_model=VitalsRecordOut)
def submit_vitals(
    payload: VitalsRecordCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(camp_staff_or_admin)
):
    """
    Submit a single vitals recording (from ESP32 BLE or manual intake).
    Automatically computes Red / Orange / Green clinical risk.
    """
    patient: Optional[Patient] = None

    if payload.patient_id:
        patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    elif payload.patient_phone:
        clean_phone = "".join(filter(str.isdigit, payload.patient_phone))[-10:]
        patient = db.query(Patient).filter(Patient.phone == clean_phone).first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patient not found. Please register or select the patient first."
        )

    # Check for deduplication by client_sync_id if present
    if payload.client_sync_id:
        existing = db.query(VitalsRecord).filter(VitalsRecord.client_sync_id == payload.client_sync_id).first()
        if existing:
            return existing

    # Automatically compute risk level (Red, Orange, Green)
    computed_risk, explanation = compute_vitals_risk(
        systolic_bp=payload.systolic_bp,
        diastolic_bp=payload.diastolic_bp,
        spo2=payload.spo2,
        blood_glucose=payload.blood_glucose,
        heart_rate=payload.heart_rate
    )

    vitals = VitalsRecord(
        patient_id=patient.id,
        collector_id=current_user.id,
        systolic_bp=payload.systolic_bp,
        diastolic_bp=payload.diastolic_bp,
        heart_rate=payload.heart_rate,
        spo2=payload.spo2,
        temperature=payload.temperature,
        blood_glucose=payload.blood_glucose,
        risk_level=computed_risk,
        additional_metrics=payload.additional_metrics,
        device_id=payload.device_id,
        client_sync_id=payload.client_sync_id,
        recorded_at=payload.recorded_at or datetime.now(timezone.utc),
        synced_at=datetime.now(timezone.utc)
    )
    db.add(vitals)

    # Update patient's current risk category
    patient.risk_category = computed_risk

    db.commit()
    db.refresh(vitals)

    log_audit_event(
        db=db,
        action="VITALS_INGESTED",
        user_id=current_user.id,
        resource_type="vitals",
        resource_id=str(vitals.id),
        details=f"Vitals recorded for {patient.full_name}: Risk {computed_risk} ({explanation})",
        ip_address=request.client.host if request.client else None
    )

    return vitals

@router.post("/vitals/batch-sync")
def batch_sync_offline_vitals(
    payload: BatchVitalsSyncRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(camp_staff_or_admin)
):
    """
    Offline-first sync endpoint for vitals records.
    """
    synced_count = 0
    skipped_count = 0
    errors = []

    for item in payload.records:
        try:
            if item.client_sync_id:
                existing = db.query(VitalsRecord).filter(VitalsRecord.client_sync_id == item.client_sync_id).first()
                if existing:
                    skipped_count += 1
                    continue

            patient = None
            if item.patient_id:
                patient = db.query(Patient).filter(Patient.id == item.patient_id).first()
            elif item.patient_phone:
                clean_phone = "".join(filter(str.isdigit, item.patient_phone))[-10:]
                patient = db.query(Patient).filter(Patient.phone == clean_phone).first()

            if not patient:
                errors.append(f"Missing patient for record {item.client_sync_id or 'unknown'}")
                continue

            computed_risk, _ = compute_vitals_risk(
                systolic_bp=item.systolic_bp,
                diastolic_bp=item.diastolic_bp,
                spo2=item.spo2,
                blood_glucose=item.blood_glucose,
                heart_rate=item.heart_rate
            )

            vitals = VitalsRecord(
                patient_id=patient.id,
                collector_id=current_user.id,
                systolic_bp=item.systolic_bp,
                diastolic_bp=item.diastolic_bp,
                heart_rate=item.heart_rate,
                spo2=item.spo2,
                temperature=item.temperature,
                blood_glucose=item.blood_glucose,
                risk_level=computed_risk,
                additional_metrics=item.additional_metrics,
                device_id=item.device_id,
                client_sync_id=item.client_sync_id,
                recorded_at=item.recorded_at or datetime.now(timezone.utc),
                synced_at=datetime.now(timezone.utc)
            )
            db.add(vitals)
            patient.risk_category = computed_risk
            synced_count += 1
        except Exception as e:
            errors.append(str(e))

    db.commit()

    return {
        "success": True,
        "synced_count": synced_count,
        "skipped_count": skipped_count,
        "errors": errors
    }

@router.get("/history", response_model=List[VitalsWithPatientOut])
def get_collector_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(camp_staff_or_admin)
):
    """
    Get list of recent screenings performed by the current staff user.
    """
    query = db.query(VitalsRecord).join(Patient, VitalsRecord.patient_id == Patient.id)
    if current_user.role != "admin":
        query = query.filter(VitalsRecord.collector_id == current_user.id)
    
    records = query.order_by(desc(VitalsRecord.recorded_at)).limit(limit).all()

    results = []
    for r in records:
        results.append(
            VitalsWithPatientOut(
                id=r.id,
                patient_id=r.patient_id,
                collector_id=r.collector_id,
                systolic_bp=r.systolic_bp,
                diastolic_bp=r.diastolic_bp,
                heart_rate=r.heart_rate,
                spo2=r.spo2,
                temperature=r.temperature,
                blood_glucose=r.blood_glucose,
                risk_level=r.risk_level or "Green",
                additional_metrics=r.additional_metrics,
                device_id=r.device_id,
                client_sync_id=r.client_sync_id,
                recorded_at=r.recorded_at,
                synced_at=r.synced_at,
                patient_name=r.patient.full_name,
                patient_phone=r.patient.phone,
                patient_aadhaar_masked=r.patient.aadhaar_masked
            )
        )
    return results
