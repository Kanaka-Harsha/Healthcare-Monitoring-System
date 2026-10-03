from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.collector import router as collector_router
from app.api.v1.doctor import router as doctor_router
from app.api.v1.patient import router as patient_router
from app.api.v1.admin import router as admin_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication & Consent OTP"])
api_router.include_router(collector_router, prefix="/collector", tags=["Data Collector & Vitals Ingestion"])
api_router.include_router(doctor_router, prefix="/doctor", tags=["Doctor Portal & Clinical Notes"])
api_router.include_router(patient_router, prefix="/patient", tags=["Patient Portal"])
api_router.include_router(admin_router, prefix="/admin", tags=["Admin & Analytics"])
