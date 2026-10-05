from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.db.session import get_db
from app.core.security import hash_aadhaar, mask_aadhaar
from app.models.user import User
from app.models.patient import Patient
from app.models.vitals import VitalsRecord
from app.schemas.patient import PatientCreate, PatientOut, BatchPatientSyncRequest
from app.schemas.vitals import VitalsRecordCreate, BatchVitalsSyncRequest, VitalsRecordOut, VitalsWithPatientOut
from app.api.deps import get_current_user, require_role, log_audit_event

router = APIRouter()

# Restrict to registrars, collectors, doctors, and admins
collector_or_admin = require_role(["registrar", "collector", "doctor", "admin"])

@router.post("/patient", response_model=PatientOut)
def register_or_get_patient(
    payload: PatientCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(collector_or_admin)
):
    """
    Register a new patient or update existing patient by Phone or Aadhaar hash.
    Securely hashes 12-digit Aadhaar and stores masked version.
    Now includes comprehensive medical history questionnaire saving.
    """
    clean_phone = "".join(filter(str.isdigit, payload.phone))[-10:]
    aadhaar_h = hash_aadhaar(payload.aadhaar_number)
    aadhaar_m = mask_aadhaar(payload.aadhaar_number)

    # Check if patient exists by phone or aadhaar hash
    patient = db.query(Patient).filter(
        or_(
            Patient.phone == clean_phone,
            Patient.aadhaar_hash == aadhaar_h
        )
    ).first()

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
        if payload.address:
            patient.address = payload.address
        if payload.emergency_contact:
            patient.emergency_contact = payload.emergency_contact
        if payload.medical_history:
            patient.medical_history = payload.medical_history
        
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
        address=payload.address,
        emergency_contact=payload.emergency_contact,
        medical_history=payload.medical_history
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    log_audit_event(
        db=db,
        action="PATIENT_REGISTERED",
        user_id=current_user.id,
        resource_type="patient",
        resource_id=str(new_patient.id),
        details=f"Patient {new_patient.full_name} registered by {current_user.full_name} ({current_user.role})",
        ip_address=request.client.host if request.client else None
    )

    return new_patient

@router.post("/patient/batch-sync")
def batch_sync_offline_patients(
    payload: BatchPatientSyncRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(collector_or_admin)
):
    """
    Offline-first sync endpoint for patient registrations:
    Receives batch of locally registered patients and health histories when connection is restored.
    """
    synced_count = 0
    updated_count = 0
    errors = []

    for item in payload.patients:
        try:
            clean_phone = "".join(filter(str.isdigit, item.phone))[-10:]
            aadhaar_h = hash_aadhaar(item.aadhaar_number)
            aadhaar_m = mask_aadhaar(item.aadhaar_number)

            patient = db.query(Patient).filter(
                or_(
                    Patient.phone == clean_phone,
                    Patient.aadhaar_hash == aadhaar_h
                )
            ).first()

            if patient:
                # Update details and merge questionnaire if needed
                patient.full_name = item.full_name
                patient.phone = clean_phone
                patient.aadhaar_masked = aadhaar_m
                patient.aadhaar_hash = aadhaar_h
                if item.age is not None:
                    patient.age = item.age
                if item.gender:
                    patient.gender = item.gender
                if item.address:
                    patient.address = item.address
                if item.emergency_contact:
                    patient.emergency_contact = item.emergency_contact
                if item.medical_history:
                    patient.medical_history = item.medical_history
                updated_count += 1
            else:
                new_patient = Patient(
                    full_name=item.full_name,
                    phone=clean_phone,
                    aadhaar_masked=aadhaar_m,
                    aadhaar_hash=aadhaar_h,
                    age=item.age,
                    gender=item.gender,
                    address=item.address,
                    emergency_contact=item.emergency_contact,
                    medical_history=item.medical_history
                )
                db.add(new_patient)
                synced_count += 1
        except Exception as e:
            errors.append(f"Failed to process patient {item.full_name}: {str(e)}")

    db.commit()

    log_audit_event(
        db=db,
        action="OFFLINE_PATIENT_BATCH_SYNC",
        user_id=current_user.id,
        resource_type="patient",
        details=f"Registrar/Collector {current_user.full_name} synced {synced_count} new patients, updated {updated_count} records",
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
    current_user: User = Depends(collector_or_admin)
):
    """
    Submit a single vitals recording (from ESP32 BLE or manual intake).
    Auto-creates/links patient if patient_id or phone is provided.
    """
    patient: Optional[Patient] = None

    if payload.patient_id:
        patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    elif payload.patient_phone:
        clean_phone = "".join(filter(str.isdigit, payload.patient_phone))[-10:]
        aadhaar_h = hash_aadhaar(payload.patient_aadhaar) if payload.patient_aadhaar else None
        
        filter_expr = (Patient.phone == clean_phone)
        if aadhaar_h:
            filter_expr = or_(Patient.phone == clean_phone, Patient.aadhaar_hash == aadhaar_h)
            
        patient = db.query(Patient).filter(filter_expr).first()
        
        if patient:
            # Update phone if provided
            if clean_phone and patient.phone != clean_phone:
                patient.phone = clean_phone
                db.commit()
                db.refresh(patient)
        elif payload.patient_name and payload.patient_aadhaar:
            # Auto-register on the fly
            patient = Patient(
                full_name=payload.patient_name,
                phone=clean_phone,
                aadhaar_masked=mask_aadhaar(payload.patient_aadhaar),
                aadhaar_hash=aadhaar_h,
                age=payload.patient_age,
                gender=payload.patient_gender
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid Patient ID or complete patient registration info (Name, Phone, Aadhaar) is required."
        )

    # Check for deduplication by client_sync_id if present
    if payload.client_sync_id:
        existing = db.query(VitalsRecord).filter(VitalsRecord.client_sync_id == payload.client_sync_id).first()
        if existing:
            return existing

    vitals = VitalsRecord(
        patient_id=patient.id,
        collector_id=current_user.id,
        systolic_bp=payload.systolic_bp,
        diastolic_bp=payload.diastolic_bp,
        heart_rate=payload.heart_rate,
        spo2=payload.spo2,
        temperature=payload.temperature,
        blood_glucose=payload.blood_glucose,
        additional_metrics=payload.additional_metrics,
        device_id=payload.device_id,
        client_sync_id=payload.client_sync_id,
        recorded_at=payload.recorded_at or datetime.now(timezone.utc),
        synced_at=datetime.now(timezone.utc)
    )
    db.add(vitals)
    db.commit()
    db.refresh(vitals)

    log_audit_event(
        db=db,
        action="VITALS_INGESTED",
        user_id=current_user.id,
        resource_type="vitals",
        resource_id=str(vitals.id),
        details=f"Vitals recorded for {patient.full_name}: BP {payload.systolic_bp}/{payload.diastolic_bp}, HR {payload.heart_rate}, SpO2 {payload.spo2}",
        ip_address=request.client.host if request.client else None
    )

    return vitals

