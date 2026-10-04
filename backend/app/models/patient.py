import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    full_name = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), unique=True, index=True, nullable=False)
    aadhaar_masked = Column(String(50), nullable=False)  # e.g., XXXX-XXXX-1234
    aadhaar_hash = Column(String(64), unique=True, index=True, nullable=False)  # SHA-256 for duplicate check
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    address = Column(String(500), nullable=True)
    emergency_contact = Column(JSON, nullable=True)
    medical_history = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    vitals = relationship("VitalsRecord", back_populates="patient", cascade="all, delete-orphan", order_by="desc(VitalsRecord.recorded_at)")
    clinical_notes = relationship("ClinicalNote", back_populates="patient", cascade="all, delete-orphan", order_by="desc(ClinicalNote.created_at)")
