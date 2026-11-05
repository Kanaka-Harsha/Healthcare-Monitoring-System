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
    jurisdiction_level: Optional[str] = None
    jurisdiction_block: Optional[str] = None
    jurisdiction_village: Optional[str] = None
    jurisdiction_phc: Optional[str] = None

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    username: Optional[str] = Field(None, description="Username, email, or registered phone number")
    username_or_phone: Optional[str] = Field(None, description="Username or phone (legacy frontend compatibility)")
    identifier: Optional[str] = Field(None, description="Identifier (legacy frontend compatibility)")
    email: Optional[str] = Field(None, description="Registered email address")
    phone: Optional[str] = Field(None, description="10-digit mobile number")
    password: str = Field(..., description="Password or account PIN")

class PatientLoginRequest(BaseModel):
    phone: str = Field(..., description="10-digit registered patient phone number")
    password: str = Field(..., description="Patient login PIN or password")

class PatientPhoneLoginRequest(BaseModel):
    phone: str = Field(..., description="10-digit Patient phone number")
    otp: str = Field(..., description="6-digit OTP")

class RequestPatientOTP(BaseModel):
    phone: str = Field(..., description="10-digit Patient phone number")
