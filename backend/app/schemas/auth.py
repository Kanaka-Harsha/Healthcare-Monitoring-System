from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: UUID
    full_name: str
    email: Optional[str] = None
    phone: str
    role: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    username_or_phone: str = Field(..., description="Email or Phone number")
    password: str

class PatientPhoneLoginRequest(BaseModel):
    phone: str = Field(..., description="10-digit Patient phone number")
    otp: str = Field(..., description="6-digit OTP")

class RequestPatientOTP(BaseModel):
    phone: str = Field(..., description="10-digit Patient phone number")
