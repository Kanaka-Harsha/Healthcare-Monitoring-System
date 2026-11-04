import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base

class MedicalReport(Base):
    __tablename__ = "medical_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    report_type = Column(String(100), nullable=False)        # e.g., Blood Test, X-Ray, ECG, MRI, Discharge Summary
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)    # e.g., Ramesh_Kumar_Blood_Test_20261104_153000.pdf
    file_path = Column(String(500), nullable=False)          # Relative path from uploads directory
    file_size_bytes = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    patient = relationship("Patient", back_populates="reports")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])

