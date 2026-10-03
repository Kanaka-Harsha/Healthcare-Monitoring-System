import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base

class ClinicalNote(Base):
    __tablename__ = "clinical_notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    diagnosis = Column(String(500), nullable=True)
    prescription = Column(Text, nullable=True)
    clinical_notes = Column(Text, nullable=True)
    prescribed_medicines = Column(JSON, nullable=True)  # List of {name, dosage, frequency, days}
    follow_up_date = Column(String(50), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="clinical_notes")
    doctor = relationship("User", foreign_keys=[doctor_id])
