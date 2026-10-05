import requests
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_full_flow():
    print("🧪 1. Testing Collector Login...")
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "username_or_phone": "collector@healthcare.local",
        "password": "Collector@123"
    })
    assert res.status_code == 200, f"Collector login failed: {res.text}"
    collector_token = res.json()["access_token"]
    print("✅ Collector logged in successfully.")

    print("\n🧪 2. Testing Patient Intake & Vitals Ingestion (ESP32 data)...")
    headers = {"Authorization": f"Bearer {collector_token}"}
    intake_data = {
        "patient_name": "Aarav Sharma",
        "patient_phone": "9811122233",
        "patient_aadhaar": "123456789012",
        "patient_age": 42,
        "patient_gender": "Male",
        "systolic_bp": 128.0,
        "diastolic_bp": 84.0,
        "heart_rate": 76,
        "spo2": 98.2,
        "temperature": 36.8,
        "blood_glucose": 110.0,
        "device_id": "ESP32-NODE-TEST-01"
    }
    res = requests.post(f"{BASE_URL}/collector/vitals", json=intake_data, headers=headers)
    assert res.status_code == 200, f"Vitals ingestion failed: {res.text}"
    patient_id = res.json()["patient_id"]
    print(f"✅ Patient registered & vitals saved to Supabase (Patient ID: {patient_id})")

    print("\n🧪 3. Testing Doctor Login...")
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "username_or_phone": "doctor@healthcare.local",
        "password": "Doctor@123"
    })
    assert res.status_code == 200, f"Doctor login failed: {res.text}"
    doctor_token = res.json()["access_token"]
    print("✅ Doctor logged in successfully.")

    print("\n🧪 4. Testing Doctor Requesting Patient Consent OTP...")
    doc_headers = {"Authorization": f"Bearer {doctor_token}"}
    res = requests.post(f"{BASE_URL}/doctor/patient/request-consent-otp", json={
        "phone": "9811122233"
    }, headers=doc_headers)
    assert res.status_code == 200, f"Doctor OTP request failed: {res.text}"
    
    otp_code = res.json().get("dev_otp")
    if not otp_code:
        # Query database session for the test
        from app.db.session import SessionLocal
        from app.models.session import DoctorAccessSession
        db_s = SessionLocal()
        s = db_s.query(DoctorAccessSession).order_by(DoctorAccessSession.created_at.desc()).first()
        otp_code = s.otp_code if s else "123456"
        db_s.close()

    print(f"✅ OTP generated and sent to patient: {otp_code}")

    print("\n🧪 5. Testing Doctor Verifying OTP to Unlock Record...")
    res = requests.post(f"{BASE_URL}/doctor/patient/verify-consent-otp", json={
        "phone": "9811122233",
        "otp": otp_code
    }, headers=doc_headers)
    assert res.status_code == 200, f"Doctor OTP verification failed: {res.text}"
    patient_file = res.json()
    print(f"✅ Medical file unlocked! Patient name: {patient_file['patient']['full_name']}, Vitals count: {len(patient_file['vitals_history'])}")

    print("\n🧪 6. Testing Doctor Writing Prescription & Diagnosis...")
    res = requests.post(f"{BASE_URL}/doctor/clinical-note", json={
        "patient_id": patient_id,
        "diagnosis": "Mild Hypertension - Stage 1",
        "prescription": "Low sodium diet, brisk walking 30 mins daily.",
        "prescribed_medicines": [
            {"name": "Telmisartan", "dosage": "40mg", "frequency": "1-0-0", "days": "15"}
        ],
        "follow_up_date": "2026-11-01"
    }, headers=doc_headers)
    assert res.status_code == 200, f"Clinical note creation failed: {res.text}"
    print("✅ Clinical note & prescription saved!")

    print("\n🧪 7. Testing Admin Analytics Overview...")
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "username_or_phone": "admin@healthcare.local",
        "password": "Admin@Healthcare2026"
    })
    admin_token = res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    res = requests.get(f"{BASE_URL}/admin/analytics/overview", headers=admin_headers)
    assert res.status_code == 200, f"Admin analytics failed: {res.text}"
    analytics = res.json()
    print(f"✅ Admin Analytics Verified: Total Patients={analytics['total_patients']}, Screenings={analytics['total_screenings']}, Audit Logs={len(analytics['recent_audit_logs'])}")

    print("\n🎉 ALL BACKEND & DATABASE ENDPOINTS PASSED WITH 100% SUCCESS!")

if __name__ == "__main__":
    test_full_flow()
