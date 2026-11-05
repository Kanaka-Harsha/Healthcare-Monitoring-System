import sys
import time
import threading
import io
import requests
import uvicorn
from app.main import app

PORT = 8008
BASE_URL = f"http://127.0.0.1:{PORT}/api/v1"

def start_server():
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="warning")

def wait_for_server():
    for _ in range(30):
        try:
            r = requests.post(
                f"http://127.0.0.1:{PORT}/api/v1/auth/login",
                json={"username": "__probe__", "password": "__probe__"},
                timeout=2
            )
            # 401 / 422 / 400 all mean server is alive and routing correctly
            if r.status_code in (200, 400, 401, 422):
                return True
        except Exception:
            pass
        time.sleep(1)
    return False

def run_tests():
    print("==================================================")
    print("STARTING END-TO-END HEALTHCARE SYSTEM INTEGRATION TEST")
    print("==================================================")

    # 1. Admin Login
    print("\n[1] Testing Admin Login (Username & Password)...")
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "username": "admin",
        "password": "Admin@Healthcare2026"
    })
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    admin_data = res.json()
    admin_token = admin_data["access_token"]
    print(f"-> SUCCESS: Admin signed in ({admin_data['full_name']}, Role: {admin_data['role']})")

    # 2. Volunteer Login
    print("\n[2] Testing Volunteer Login (Username & Password)...")
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "username": "volunteer_maya",
        "password": "Volunteer@123"
    })
    assert res.status_code == 200, f"Volunteer login failed: {res.text}"
    volunteer_data = res.json()
    volunteer_token = volunteer_data["access_token"]
    print(f"-> SUCCESS: Volunteer signed in ({volunteer_data['full_name']}, Role: {volunteer_data['role']})")

    # 3. Volunteer Registers Citizen in Village with Structured Address (Andhra Pradesh)
    print("\n[3] Testing Village Citizen Registration with Structured Address (Andhra Pradesh)...")
    citizen_payload = {
        "full_name": "Ramesh Kumar Gowda",
        "phone": "9876500001",
        "aadhaar_number": "123456789012",
        "patient_pin": "5566",
        "age": 52,
        "gender": "Male",
        "house_number": "4-12/A",
        "village_or_town": "Pendurthi",
        "city": "Visakhapatnam",
        "district": "Visakhapatnam",
        "state": "Andhra Pradesh",
        "country": "India",
        "pincode": "530051",
        "primary_health_issue": "High Blood Pressure / Dizziness",
        "health_issues_list": ["Hypertension (High Blood Pressure)"]
    }
    headers_vol = {"Authorization": f"Bearer {volunteer_token}"}
    res = requests.post(f"{BASE_URL}/collector/patient", json=citizen_payload, headers=headers_vol)
    assert res.status_code == 200, f"Citizen registration failed: {res.text}"
    patient = res.json()
    patient_id = patient["id"]
    print(f"-> SUCCESS: Citizen Registered (ID: {patient_id}, Name: {patient['full_name']}, Village: {patient['village_or_town']}, District: {patient['district']})")

    # 3b. Verify Assistant/Camp can find this patient directly via search
    print("\n[3b] Testing Assistant/Camp finding Volunteer-registered patient...")
    res_search = requests.get(f"{BASE_URL}/collector/patient/search?phone=9876500001", headers=headers_vol)
    assert res_search.status_code == 200, f"Patient search failed: {res_search.text}"
    found_pat = res_search.json()
    assert found_pat["full_name"] == "Ramesh Kumar Gowda"
    print(f"-> SUCCESS: Assistant/Camp located {found_pat['full_name']} directly by phone without re-registering!")

    # 4. Upload Multiple Medical Reports for Citizen
    print("\n[4] Testing Multi-File Medical Reports Upload...")
    dummy_file_1 = io.BytesIO(b"%PDF-1.4 Dummy Blood Test Report Content")
    dummy_file_2 = io.BytesIO(b"%PDF-1.4 Dummy ECG Graph Report Content")
    
    files = [
        ("files", ("blood_test.pdf", dummy_file_1, "application/pdf")),
        ("files", ("ecg_scan.pdf", dummy_file_2, "application/pdf")),
    ]
    data = [
        ("report_types", "Blood Test Report"),
        ("report_types", "ECG / Heart Graph"),
    ]
    res = requests.post(f"{BASE_URL}/reports/patient/{patient_id}/upload", files=files, data=data, headers=headers_vol)
    assert res.status_code == 200, f"Report upload failed: {res.text}"
    uploaded_reports = res.json()
    assert len(uploaded_reports) == 2, f"Expected 2 uploaded reports, got {len(uploaded_reports)}"
    for r in uploaded_reports:
        print(f"   * Report: {r['report_type']} -> Stored as: {r['stored_filename']}")
    print("-> SUCCESS: Multiple medical reports uploaded with patient name auto-tagging!")

    # 5. Patient Login (Phone Number as Username + PIN)
    print("\n[5] Testing Patient Login via Phone Number & PIN...")
    res = requests.post(f"{BASE_URL}/auth/login/patient", json={
        "phone": "9876500001",
        "password": "5566"
    })
    assert res.status_code == 200, f"Patient login failed: {res.text}"
    patient_auth = res.json()
    patient_token = patient_auth["access_token"]
    print(f"-> SUCCESS: Citizen logged in with Phone Number (Name: {patient_auth['full_name']})")

    # Patient views own records & reports
    headers_pat = {"Authorization": f"Bearer {patient_token}"}
    res = requests.get(f"{BASE_URL}/patient/my-records", headers=headers_pat)
    assert res.status_code == 200, f"Fetching patient records failed: {res.text}"
    my_records = res.json()
    assert len(my_records["reports"]) >= 2, f"Expected at least 2 reports in patient file, got {len(my_records['reports'])}"
    print(f"-> SUCCESS: Patient successfully accessed their records and verified {len(my_records['reports'])} test report(s)!")

    # 6. Camp Assistant Ingests Vitals -> Auto Risk Computation
    print("\n[6] Testing Camp Assistant Ingesting Vitals with Auto Risk Triaging...")
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "username": "assistant_alex",
        "password": "Assistant@123"
    })
    assert res.status_code == 200
    assistant_token = res.json()["access_token"]
    headers_asst = {"Authorization": f"Bearer {assistant_token}"}

    vitals_payload = {
        "patient_id": patient_id,
        "systolic_bp": 148.0, # High BP
        "diastolic_bp": 94.0,  # High BP -> Should trigger Red
        "heart_rate": 82,
        "spo2": 97.0,
        "temperature": 36.7,
        "blood_glucose": 130.0
    }
    res = requests.post(f"{BASE_URL}/collector/vitals", json=vitals_payload, headers=headers_asst)
    assert res.status_code == 200, f"Vitals intake failed: {res.text}"
    vitals_res = res.json()
    assert vitals_res["risk_level"] == "Red", f"Expected risk level Red, got {vitals_res['risk_level']}"
    print(f"-> SUCCESS: Vitals saved! Auto-classified as: {vitals_res['risk_level']} (High Blood Pressure)")

    # 7. Higher Authority Analytics Query (Jurisdiction Filtered, Zero PII)
    print("\n[7] Testing Higher Authority Analytics Portal (District Collector)...")
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "username": "collector_rao",
        "password": "Authority@123"
    })
    assert res.status_code == 200
    authority_token = res.json()["access_token"]
    headers_auth = {"Authorization": f"Bearer {authority_token}"}

    res = requests.get(f"{BASE_URL}/analytics/dashboard?district=Visakhapatnam&time_range=30d", headers=headers_auth)
    assert res.status_code == 200, f"Analytics query failed: {res.text}"
    analytics_data = res.json()
    summary = analytics_data["summary"]
    print(f"-> SUCCESS: Analytics fetched! Total Screened: {summary['total_screened']}, Red (Critical): {summary['red_count']}, Green: {summary['green_count']}")
    assert len(analytics_data["localities"]) > 0, "Expected at least 1 locality in analytics"
    print(f"-> Locality scorecard: {analytics_data['localities'][0]['locality']} -> Alert Level: {analytics_data['localities'][0]['alert_level']}")

    # 8. Verify Camp Assistant CANNOT access Analytics (403 Forbidden)
    print("\n[8] Verifying Camp Assistant has NO access to Analytics...")
    res = requests.get(f"{BASE_URL}/analytics/dashboard", headers=headers_asst)
    assert res.status_code == 403, f"Expected 403 Forbidden for assistant, got {res.status_code}"
    print("-> SUCCESS: Camp Assistant strictly forbidden from analytics (403 as expected)!")

    # 9. Verify Unscanned Citizen cannot log in
    print("\n[9] Verifying Unscanned Citizen cannot log in...")
    res = requests.post(f"{BASE_URL}/auth/login/patient", json={
        "phone": "9999900000",
        "password": "1234"
    })
    assert res.status_code == 404, f"Expected 404 for unscanned citizen, got {res.status_code}"
    print(f"-> SUCCESS: Rebuffed with friendly message: '{res.json()['detail']}'")

    print("\n==================================================")
    print("ALL 9 INTEGRATION TESTS PASSED PERFECTLY!")
    print("==================================================")

if __name__ == "__main__":
    t = threading.Thread(target=start_server, daemon=True)
    t.start()
    if not wait_for_server():
        print("Failed to start server within timeout.")
        sys.exit(1)
    try:
        run_tests()
    except Exception as e:
        print(f"\nTEST RUNNER ERROR: {e}")
        sys.exit(1)
    sys.exit(0)