@router.post("/vitals/batch-sync")
def batch_sync_offline_vitals(
    payload: BatchVitalsSyncRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(collector_or_admin)
):
    """
    Offline-first sync endpoint: Receives batch of locally stored screenings
    when mobile data collector regains internet connectivity.
    """
    synced_count = 0
    skipped_count = 0
    errors = []

    for item in payload.records:
        try:
            # Check client_sync_id deduplication
            if item.client_sync_id:
                existing = db.query(VitalsRecord).filter(VitalsRecord.client_sync_id == item.client_sync_id).first()
                if existing:
                    skipped_count += 1
                    continue

            patient = None
            if item.patient_id:
                patient = db.query(Patient).filter(Patient.id == item.patient_id).first()
            
            if not patient and item.patient_phone:
                clean_phone = "".join(filter(str.isdigit, item.patient_phone))[-10:]
                aadhaar_h = hash_aadhaar(item.patient_aadhaar) if item.patient_aadhaar else None
                
                filter_expr = (Patient.phone == clean_phone)
                if aadhaar_h:
                    filter_expr = or_(Patient.phone == clean_phone, Patient.aadhaar_hash == aadhaar_h)
                    
                patient = db.query(Patient).filter(filter_expr).first()
                
                if not patient and item.patient_name and item.patient_aadhaar:
                    patient = Patient(
                        full_name=item.patient_name,
                        phone=clean_phone,
                        aadhaar_masked=mask_aadhaar(item.patient_aadhaar),
                        aadhaar_hash=aadhaar_h,
                        age=item.patient_age,
                        gender=item.patient_gender
                    )
                    db.add(patient)
                    db.flush()

            if not patient:
                errors.append(f"Missing patient reference for record {item.client_sync_id or 'unknown'}")
                continue

            vitals = VitalsRecord(
                patient_id=patient.id,
                collector_id=current_user.id,
                systolic_bp=item.systolic_bp,
                diastolic_bp=item.diastolic_bp,
                heart_rate=item.heart_rate,
                spo2=item.spo2,
                temperature=item.temperature,
                blood_glucose=item.blood_glucose,
                additional_metrics=item.additional_metrics,
                device_id=item.device_id,
                client_sync_id=item.client_sync_id,
                recorded_at=item.recorded_at or datetime.now(timezone.utc),
                synced_at=datetime.now(timezone.utc)
            )
            db.add(vitals)
            synced_count += 1
        except Exception as e:
            errors.append(str(e))

    db.commit()

    log_audit_event(
        db=db,
        action="OFFLINE_BATCH_SYNC",
        user_id=current_user.id,
        resource_type="vitals",
        details=f"Collector {current_user.full_name} synced {synced_count} offline records ({skipped_count} duplicates skipped)",
        ip_address=request.client.host if request.client else None
    )

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
    current_user: User = Depends(collector_or_admin)
):
    """
    Get list of recent screenings performed by the current data collector.
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
