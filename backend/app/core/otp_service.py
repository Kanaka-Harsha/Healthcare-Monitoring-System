import random
import string
import requests
from datetime import datetime, timedelta, timezone
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
    Sends OTP via Fast2SMS API if FAST2SMS_API_KEY is configured in .env.
    If no key is configured or in dev mode, records cleanly to console and logs.
    """
    # Normalize 10-digit Indian phone number
    clean_phone = phone.replace("+91", "").replace("-", "").replace(" ", "").strip()
    if len(clean_phone) > 10:
        clean_phone = clean_phone[-10:]

    otp_logger.info(
        f"[OTP GENERATED] SwastGrama | Phone: +91 {clean_phone} | Patient: {patient_name} | Code: {otp} | Expiry: {settings.OTP_EXPIRY_MINUTES} mins"
    )

    # Real Fast2SMS Dispatch
    if settings.FAST2SMS_API_KEY and settings.FAST2SMS_API_KEY.strip():
        try:
            url = "https://www.fast2sms.com/dev/bulkV2"
            headers = {
                "authorization": settings.FAST2SMS_API_KEY.strip(),
                "Content-Type": "application/json"
            }
            # Fast2SMS OTP Route
            payload = {
                "variables_values": otp,
                "route": "otp",
                "numbers": clean_phone
            }
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            res_data = response.json()
            if response.status_code == 200 and res_data.get("return") is True:
                otp_logger.info(f"[FAST2SMS DISPATCH SUCCESS] Real OTP sent via SMS to +91 {clean_phone}")
                return True
            else:
                otp_logger.warning(
                    f"[FAST2SMS WARNING] Gateway returned non-success: {res_data}. Message: {res_data.get('message')}"
                )
        except Exception as e:
            otp_logger.error(f"[FAST2SMS EXCEPTION] Failed to connect to SMS Gateway: {e}")
    else:
        otp_logger.info(
            f"[LOCAL DISPATCH] FAST2SMS_API_KEY is not configured in .env. OTP {otp} available in logs/UI."
        )

    return True
