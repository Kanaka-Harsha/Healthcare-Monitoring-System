from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime

class PatientCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: str = Field(..., description="10-digit Indian phone number")
    aadhaar_number: str = Field(..., description="12-digit Aadhaar number")
    age: Optional[int] = Field(None, ge=0, le=130)
    gender: Optional[str] = Field(None, description="Male, Female, Other")
    
    # Separated Address Fields
    house_number: Optional[str] = None
    village_or_town: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    pincode: Optional[str] = None
    address: Optional[str] = None

    # Categorization for Analytics
    primary_health_issue: Optional[str] = None
    health_issues_list: Optional[List[str]] = None
    risk_category: Optional[str] = "Green"
    
    # Patient Login PIN set during village scan (defaults to last 4 digits of phone if omitted)
    patient_pin: Optional[str] = None

    emergency_contact: Optional[Dict[str, Any]] = None
    medical_history: Optional[Dict[str, Any]] = None
    client_sync_id: Optional[str] = None

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

class BatchPatientSyncRequest(BaseModel):
    patients: list[PatientCreate]

class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    house_number: Optional[str] = None
    village_or_town: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    address: Optional[str] = None
    primary_health_issue: Optional[str] = None
    health_issues_list: Optional[List[str]] = None
    risk_category: Optional[str] = None
    emergency_contact: Optional[Dict[str, Any]] = None
    medical_history: Optional[Dict[str, Any]] = None

class PatientOut(BaseModel):
    id: UUID
    full_name: str
    phone: str
    aadhaar_masked: str
    age: Optional[int] = None
    gender: Optional[str] = None
    house_number: Optional[str] = None
    village_or_town: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    pincode: Optional[str] = None
    address: Optional[str] = None
    primary_health_issue: Optional[str] = None
    health_issues_list: Optional[List[str]] = None
    risk_category: Optional[str] = "Green"
    is_scanned: bool = True
    emergency_contact: Optional[Dict[str, Any]] = None
    medical_history: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True
