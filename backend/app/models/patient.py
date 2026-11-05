import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, JSON, Boolean, ForeignKey, Float
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
    gender = Column(String(20), nullable=True, index=True)
    
    # Separated Address Fields for granular analytics
    house_number = Column(String(100), nullable=True)
    village_or_town = Column(String(150), nullable=True, index=True)
    city = Column(String(150), nullable=True, index=True)
    mandal = Column(String(150), nullable=True, index=True)
    phc_name = Column(String(150), nullable=True, index=True)
    district = Column(String(150), nullable=True, index=True)
    state = Column(String(150), nullable=True, index=True)
    country = Column(String(100), default="India", nullable=True)
    pincode = Column(String(10), nullable=True, index=True)
    address = Column(String(500), nullable=True)  # Full concatenated representation

    # Simplified Clinical Profiling for Analytics (Separated from personal identifiers)
    primary_health_issue = Column(String(150), nullable=True, index=True)
    health_issues_list = Column(JSON, nullable=True)
    health_issue_categories = Column(JSON, nullable=True)
    age_months = Column(Integer, nullable=True)
    is_pregnant = Column(Boolean, nullable=True, index=True)
    pregnancy_month = Column(Integer, nullable=True)
    pregnancy_issues = Column(JSON, nullable=True)
    anc_visit_count = Column(Integer, nullable=True)
    vaccination_status = Column(String(40), nullable=True, index=True)
    weight_kg = Column(Float, nullable=True)
    height_cm = Column(Float, nullable=True)
    growth_issues = Column(JSON, nullable=True)
    risk_category = Column(String(20), default="Green", index=True) # Green, Orange, Red
    
    # Village Healthcamp Scan status
    is_scanned = Column(Boolean, default=True, nullable=False)
    registered_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    emergency_contact = Column(JSON, nullable=True)
    medical_history = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    vitals = relationship("VitalsRecord", back_populates="patient", cascade="all, delete-orphan", order_by="desc(VitalsRecord.recorded_at)")
    clinical_notes = relationship("ClinicalNote", back_populates="patient", cascade="all, delete-orphan", order_by="desc(ClinicalNote.created_at)")
    reports = relationship("MedicalReport", back_populates="patient", cascade="all, delete-orphan", order_by="desc(MedicalReport.created_at)")
    registered_by = relationship("User", foreign_keys=[registered_by_id])
