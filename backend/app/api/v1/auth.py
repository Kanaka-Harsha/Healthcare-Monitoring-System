from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.session import get_db
from app.core.security import verify_password, create_access_token
from app.core.otp_service import generate_numeric_otp, send_otp_to_phone, get_otp_expiry, verify_twilio_otp
from app.models.user import User
from app.models.patient import Patient
from app.models.session import DoctorAccessSession
from app.schemas.auth import Token, LoginRequest, PatientPhoneLoginRequest, RequestPatientOTP
from app.schemas.user import UserOut
from app.api.deps import get_current_user, log_audit_event

router = APIRouter()

@router.post("/login", response_model=Token)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Standard login for Admins, Doctors, and Data Collectors via Email or Phone and Password.
    """
    user = db.query(User).filter(
        or_(
            User.email == payload.username_or_phone.strip().lower(),
            User.phone == payload.username_or_phone.strip()
        )
    ).first()

    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please check your username/phone and password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is deactivated. Please contact an administrator."
        )

    token = create_access_token(subject=str(user.id), role=user.role)
    
    log_audit_event(
        db=db,
        action="USER_LOGIN",
        user_id=user.id,
        resource_type="auth",
        details=f"User {user.full_name} logged in successfully with role {user.role}",
        ip_address=request.client.host if request.client else None
    )

    return Token(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        role=user.role
    )

@router.post("/patient/request-otp")
def patient_request_otp(
    payload: RequestPatientOTP,
    db: Session = Depends(get_db)
):
    """
    Generate and send an OTP for a Patient to log in and view their personal health records.
    """
    clean_phone = "".join(filter(str.isdigit, payload.phone))[-10:]
    patient = db.query(Patient).filter(Patient.phone == clean_phone).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No patient registered with this phone number. Please contact your field data collector to register."
        )

    otp_code = generate_numeric_otp(6)
    send_otp_to_phone(clean_phone, otp_code, patient.full_name)

    # Invalidate old patient login sessions and save new
    db.query(DoctorAccessSession).filter(
        DoctorAccessSession.patient_id == patient.id,
        DoctorAccessSession.is_verified == False
    ).delete()

    # Reuse DoctorAccessSession model for verification
    # Using patient id as doctor_id anchor or create patient auth session
    session = DoctorAccessSession(
        doctor_id=patient.id,  # self-access
        patient_id=patient.id,
        otp_code=otp_code,
        is_verified=False,
        expires_at=get_otp_expiry()
    )
    db.add(session)
    db.commit()

    return {
        "success": True,
        "message": f"OTP successfully sent to {clean_phone}.",
        "phone": clean_phone
    }

@router.post("/patient/verify-otp", response_model=Token)
def patient_verify_otp(
    payload: PatientPhoneLoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Verify Patient OTP and generate a JWT token with 'patient' role.
    """
    clean_phone = "".join(filter(str.isdigit, payload.phone))[-10:]
    patient = db.query(Patient).filter(Patient.phone == clean_phone).first()

    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    session = db.query(DoctorAccessSession).filter(
        DoctorAccessSession.patient_id == patient.id,
        DoctorAccessSession.is_verified == False,
        DoctorAccessSession.expires_at > datetime.now(timezone.utc)
    ).order_by(DoctorAccessSession.created_at.desc()).first()

    is_valid = False
    if session and session.otp_code == payload.otp.strip():
        is_valid = True
    elif verify_twilio_otp(clean_phone, payload.otp.strip()):
        is_valid = True

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP. Please request a new one."
        )

    if session:
        session.is_verified = True
        session.verified_at = datetime.now(timezone.utc)
        db.commit()

    # Also ensure a corresponding User record exists for patient JWT if queried
    user = db.query(User).filter(User.phone == clean_phone).first()
    if not user:
        user = User(
            id=patient.id,
            full_name=patient.full_name,
            phone=patient.phone,
            role="patient",
            is_active=True
        )
        db.add(user)
        db.commit()

    token = create_access_token(subject=str(patient.id), role="patient")

    log_audit_event(
        db=db,
        action="PATIENT_LOGIN_OTP",
        user_id=patient.id,
        resource_type="auth",
        details=f"Patient {patient.full_name} logged in via OTP",
        ip_address=request.client.host if request.client else None
    )

    return Token(
        access_token=token,
        token_type="bearer",
        user_id=patient.id,
        full_name=patient.full_name,
        email=None,
        phone=patient.phone,
        role="patient"
    )

@router.get("/me", response_model=UserOut)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user
