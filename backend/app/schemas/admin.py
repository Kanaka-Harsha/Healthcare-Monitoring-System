from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

class DeviceCreate(BaseModel):
    device_name: str
    device_mac: str
    assigned_collector_id: Optional[UUID] = None
    is_active: bool = True

class DeviceOut(BaseModel):
    id: UUID
    device_name: str
    device_mac: str
    assigned_collector_id: Optional[UUID] = None
    assigned_collector_name: Optional[str] = None
    is_active: bool
    last_seen_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AuditLogOut(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AnalyticsOverviewOut(BaseModel):
    total_patients: int
    total_screenings: int
    total_doctors: int
    total_collectors: int
    total_devices: int
    recent_screenings_count_24h: int
    vitals_anomalies_count: int
    screenings_by_gender: Dict[str, int]
    recent_audit_logs: List[AuditLogOut]
