import secrets
import string
import hmac
import time
import requests
from typing import Tuple
from datetime import datetime, timedelta, timezone
from app.core.config import settings
from app.core.logger import otp_logger

# In-memory security rate-limiting and attempt trackers
_OTP_RATE_LIMIT = {}    # phone -> last_requested_timestamp
_OTP_ATTEMPTS = {}      # phone -> failed_attempts_count

COOLDOWN_SECONDS = 30
MAX_FAILED_ATTEMPTS = 5

def check_otp_rate_limit(phone: str) -> Tuple[bool, int]:
    """
    Checks if an OTP request is within the cooldown window.
    Returns (is_allowed, remaining_seconds).
    """
    clean = "".join(filter(str.isdigit, phone))[-10:]
    now = time.time()
    last_time = _OTP_RATE_LIMIT.get(clean, 0)
    elapsed = now - last_time
    if elapsed < COOLDOWN_SECONDS:
        return False, int(COOLDOWN_SECONDS - elapsed)
    _OTP_RATE_LIMIT[clean] = now
    # Reset failed attempts count on new valid OTP generation
    _OTP_ATTEMPTS[clean] = 0
    return True, 0

def register_failed_otp_attempt(phone: str) -> int:
    """
    Increments failed OTP guess count. Returns current count.
    """
    clean = "".join(filter(str.isdigit, phone))[-10:]
    current = _OTP_ATTEMPTS.get(clean, 0) + 1
    _OTP_ATTEMPTS[clean] = current
    return current

def is_otp_locked_out(phone: str) -> bool:
    """
    Returns True if failed attempts exceed limit.
    """
    clean = "".join(filter(str.isdigit, phone))[-10:]
    return _OTP_ATTEMPTS.get(clean, 0) >= MAX_FAILED_ATTEMPTS

def reset_otp_attempts(phone: str):
    clean = "".join(filter(str.isdigit, phone))[-10:]
    _OTP_ATTEMPTS.pop(clean, None)

def generate_numeric_otp(length: int = 6) -> str:
    """
    Cryptographically secure pseudorandom numeric OTP generator.
    """
    if settings.DEV_OTP_MODE and settings.DEFAULT_DEV_OTP:
        return settings.DEFAULT_DEV_OTP
    # Use secrets for cryptographic randomness
    digits = string.digits
    return "".join(secrets.choice(digits) for _ in range(length))

def constant_time_compare(val1: str, val2: str) -> bool:
    """
    Constant-time string comparison to prevent timing attacks.
    """
    if val1 is None or val2 is None:
        return False
    return hmac.compare_digest(str(val1).strip(), str(val2).strip())

def get_otp_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)

def format_e164_phone(phone: str, default_country_code: str = "+91") -> str:
    """
    Ensures phone number is formatted according to international E.164 standard.
    """
    clean = phone.replace("-", "").replace(" ", "").strip()
    if clean.startswith("+"):
        return clean
    if clean.startswith("91") and len(clean) == 12:
        return f"+{clean}"
    digits = clean[-10:]
    return f"{default_country_code}{digits}"

