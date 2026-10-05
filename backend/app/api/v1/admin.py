from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_

from app.db.session import get_db
from app.core.security import get_password_hash, hash_aadhaar, mask_aadhaar
from app.models.user import User
from app.models.patient import Patient
from app.models.vitals import VitalsRecord
from app.models.device import Device
from app.models.audit import AuditLog
from app.models.session import DoctorAccessSession
from app.schemas.user import UserCreate, UserUpdate, UserOut
from app.schemas.patient import PatientCreate, PatientOut
from app.schemas.admin import DeviceCreate, DeviceOut, AuditLogOut, AnalyticsOverviewOut
from app.api.deps import require_role, log_audit_event

router = APIRouter()

admin_only = require_role(["admin"])

@router.get("/analytics/overview", response_model=AnalyticsOverviewOut)
def get_analytics_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only)
):
    """
    Get aggregated population health statistics, screening metrics, and audit summary.
    """
    total_patients = db.query(Patient).count()
    total_screenings = db.query(VitalsRecord).count()
    total_doctors = db.query(User).filter(User.role == "doctor").count()
    total_collectors = db.query(User).filter(User.role == "collector").count()
    total_devices = db.query(Device).count()

    # 24h count
    cutoff_24h = datetime.now(timezone.utc) - timedelta(hours=24)
    recent_screenings_24h = db.query(VitalsRecord).filter(VitalsRecord.recorded_at >= cutoff_24h).count()

    # Vitals anomalies (Hypertension Stage 2 or Low SpO2)
    anomalies_count = db.query(VitalsRecord).filter(
        or_(
            VitalsRecord.spo2 < 92,
            VitalsRecord.systolic_bp >= 140,
            VitalsRecord.diastolic_bp >= 90,
            VitalsRecord.heart_rate > 110,
            VitalsRecord.heart_rate < 50
        )
    ).count()

    # Gender breakdown
    gender_counts = (
        db.query(Patient.gender, func.count(Patient.id))
        .group_by(Patient.gender)
        .all()
    )
    gender_map = {}
    for g, count in gender_counts:
        gender_map[g or "Unspecified"] = count

    # Recent 10 audit logs
    audit_records = (
        db.query(AuditLog)
        .order_by(desc(AuditLog.created_at))
        .limit(10)
        .all()
    )
    
    formatted_audits = []
    for a in audit_records:
        formatted_audits.append(
            AuditLogOut(
                id=a.id,
                user_id=a.user_id,
                user_name=a.user.full_name if a.user else "System",
                user_role=a.user.role if a.user else None,
                action=a.action,
                resource_type=a.resource_type,
                resource_id=a.resource_id,
                details=a.details,
                ip_address=a.ip_address,
                created_at=a.created_at
            )
        )

    return AnalyticsOverviewOut(
        total_patients=total_patients,
        total_screenings=total_screenings,
        total_doctors=total_doctors,
        total_collectors=total_collectors,
        total_devices=total_devices,
        recent_screenings_count_24h=recent_screenings_24h,
        vitals_anomalies_count=anomalies_count,
        screenings_by_gender=gender_map,
        recent_audit_logs=formatted_audits
    )

@router.get("/users", response_model=List[UserOut])
def list_users(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only)
):
    """
    List all staff and system users with optional role filtering.
    """
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.order_by(desc(User.created_at)).all()

