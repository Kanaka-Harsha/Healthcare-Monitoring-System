import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)
    phone = Column(String(50), unique=True, index=True, nullable=False)
    role = Column(String(50), nullable=False, default="patient")  # admin, doctor, camp_assistant, volunteer, higher_authority, patient
    password_hash = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Jurisdiction for Higher Authorities (e.g. ASHA, PHC Officer, District Collector, State Authority)
    jurisdiction_level = Column(String(50), nullable=True) # national, state, district, mandal, phc, village
    jurisdiction_state = Column(String(100), nullable=True)
    jurisdiction_district = Column(String(100), nullable=True)
    jurisdiction_block = Column(String(100), nullable=True)
    jurisdiction_phc = Column(String(150), nullable=True)
    jurisdiction_village = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
