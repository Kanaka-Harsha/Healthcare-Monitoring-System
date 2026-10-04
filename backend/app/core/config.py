from pydantic_settings import BaseSettings
from typing import List, Union
import os
from pathlib import Path

class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "Healthcare Monitoring System"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "production"
    
    # DB
    DB_URL: str
    
    # Security
    SECRET_KEY: str = "healthcare-super-secure-production-secret-key-change-in-env-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:3000,http://localhost:5173,https://healthcare-monitoring-system.vercel.app"
    VERCEL_FRONTEND_URL: str = "https://healthcare-monitoring-system.vercel.app"
    
    # OTP & SMS Gateway (Twilio)
    DEV_OTP_MODE: bool = False
    DEFAULT_DEV_OTP: str = ""
    OTP_EXPIRY_MINUTES: int = 10
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    TWILIO_VERIFY_SERVICE_SID: str = "VAb175314c1ca36553dcb69d2d09d4708f"
    
    # Seed Admin
    DEFAULT_ADMIN_EMAIL: str = "admin@healthcare.local"
    DEFAULT_ADMIN_PHONE: str = "9999999999"
    DEFAULT_ADMIN_PASSWORD: str = "Admin@Healthcare2026"

    class Config:
        env_file = os.path.join(Path(__file__).resolve().parent.parent.parent, ".env")
        case_sensitive = True
        extra = "allow"

settings = Settings()
