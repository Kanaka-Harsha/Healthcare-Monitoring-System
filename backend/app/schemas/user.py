from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    full_name: str
    email: Optional[str] = None
    phone: str
    role: str = "camp_assistant"  # admin, doctor, camp_assistant, volunteer, higher_authority, patient
    is_active: bool = True
    jurisdiction_level: Optional[str] = None
    jurisdiction_state: Optional[str] = None
    jurisdiction_district: Optional[str] = None
    jurisdiction_block: Optional[str] = None
    jurisdiction_phc: Optional[str] = None
    jurisdiction_village: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=4)

class UserUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    jurisdiction_level: Optional[str] = None
    jurisdiction_state: Optional[str] = None
    jurisdiction_district: Optional[str] = None
    jurisdiction_block: Optional[str] = None
    jurisdiction_phc: Optional[str] = None
    jurisdiction_village: Optional[str] = None

class UserOut(UserBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