@router.post("/users", response_model=UserOut)
def create_staff_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only)
):
    """
    Create a new staff user (Doctor, Collector, or Admin).
    """
    clean_phone = "".join(filter(str.isdigit, payload.phone))
    
    if payload.email:
        existing_email = db.query(User).filter(User.email == payload.email.strip().lower()).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="User with this email already exists.")
    
    existing_phone = db.query(User).filter(User.phone == clean_phone).first()
    if existing_phone:
        raise HTTPException(status_code=400, detail="User with this phone number already exists.")

    new_user = User(
        full_name=payload.full_name,
        email=payload.email.strip().lower() if payload.email else None,
        phone=clean_phone,
        role=payload.role,
        password_hash=get_password_hash(payload.password),
        is_active=payload.is_active
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit_event(
        db=db,
        action="USER_CREATED",
        user_id=current_user.id,
        resource_type="user",
        resource_id=str(new_user.id),
        details=f"Admin {current_user.full_name} created user {new_user.full_name} with role {new_user.role}"
    )

    return new_user

@router.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: UUID,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only)
):
    """
    Admin updates a staff member or user, changes role, or allocates a new password.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.email is not None:
        clean_email = payload.email.strip().lower() if payload.email.strip() else None
        if clean_email:
            existing_email = db.query(User).filter(User.email == clean_email, User.id != user_id).first()
            if existing_email:
                raise HTTPException(status_code=400, detail="Another user with this email address already exists.")
        user.email = clean_email
    if payload.phone is not None:
        clean_phone = "".join(filter(str.isdigit, payload.phone))[-10:]
        if clean_phone:
            existing_phone = db.query(User).filter(User.phone == clean_phone, User.id != user_id).first()
            if existing_phone:
                raise HTTPException(status_code=400, detail="Another user with this phone number already exists.")
            user.phone = clean_phone
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.password and payload.password.strip():
        user.password_hash = get_password_hash(payload.password.strip())

    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        action="USER_UPDATED_BY_ADMIN",
        user_id=current_user.id,
        resource_type="user",
        resource_id=str(user.id),
        details=f"Admin {current_user.full_name} updated account for {user.full_name} (Role: {user.role})"
    )

    return user

@router.delete("/users/{user_id}")
def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only)
):
    """
    Admin permanently deletes a user/staff account.
    """
    if str(user_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="You cannot delete your own admin account.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user_name = user.full_name
    user_role = user.role

    # Clean up any sessions
    db.query(DoctorAccessSession).filter(DoctorAccessSession.doctor_id == user_id).delete()

    db.delete(user)
    db.commit()

    log_audit_event(
        db=db,
        action="USER_DELETED",
        user_id=current_user.id,
        resource_type="user",
        resource_id=str(user_id),
        details=f"Admin {current_user.full_name} deleted {user_role} account: {user_name}"
    )

    return {"success": True, "message": f"User {user_name} ({user_role}) was successfully deleted."}

@router.put("/users/{user_id}/status")
def toggle_user_status(
    user_id: UUID,
    is_active: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only)
):
    """
    Activate or deactivate a user account.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    user.is_active = is_active
    db.commit()

    log_audit_event(
        db=db,
        action="USER_STATUS_TOGGLED",
        user_id=current_user.id,
        resource_type="user",
        resource_id=str(user.id),
        details=f"User {user.full_name} status changed to {'Active' if is_active else 'Deactivated'}"
    )
    return {"success": True, "message": f"User status set to {'Active' if is_active else 'Deactivated'}"}

@router.get("/devices", response_model=List[DeviceOut])
def list_devices(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only)
):
    """
    List all registered ESP32 Bluetooth devices.
    """
    devices = db.query(Device).order_by(desc(Device.created_at)).all()
    results = []
    for d in devices:
        results.append(
            DeviceOut(
                id=d.id,
                device_name=d.device_name,
                device_mac=d.device_mac,
                assigned_collector_id=d.assigned_collector_id,
                assigned_collector_name=d.assigned_collector.full_name if d.assigned_collector else None,
                is_active=d.is_active,
                last_seen_at=d.last_seen_at,
                created_at=d.created_at
            )
        )
    return results

