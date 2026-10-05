from datetime import datetime, timezone
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.core.config import settings
from app.core.otp_service import (
    generate_numeric_otp, 
    send_otp_to_phone, 
    get_otp_expiry, 
    verify_twilio_otp,
    check_otp_rate_limit,
    constant_time_compare,
    register_failed_otp_attempt,
    is_otp_locked_out,
    reset_otp_attempts
)
from app.models.user import User
from app.models.patient import Patient
from app.models.vitals import VitalsRecord
from app.models.session import DoctorAccessSession
from app.models.clinical import ClinicalNote
from app.schemas.doctor import (
    DoctorSearchPatientRequest,
    DoctorVerifyOTPRequest,
    ClinicalNoteCreate,
    ClinicalNoteOut,
    PatientMedicalFileOut
)
from app.schemas.patient import PatientOut
from app.schemas.vitals import VitalsRecordOut
from app.api.deps import get_current_user, require_role, log_audit_event

router = APIRouter()

# Restrict to doctors and admins
doctor_or_admin = require_role(["doctor", "admin"])

@router.post("/patient/request-consent-otp")
def request_patient_consent_otp(
    payload: DoctorSearchPatientRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(doctor_or_admin)
):
    """
    Step 1: Doctor enters patient's 10-digit phone number.
    Generates and dispatches a secure consent OTP to the patient's phone.
    Protected with rate-limiting cooldown window and non-blocking background dispatch.
    """
    clean_phone = "".join(filter(str.isdigit, payload.phone))[-10:]

    # Rate limiting check
    is_allowed, remaining = check_otp_rate_limit(clean_phone)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {remaining} seconds before requesting a new consent OTP for this patient."
        )

    patient = db.query(Patient).filter(Patient.phone == clean_phone).first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No patient found registered with phone number {clean_phone}."
        )

    # Invalidate any previous unverified sessions
    db.query(DoctorAccessSession).filter(
        DoctorAccessSession.doctor_id == current_user.id,
        DoctorAccessSession.patient_id == patient.id,
        DoctorAccessSession.is_verified == False
    ).delete()

    otp_code = generate_numeric_otp(6)
    
    # Asynchronous background dispatch
    background_tasks.add_task(send_otp_to_phone, clean_phone, otp_code, patient.full_name)

    session = DoctorAccessSession(
        doctor_id=current_user.id,
        patient_id=patient.id,
        otp_code=otp_code,
        is_verified=False,
        expires_at=get_otp_expiry()
    )
    db.add(session)
    db.commit()

    log_audit_event(
        db=db,
        action="DOCTOR_OTP_REQUESTED",
        user_id=current_user.id,
        resource_type="patient",
        resource_id=str(patient.id),
        details=f"Doctor {current_user.full_name} requested consent OTP for patient {patient.full_name}",
        ip_address=request.client.host if request.client else None
    )

    return {
        "success": True,
        "message": f"Consent OTP has been sent to patient {patient.full_name} ({clean_phone}).",
        "patient_name_masked": f"{patient.full_name[:2]}***{patient.full_name[-1:]}" if len(patient.full_name) > 3 else patient.full_name,
        "phone": clean_phone,
        "dev_otp": otp_code if settings.DEV_OTP_MODE else None
    }

