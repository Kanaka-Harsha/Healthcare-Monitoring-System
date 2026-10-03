from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from app.schemas.patient import PatientOut
from app.schemas.vitals import VitalsRecordOut

class DoctorSearchPatientRequest(BaseModel):
    phone: str = Field(..., description="10-digit Patient phone number")

class DoctorVerifyOTPRequest(BaseModel):
    phone: str = Field(..., description="10-digit Patient phone number")
    otp: str = Field(..., description="6-digit OTP received by the patient")

class ClinicalNoteCreate(BaseModel):
    patient_id: UUID
    diagnosis: Optional[str] = None
    prescription: Optional[str] = None
    clinical_notes: Optional[str] = None
    prescribed_medicines: Optional[List[Dict[str, Any]]] = None
    follow_up_date: Optional[str] = None

class ClinicalNoteOut(BaseModel):
    id: UUID
    patient_id: UUID
    doctor_id: Optional[UUID] = None
    doctor_name: Optional[str] = None
    diagnosis: Optional[str] = None
    prescription: Optional[str] = None
    clinical_notes: Optional[str] = None
    prescribed_medicines: Optional[List[Dict[str, Any]]] = None
    follow_up_date: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class PatientMedicalFileOut(BaseModel):
    patient: PatientOut
    vitals_history: List[VitalsRecordOut]
    clinical_history: List[ClinicalNoteOut]
    is_session_unlocked: bool = True