@router.post("/devices", response_model=DeviceOut)
def register_device(
    payload: DeviceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only)
):
    """
    Register a new ESP32 BLE device into the fleet.
    """
    existing = db.query(Device).filter(Device.device_mac == payload.device_mac.strip().upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Device with this MAC address / Identifier is already registered.")

    device = Device(
        device_name=payload.device_name,
        device_mac=payload.device_mac.strip().upper(),
        assigned_collector_id=payload.assigned_collector_id,
        is_active=payload.is_active
    )
    db.add(device)
    db.commit()
    db.refresh(device)

    log_audit_event(
        db=db,
        action="DEVICE_REGISTERED",
        user_id=current_user.id,
        resource_type="device",
        resource_id=str(device.id),
        details=f"Registered device {device.device_name} ({device.device_mac})"
    )

    return DeviceOut(
        id=device.id,
        device_name=device.device_name,
        device_mac=device.device_mac,
        assigned_collector_id=device.assigned_collector_id,
        assigned_collector_name=device.assigned_collector.full_name if device.assigned_collector else None,
        is_active=device.is_active,
        last_seen_at=device.last_seen_at,
        created_at=device.created_at
    )

@router.get("/audit-logs", response_model=List[AuditLogOut])
def get_audit_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only)
):
    """
    View chronological security and HIPAA/consent audit logs.
    """
    audits = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit).all()
    results = []
    for a in audits:
        results.append(
            AuditLogOut(
                id=a.id,
                user_id=a.user_id,
                user_name=a.user.full_name if a.user else "System",
                user_role=a.user.role if a.user else None,
                action=a.action,
                resource_type=a.resource_type,
                resource_id=a.resource_id,
                details=a.details,
                ip_address=a.ip_address,
                created_at=a.created_at
            )
        )
    return results

@router.get("/patients", response_model=List[PatientOut])
def list_patients(
    search: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only)
):
    """
    List all registered patients with search filtering by name or phone.
    """
    query = db.query(Patient)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Patient.full_name.ilike(search_term),
                Patient.phone.ilike(search_term)
            )
        )
    return query.order_by(desc(Patient.created_at)).limit(limit).all()

@router.post("/patients", response_model=PatientOut)
def admin_create_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only)
):
    """
    Admin creates a patient record directly with identification details and medical history.
    """
    clean_phone = "".join(filter(str.isdigit, payload.phone))[-10:]
    aadhaar_h = hash_aadhaar(payload.aadhaar_number)
    aadhaar_m = mask_aadhaar(payload.aadhaar_number)

    patient = db.query(Patient).filter(
        or_(
            Patient.phone == clean_phone,
            Patient.aadhaar_hash == aadhaar_h
        )
    ).first()

    if patient:
        patient.full_name = payload.full_name.strip()
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
    else:
        patient = Patient(
            full_name=payload.full_name.strip(),
            phone=clean_phone,
            aadhaar_masked=aadhaar_m,
            aadhaar_hash=aadhaar_h,
            age=payload.age,
            gender=payload.gender,
            address=payload.address,
            emergency_contact=payload.emergency_contact,
            medical_history=payload.medical_history
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)

    log_audit_event(
        db=db,
        action="PATIENT_CREATED_BY_ADMIN",
        user_id=current_user.id,
        resource_type="patient",
        resource_id=str(patient.id),
        details=f"Admin {current_user.full_name} created patient record for {patient.full_name}"
    )

    return patient

@router.delete("/patients/{patient_id}")
def admin_delete_patient(
    patient_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only)
):
    """
    Admin permanently deletes a patient record, their access sessions, and associated screening vitals.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    patient_name = patient.full_name
    patient_phone = patient.phone

    # Clean up associated sessions and user record if any
    db.query(DoctorAccessSession).filter(DoctorAccessSession.patient_id == patient_id).delete()
    db.query(User).filter(User.phone == patient_phone, User.role == "patient").delete()

    db.delete(patient)
    db.commit()

    log_audit_event(
        db=db,
        action="PATIENT_DELETED_BY_ADMIN",
        user_id=current_user.id,
        resource_type="patient",
        resource_id=str(patient_id),
        details=f"Admin {current_user.full_name} permanently deleted patient record: {patient_name} ({patient_phone})"
    )

    return {"success": True, "message": f"Patient {patient_name} and all clinical history were successfully removed."}
