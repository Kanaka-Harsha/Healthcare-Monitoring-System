import traceback
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.session import get_db
from app.core.config import settings
from app.core.logger import server_logger
from app.core.security import verify_password, create_access_token, get_password_hash, hash_aadhaar, mask_aadhaar
from app.models.user import User
from app.models.patient import Patient
from app.schemas.auth import Token, LoginRequest, PatientLoginRequest
from app.schemas.user import UserCreate
from app.schemas.patient import PatientCreate
from app.api.deps import log_audit_event

router = APIRouter()

@router.post("/login", response_model=Token)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Standard Username & Password login for all roles.
    Patients can log in with their Phone number as their Username.
    """
    raw_identifier = (
        payload.username or 
        payload.username_or_phone or 
        payload.identifier or 
        payload.email or 
        payload.phone or 
        ""
    ).strip()
    if not raw_identifier:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please provide your username, email, or mobile number to log in."
        )

    cleaned_input = raw_identifier
    clean_digits = "".join(filter(str.isdigit, cleaned_input))[-10:]

    try:
        # Search by username, email, or phone
        search_filter = or_(
            User.username == cleaned_input,
            User.email == cleaned_input
        )
        if clean_digits and len(clean_digits) == 10:
            search_filter = or_(
                User.username == cleaned_input,
                User.email == cleaned_input,
                User.phone == clean_digits,
                User.phone == cleaned_input
            )

        user = db.query(User).filter(search_filter).first()

        # If user not found, check if this is an un-scanned patient
        if not user:
            if clean_digits and len(clean_digits) == 10:
                patient_check = db.query(Patient).filter(Patient.phone == clean_digits).first()
                if not patient_check:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Your phone number is not registered yet. Please visit your nearest village health camp to get scanned by our health worker."
                    )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password. Please check your credentials and try again."
            )

        # Check password
        if not user.password_hash or not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password. Please check your credentials and try again."
            )

        # Check if active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is currently disabled. Please contact the health center administrator."
            )

        # If role is patient, verify that they were scanned in the village camp
        if user.role == "patient":
            patient = db.query(Patient).filter(Patient.id == user.id).first()
            if not patient:
                patient = db.query(Patient).filter(Patient.phone == user.phone).first()
            if not patient or not patient.is_scanned:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your phone number is not registered yet. Please visit your nearest village health camp to get scanned by our health worker."
                )

        token = create_access_token(subject=str(user.id), role=user.role)

        log_audit_event(
            db=db,
            action="USER_LOGIN",
            user_id=user.id,
            resource_type="auth",
            details=f"User {user.full_name} ({user.username}) logged in with role {user.role}",
            ip_address=request.client.host if (request and request.client) else None
        )

        return Token(
            access_token=token,
            token_type="bearer",
            user_id=user.id,
            username=user.username,
            full_name=user.full_name,
            email=user.email,
            phone=user.phone,
            role=user.role,
            jurisdiction_district=user.jurisdiction_district,
            jurisdiction_state=user.jurisdiction_state
        )

    except HTTPException:
        raise
    except Exception as e:
        server_logger.error(f"[LOGIN ERROR] {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to sign in at the moment. Please try again shortly."
        )

@router.post("/signup/staff", response_model=Token)
def signup_staff(
    payload: UserCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Self-signup for Medical Doctors and Camp Assistants.
    Volunteers and Higher Authorities are created ONLY by the App Admin.
    """
    try:
        # Strictly enforce allowed self-signup roles
        allowed_roles = ["doctor", "camp_assistant"]
        if payload.role in ["volunteer", "higher_authority"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Volunteers and Higher Authorities can only be created by the System Administrator."
            )

        if payload.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please choose a valid role (Doctor or Assistant/Camp)."
            )

        clean_username = payload.username.strip().lower()
        if len(clean_username) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username must be at least 3 characters long."
            )

        clean_phone = "".join(filter(str.isdigit, payload.phone))[-10:]
        if len(clean_phone) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please provide a valid 10-digit phone number."
            )

        # Check existing username
        if db.query(User).filter(User.username == clean_username).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This username is already taken. Please choose another username."
            )

        # Check existing phone
        if db.query(User).filter(User.phone == clean_phone).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this phone number already exists."
            )

        new_user = User(
            username=clean_username,
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
            details=f"Staff account created: {new_user.username} ({new_user.role})",
            ip_address=request.client.host if (request and request.client) else None
        )

        token = create_access_token(subject=str(new_user.id), role=new_user.role)

        return Token(
            access_token=token,
            token_type="bearer",
            user_id=new_user.id,
            username=new_user.username,
            full_name=new_user.full_name,
            email=new_user.email,
            phone=new_user.phone,
            role=new_user.role
        )

    except HTTPException:
        raise
    except Exception as e:
        server_logger.error(f"[STAFF SIGNUP ERROR] {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to complete registration. Please check your information and try again."
        )

@router.post("/login/patient", response_model=Token)
def patient_login(
    payload: PatientLoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Dedicated simple patient login via 10-digit Phone and PIN/Password.
    Patient MUST have been registered and scanned in the village health camp.
    """
    clean_phone = "".join(filter(str.isdigit, payload.phone))[-10:]
    if len(clean_phone) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid 10-digit mobile number."
        )

    try:
        # Verify patient exists and is scanned
        patient = db.query(Patient).filter(Patient.phone == clean_phone).first()
        if not patient or not patient.is_scanned:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Your phone number is not registered yet. Please visit your nearest village health camp to get scanned by our health worker."
            )

        # Look for corresponding user account
        user = db.query(User).filter(
            or_(
                User.phone == clean_phone,
                User.username == clean_phone,
                User.id == patient.id
            )
        ).first()

        if not user or not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Your health account PIN is not set. Please ask your village health worker during your next checkup."
            )

        if not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect PIN or password. Please try again."
            )

        token = create_access_token(subject=str(patient.id), role="patient")

        return Token(
            access_token=token,
            token_type="bearer",
            user_id=patient.id,
            username=user.username,
            full_name=patient.full_name,
            email=None,
            phone=patient.phone,
            role="patient"
        )

    except HTTPException:
        raise
    except Exception as e:
        server_logger.error(f"[PATIENT LOGIN ERROR] {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to sign in right now. Please try again in a few moments."
        )