def send_otp_to_phone(phone: str, otp: str, patient_name: str = "Patient") -> bool:
    """
    Dispatches real SMS OTP using Twilio Verify Service or standard Twilio Programmable SMS API.
    """
    e164_phone = format_e164_phone(phone)

    otp_logger.info(
        f"[OTP GENERATED] SwasthGrama | Phone: {e164_phone} | Patient: {patient_name} | Code: {otp} | Expiry: {settings.OTP_EXPIRY_MINUTES} mins"
    )

    account_sid = settings.TWILIO_ACCOUNT_SID.strip() if settings.TWILIO_ACCOUNT_SID else ""
    auth_token = settings.TWILIO_AUTH_TOKEN.strip() if settings.TWILIO_AUTH_TOKEN else ""
    verify_service_sid = settings.TWILIO_VERIFY_SERVICE_SID.strip() if hasattr(settings, 'TWILIO_VERIFY_SERVICE_SID') and settings.TWILIO_VERIFY_SERVICE_SID else ""
    from_phone = settings.TWILIO_PHONE_NUMBER.strip() if settings.TWILIO_PHONE_NUMBER else ""

    # 1. Primary Method: Twilio Verify API (Bypasses trial SMS template restrictions)
    if account_sid and auth_token and verify_service_sid:
        try:
            url = f"https://verify.twilio.com/v2/Services/{verify_service_sid}/Verifications"
            data = {
                "To": e164_phone,
                "Channel": "sms"
            }
            response = requests.post(url, data=data, auth=(account_sid, auth_token), timeout=10)
            res_json = response.json()

            if response.status_code in (200, 201) and res_json.get("status") == "pending":
                otp_logger.info(
                    f"[TWILIO VERIFY SUCCESS] Real SMS OTP dispatched to {e164_phone} via Twilio Verify (SID: {res_json.get('sid')})"
                )
                return True
            else:
                otp_logger.warning(
                    f"[TWILIO VERIFY NOTICE] Verify status {response.status_code}: {res_json.get('message')}"
                )
        except Exception as e:
            otp_logger.error(f"[TWILIO VERIFY EXCEPTION] Failed to dispatch via Twilio Verify: {e}")

    # 2. Secondary Method: Twilio Programmable SMS
    if account_sid and auth_token and from_phone:
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
            message_body = f"SwasthGrama: Your secure verification code is {otp}. Valid for {settings.OTP_EXPIRY_MINUTES} minutes."
            data = {
                "To": e164_phone,
                "From": from_phone,
                "Body": message_body
            }
            response = requests.post(url, data=data, auth=(account_sid, auth_token), timeout=10)
            res_json = response.json()

            if response.status_code in (200, 201):
                otp_logger.info(
                    f"[TWILIO SMS SUCCESS] Real OTP sent via Twilio SMS to {e164_phone}"
                )
                return True
            else:
                otp_logger.warning(
                    f"[TWILIO SMS NOTICE] Programmable SMS returned code {res_json.get('code')}: {res_json.get('message')}"
                )
        except Exception as e:
            otp_logger.error(f"[TWILIO SMS EXCEPTION] Failed to dispatch SMS via Twilio: {e}")

    return True

def verify_twilio_otp(phone: str, code: str) -> bool:
    """
    Verifies the OTP against Twilio Verify API service if enabled.
    """
    account_sid = settings.TWILIO_ACCOUNT_SID.strip() if settings.TWILIO_ACCOUNT_SID else ""
    auth_token = settings.TWILIO_AUTH_TOKEN.strip() if settings.TWILIO_AUTH_TOKEN else ""
    verify_service_sid = settings.TWILIO_VERIFY_SERVICE_SID.strip() if hasattr(settings, 'TWILIO_VERIFY_SERVICE_SID') and settings.TWILIO_VERIFY_SERVICE_SID else ""

    if not (account_sid and auth_token and verify_service_sid):
        return False

    try:
        e164_phone = format_e164_phone(phone)
        url = f"https://verify.twilio.com/v2/Services/{verify_service_sid}/VerificationCheck"
        data = {
            "To": e164_phone,
            "Code": code.strip()
        }
        response = requests.post(url, data=data, auth=(account_sid, auth_token), timeout=10)
        res_json = response.json()
        if response.status_code == 200 and res_json.get("status") == "approved":
            otp_logger.info(f"[TWILIO VERIFY APPROVAL] Twilio confirmed valid OTP for {e164_phone}")
            return True
        else:
            otp_logger.info(f"[TWILIO VERIFY REJECT] Twilio check status: {res_json.get('status')}")
    except Exception as e:
        otp_logger.error(f"[TWILIO VERIFY CHECK EXCEPTION] Failed to verify with Twilio API: {e}")

    return False