@router.post("/patient/verify-consent-otp", response_model=PatientMedicalFileOut)
def verify_patient_consent_otp(
    payload: DoctorVerifyOTPRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(doctor_or_admin)
):
    """
    Step 2: Doctor inputs the OTP provided by the patient.
    Upon verification, the full electronic health record and vitals timeline are unlocked.
    Protected against brute-force attacks and timing vulnerabilities.
    """
    clean_phone = "".join(filter(str.isdigit, payload.phone))[-10:]

    # Check brute-force lockout
    if is_otp_locked_out(clean_phone):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed OTP attempts for this patient session. Please request a fresh consent OTP."
        )

    patient = db.query(Patient).filter(Patient.phone == clean_phone).first()

    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    # Find matching active session
    session = db.query(DoctorAccessSession).filter(
        DoctorAccessSession.doctor_id == current_user.id,
        DoctorAccessSession.patient_id == patient.id,
        DoctorAccessSession.is_verified == False,
        DoctorAccessSession.expires_at > datetime.now(timezone.utc)
    ).order_by(DoctorAccessSession.created_at.desc()).first()

    is_valid = False
    if session and constant_time_compare(session.otp_code, payload.otp):
        is_valid = True
    elif verify_twilio_otp(clean_phone, payload.otp.strip()):
        is_valid = True

    if not is_valid:
        attempts = register_failed_otp_attempt(clean_phone)
        remaining_tries = max(0, 5 - attempts)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or expired OTP. ({remaining_tries} attempts remaining)" if remaining_tries > 0 else "Invalid OTP. Session locked due to multiple failed attempts."
        )

    # Reset failed attempts on success
    reset_otp_attempts(clean_phone)

    # Mark session verified
    if session:
        session.is_verified = True
        session.verified_at = datetime.now(timezone.utc)
        db.commit()

    log_audit_event(
        db=db,
        action="DOCTOR_PATIENT_UNLOCKED",
        user_id=current_user.id,
        resource_type="patient",
        resource_id=str(patient.id),
        details=f"Doctor {current_user.full_name} successfully verified OTP and accessed medical record of {patient.full_name}",
        ip_address=request.client.host if request.client else None
    )

    # Fetch vitals and clinical history
    vitals_history = db.query(VitalsRecord).filter(
        VitalsRecord.patient_id == patient.id
    ).order_by(desc(VitalsRecord.recorded_at)).all()

    clinical_notes = db.query(ClinicalNote).filter(
        ClinicalNote.patient_id == patient.id
    ).order_by(desc(ClinicalNote.created_at)).all()

    formatted_clinical = []
    for note in clinical_notes:
        formatted_clinical.append(
            ClinicalNoteOut(
                id=note.id,
                patient_id=note.patient_id,
                doctor_id=note.doctor_id,
                doctor_name=note.doctor.full_name if note.doctor else "Medical Staff",
                diagnosis=note.diagnosis,
                prescription=note.prescription,
                clinical_notes=note.clinical_notes,
                prescribed_medicines=note.prescribed_medicines,
                follow_up_date=note.follow_up_date,
                created_at=note.created_at
            )
        )

    return PatientMedicalFileOut(
        patient=PatientOut.model_validate(patient),
        vitals_history=[VitalsRecordOut.model_validate(v) for v in vitals_history],
        clinical_history=formatted_clinical,
        is_session_unlocked=True
    )

@router.post("/clinical-note", response_model=ClinicalNoteOut)
def add_clinical_note(
    payload: ClinicalNoteCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(doctor_or_admin)
):
    """
    Add clinical diagnosis, doctor notes, and prescriptions for a patient.
    """
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    note = ClinicalNote(
        patient_id=patient.id,
        doctor_id=current_user.id,
        diagnosis=payload.diagnosis,
        prescription=payload.prescription,
        clinical_notes=payload.clinical_notes,
        prescribed_medicines=payload.prescribed_medicines,
        follow_up_date=payload.follow_up_date
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    log_audit_event(
        db=db,
        action="CLINICAL_NOTE_CREATED",
        user_id=current_user.id,
        resource_type="clinical_note",
        resource_id=str(note.id),
        details=f"Doctor {current_user.full_name} created clinical note & prescription for {patient.full_name}",
        ip_address=request.client.host if request.client else None
    )

    return ClinicalNoteOut(
        id=note.id,
        patient_id=note.patient_id,
        doctor_id=note.doctor_id,
        doctor_name=current_user.full_name,
        diagnosis=note.diagnosis,
        prescription=note.prescription,
        clinical_notes=note.clinical_notes,
        prescribed_medicines=note.prescribed_medicines,
        follow_up_date=note.follow_up_date,
        created_at=note.created_at
    )
