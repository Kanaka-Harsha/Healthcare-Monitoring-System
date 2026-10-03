from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime

class VitalsRecordCreate(BaseModel):
    patient_id: Optional[UUID] = None  # If already registered
    # If submitting intake + vitals together
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None
    patient_aadhaar: Optional[str] = None
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None

    # Vital metrics captured from ESP32 BLE or manual
    systolic_bp: Optional[float] = Field(None, description="Systolic Blood Pressure (mmHg)")
    diastolic_bp: Optional[float] = Field(None, description="Diastolic Blood Pressure (mmHg)")
    heart_rate: Optional[int] = Field(None, description="Heart Rate (BPM)")
    spo2: Optional[float] = Field(None, description="Blood Oxygen Saturation (%)")
    temperature: Optional[float] = Field(None, description="Body Temperature (°C or °F)")
    blood_glucose: Optional[float] = Field(None, description="Blood Glucose (mg/dL)")
    
    additional_metrics: Optional[Dict[str, Any]] = None
    device_id: Optional[str] = None
    client_sync_id: Optional[str] = None  # For offline queue deduplication
    recorded_at: Optional[datetime] = None

class BatchVitalsSyncRequest(BaseModel):
    records: List[VitalsRecordCreate]

class VitalsRecordOut(BaseModel):
    id: UUID
    patient_id: UUID
    collector_id: Optional[UUID] = None
    systolic_bp: Optional[float] = None
    diastolic_bp: Optional[float] = None
    heart_rate: Optional[int] = None
    spo2: Optional[float] = None
    temperature: Optional[float] = None
    blood_glucose: Optional[float] = None
    additional_metrics: Optional[Dict[str, Any]] = None
    device_id: Optional[str] = None
    client_sync_id: Optional[str] = None
    recorded_at: datetime
    synced_at: datetime

    class Config:
        from_attributes = True

class VitalsWithPatientOut(VitalsRecordOut):
    patient_name: str
    patient_phone: str
    patient_aadhaar_masked: str
