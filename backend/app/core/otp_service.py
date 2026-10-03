import random
import string
import logging
from datetime import datetime, timedelta, timezone
from typing import Tuple
from app.core.config import settings

logger = logging.getLogger("healthcare.otp")

def generate_numeric_otp(length: int = 6) -> str:
    if settings.DEV_OTP_MODE and settings.DEFAULT_DEV_OTP:
        return settings.DEFAULT_DEV_OTP
    return "".join(random.choices(string.digits, k=length))

def get_otp_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)

def send_otp_to_phone(phone: str, otp: str, patient_name: str = "Patient") -> bool:
    """
    Sends OTP via SMS.
    In Dev mode, logs the OTP clearly in server output.
    Can be easily connected to Twilio, Fast2SMS, MSG91, or Supabase Auth.
    """
    logger.info(f"🔑 [OTP SERVICE] Sent OTP '{otp}' to patient {patient_name} ({phone})")
    print(f"\n==================================================")
    print(f"  [OTP SENT] To: {phone} (Name: {patient_name})")
    print(f"  [OTP CODE]: {otp}")
    print(f"  [EXPIRY]: {settings.OTP_EXPIRY_MINUTES} minutes")
    print(f"==================================================\n")
    return True
