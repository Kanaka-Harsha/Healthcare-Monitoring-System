import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base

class VitalsRecord(Base):
    __tablename__ = "vitals_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    collector_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Core Vitals from BLE / ESP32
    systolic_bp = Column(Float, nullable=True)     # mmHg
    diastolic_bp = Column(Float, nullable=True)    # mmHg
    heart_rate = Column(Integer, nullable=True)    # BPM
    spo2 = Column(Float, nullable=True)            # %
    
    # Optional / Future sensor parameters
    temperature = Column(Float, nullable=True)     # °C or °F
    blood_glucose = Column(Float, nullable=True)   # mg/dL
    respiratory_rate = Column(Integer, nullable=True)
    
    # Extensibility for any additional IoT metrics
    additional_metrics = Column(JSON, nullable=True)
    
    # Device / Sync Info
    device_id = Column(String(100), nullable=True)  # ESP32 MAC/Identifier
    client_sync_id = Column(String(100), nullable=True, unique=True, index=True) # For offline deduplication
    recorded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    synced_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="vitals")
    collector = relationship("User", foreign_keys=[collector_id])
