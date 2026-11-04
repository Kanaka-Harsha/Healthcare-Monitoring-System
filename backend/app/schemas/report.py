from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class MedicalReportOut(BaseModel):
    id: UUID
    patient_id: UUID
    report_type: str
    original_filename: str
    stored_filename: str
    file_path: str
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    created_at: datetime
    uploaded_by_name: Optional[str] = None

    class Config:
        from_attributes = True

