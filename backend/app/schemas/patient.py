from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime

class PatientCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: str = Field(..., description="10-digit Indian phone number or standard mobile number")
    aadhaar_number: str = Field(..., description="12-digit Aadhaar number")
    age: Optional[int] = Field(None, ge=0, le=130)
    gender: Optional[str] = Field(None, description="Male, Female, Other")
    address: Optional[str] = None
    emergency_contact: Optional[Dict[str, Any]] = None
    medical_history: Optional[Dict[str, Any]] = None

    @field_validator("phone")
    def validate_phone(cls, v: str) -> str:
        clean = "".join(filter(str.isdigit, v))
        if len(clean) < 10:
            raise ValueError("Phone number must contain at least 10 digits")
        return clean[-10:]

    @field_validator("aadhaar_number")
    def validate_aadhaar(cls, v: str) -> str:
        clean = "".join(filter(str.isdigit, v))
        if len(clean) != 12:
            raise ValueError("Aadhaar number must be exactly 12 digits")
        return clean

class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[Dict[str, Any]] = None
    medical_history: Optional[Dict[str, Any]] = None

class PatientOut(BaseModel):
    id: UUID
    full_name: str
    phone: str
    aadhaar_masked: str
    age: Optional[int] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[Dict[str, Any]] = None
    medical_history: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True
