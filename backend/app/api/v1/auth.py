from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.session import get_db
from app.core.security import verify_password, create_access_token, get_password_hash, hash_aadhaar, mask_aadhaar
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
from app.models.session import DoctorAccessSession
from app.schemas.auth import Token, LoginRequest, PatientPhoneLoginRequest, RequestPatientOTP
from app.schemas.user import UserCreate, UserOut
from app.schemas.patient import PatientCreate
from app.api.deps import get_current_user, log_audit_event

router = APIRouter()

@router.post("/signup/staff", response_model=Token)
def signup_staff(
    payload: UserCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Self-signup for medical professionals and staff (Doctor, Registrar, Collector).
    """
    allowed_roles = ["doctor", "registrar", "collector"]
    if payload.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid staff role. Allowed roles are: {', '.join(allowed_roles)}"
        )
    
    clean_phone = "".join(filter(str.isdigit, payload.phone))[-10:]
    if len(clean_phone) < 10:
        raise HTTPException(status_code=400, detail="Please provide a valid 10-digit phone number.")
    
    if payload.email:
        existing_email = db.query(User).filter(User.email == payload.email.strip().lower()).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="An account with this email address already exists.")
    
    existing_phone = db.query(User).filter(User.phone == clean_phone).first()
    if existing_phone:
        raise HTTPException(status_code=400, detail="An account with this phone number already exists.")

    new_user = User(
        full_name=payload.full_name.strip(),
        email=payload.email.strip().lower() if payload.email else None,
        phone=clean_phone,
        role=payload.role,
        password_hash=get_password_hash(payload.password),
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit_event(
        db=db,
        action="STAFF_SIGNUP",
        user_id=new_user.id,
        resource_type="user",
        details=f"Staff account self-registered: {new_user.full_name} ({new_user.role})",
        ip_address=request.client.host if request.client else None
    )

    token = create_access_token(subject=str(new_user.id), role=new_user.role)

    return Token(
        access_token=token,
        token_type="bearer",
        user_id=new_user.id,
        full_name=new_user.full_name,
        email=new_user.email,
        phone=new_user.phone,
        role=new_user.role
    )

@router.post("/signup/patient", response_model=Token)
def signup_patient(
    payload: PatientCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Self-signup for patients to create their health portal account.
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
        # Patient already registered, update details
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

    # Ensure User record exists
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
        action="PATIENT_SELF_SIGNUP",
        user_id=patient.id,
        resource_type="patient",
        details=f"Patient {patient.full_name} registered personal account",
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
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Generate and send an OTP for a Patient to log in and view their personal health records.
    Protected with rate-limiting cooldown window and non-blocking background SMS dispatch.
    """
    clean_phone = "".join(filter(str.isdigit, payload.phone))[-10:]
    
    # 1. Rate-limiting check
    is_allowed, remaining = check_otp_rate_limit(clean_phone)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {remaining} seconds before requesting a new verification code."
        )

    patient = db.query(Patient).filter(Patient.phone == clean_phone).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No patient registered with this phone number. Please contact your field data collector to register."
        )

    otp_code = generate_numeric_otp(6)
    
    # Dispatch SMS in background task to eliminate network blocking delay
    background_tasks.add_task(send_otp_to_phone, clean_phone, otp_code, patient.full_name)

    # Invalidate old patient login sessions and save new
    db.query(DoctorAccessSession).filter(
        DoctorAccessSession.patient_id == patient.id,
        DoctorAccessSession.is_verified == False
    ).delete()

    # Reuse DoctorAccessSession model for verification
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
    Protected with brute-force attempt lockout and constant-time comparison.
    """
    clean_phone = "".join(filter(str.isdigit, payload.phone))[-10:]
    
    # Check brute-force lockout
    if is_otp_locked_out(clean_phone):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. For your security, this verification code has been locked. Please request a new code."
        )

    patient = db.query(Patient).filter(Patient.phone == clean_phone).first()

    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    session = db.query(DoctorAccessSession).filter(
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
            detail=f"Invalid or expired OTP. ({remaining_tries} attempts remaining)" if remaining_tries > 0 else "Invalid OTP. Code locked due to multiple failed attempts."
        )

    # Success: reset failed attempt counter
    reset_otp_attempts(clean_phone)

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
