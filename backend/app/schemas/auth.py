from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: UUID
    username: str
    full_name: str
    email: Optional[str] = None
    phone: str
    role: str
    jurisdiction_district: Optional[str] = None
    jurisdiction_state: Optional[str] = None

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    username: str = Field(..., description="Username or registered phone number")
    password: str = Field(..., description="Password or account PIN")

class PatientLoginRequest(BaseModel):
    phone: str = Field(..., description="10-digit registered patient phone number")
    password: str = Field(..., description="Patient login PIN or password")

class PatientPhoneLoginRequest(BaseModel):
    phone: str = Field(..., description="10-digit Patient phone number")
    otp: str = Field(..., description="6-digit OTP")

class RequestPatientOTP(BaseModel):
    phone: str = Field(..., description="10-digit Patient phone number")
