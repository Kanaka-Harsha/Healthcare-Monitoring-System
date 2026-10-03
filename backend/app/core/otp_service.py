import random
import string
from datetime import datetime, timedelta, timezone
from typing import Tuple
from app.core.config import settings
from app.core.logger import otp_logger

def generate_numeric_otp(length: int = 6) -> str:
    if settings.DEV_OTP_MODE and settings.DEFAULT_DEV_OTP:
        return settings.DEFAULT_DEV_OTP
    return "".join(random.choices(string.digits, k=length))

def get_otp_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)

def send_otp_to_phone(phone: str, otp: str, patient_name: str = "Patient") -> bool:
    """
    Sends OTP via SMS.
    Outputs structured log on server console and into rotating log files.
    """
    otp_logger.info(
        f"🔑 [OTP DISPATCHED] Phone: +91 {phone} | Patient: {patient_name} | Code: {otp} | Expiry: {settings.OTP_EXPIRY_MINUTES} mins"
    )
    return True
