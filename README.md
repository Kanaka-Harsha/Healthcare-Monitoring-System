# 🏥 HealthPulse — Production Healthcare Monitoring & IoT Telemetry System

A secure, offline-first, production-ready healthcare telemetry system designed for field screenings with **ESP32 Bluetooth Low Energy (BLE)** integration, **FastAPI backend**, **Supabase PostgreSQL database**, and a **React dashboard** supporting 4 distinct roles (**Data Collector, Doctor, Patient, and Admin**).

---

## 🌟 Key Capabilities by Role

### 1. 📱 Data Collector (Field Screening)
* **Intake Form**: Captures Patient Full Name, 10-digit Mobile Number, and 12-digit Aadhaar Card (with automatic privacy hashing and masking).
* **ESP32 BLE Telemetry**: Connects via Web Bluetooth / BLE GATT to capture:
  * Blood Pressure (Systolic / Diastolic mmHg)
  * Heart Rate (BPM with animated ECG pulse indicator)
  * Blood Oxygen (SpO2 %)
  * Temperature (°C) & Blood Glucose (mg/dL)
* **Hardware Simulator Mode**: Built-in virtual BLE simulator to test live data streams when physical ESP32 boards are not connected.
* **Offline-First Resilience**: If the field phone loses internet, records are cached in **IndexedDB local storage** and automatically sync to the server when connection is restored.
* **History Log**: View real-time list of all patients screened in the field.

### 2. 🩺 Doctor Portal (OTP-Consented Access)
* **Consent Verification Handshake**: Doctor inputs the patient's phone number $\rightarrow$ Patient receives a 6-digit OTP $\rightarrow$ Doctor inputs the OTP to unlock the patient's medical file.
* **Clinical Health Dashboard**:
  * Comprehensive historical vitals log and interactive trend charts.
  * Real-time hypertension and hypoxemia alert badges.
* **Prescription & Diagnosis**: Doctor can write clinical diagnoses, structured prescription medicines (dosage, frequency, days), dietary advice, and follow-up visit dates.

### 3. 👤 Patient Portal
* **Passwordless OTP Login**: Patient enters their registered phone number and authenticates with an SMS OTP.
* **Personal Vitals Tracker**: View current vitals, normal range indicators, historic trend graphs, and doctor prescriptions.
* **Printable Health Card**: One-click summary download for offline consultations.

### 4. 🛡️ Admin & Analytics
* **Population Health Overview**: Total screenings, vitals anomaly alerts, gender distribution, and screening velocity metrics.
* **Staff Management**: Create, activate, or deactivate Doctors and Data Collectors.
* **ESP32 Fleet Registry**: Register and track authorized ESP32 hardware identifiers.
* **HIPAA / Consent Audit Trail**: Immutable log of all record lookups, logins, and OTP verifications with timestamps and IP tracking.

---

## 🗄️ Database Architecture (Supabase PostgreSQL)

* `users`: Staff credentials (admin, doctor, collector), RBAC roles, and hashed passwords.
* `patients`: Demographics, phone index, SHA-256 Aadhaar hash (for deduplication), masked Aadhaar (`XXXX-XXXX-1234`).
* `vitals_records`: Systolic/Diastolic BP, Heart Rate, SpO2, Temperature, Glucose, ESP32 device ID, offline sync ID.
* `doctor_access_sessions`: Doctor ID, Patient ID, 6-digit OTP, expiration, and verification audit.
* `clinical_notes`: Diagnoses, prescriptions, structured medicine lists, and doctor advice.
* `devices`: Authorized ESP32 Bluetooth fleet MAC addresses and collector assignments.
* `audit_logs`: Detailed compliance audit trail for every sensitive action.

---

## ⚡ Default Seed Accounts

| Role | Email / Username | Phone | Password |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@healthcare.local` | `9999999999` | `Admin@Healthcare2026` |
| **Doctor** | `doctor@healthcare.local` | `9876543210` | `Doctor@123` |
| **Data Collector** | `collector@healthcare.local` | `9123456780` | `Collector@123` |
| **Patient** | *(Uses Phone Number)* | *(e.g. `9876543210`)* | *(Uses 6-digit OTP)* |

---

## 🚀 Running Locally for Development

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate          # (On Linux/Mac: source venv/bin/activate)
pip install -r requirements.txt
python -m app.db.init_db         # Initializes Supabase tables and seeds users
python run.py                    # Starts server on http://127.0.0.1:8000
```
Interactive API docs available at: `http://127.0.0.1:8000/api/v1/docs`

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev                      # Starts frontend on http://localhost:3000
```

---

## 🏭 24/7 Dedicated Server Deployment

### Running with Docker Compose (Recommended)
```bash
docker-compose up -d --build
```
* Backend runs with **Gunicorn multi-worker pool** on port 8000 with auto-restart (`restart: always`).
* Frontend is compiled and served through **optimized Nginx** on port 80 with reverse proxy for `/api/` and gzip compression.

### Cloudflare Tunnel for Public Access & Free HTTPS
To expose your 24/7 server to the internet with automatic SSL (required for Web Bluetooth):

1. **Quick Zero-Login Tunnel (Instant Testing)**:
   ```bash
   cloudflared tunnel --url http://localhost:80
   ```
2. **Persistent Named Tunnel (Custom Domain)**:
   * Create a tunnel in Cloudflare Zero Trust Dashboard $\rightarrow$ Tunnels.
   * Add `CLOUDFLARE_TUNNEL_TOKEN=your_token_here` in `.env`.
   * Uncomment the `tunnel` service in `docker-compose.yml`.

---

## 📡 ESP32 BLE GATT Packet Format

Your ESP32 firmware can send either standard BLE Health GATT profiles or a custom JSON text payload over UART characteristic `6e400003-b5a3-f393-e0a9-e50e24dcca9e`:

```json
{
  "systolic_bp": 120.0,
  "diastolic_bp": 80.0,
  "heart_rate": 72,
  "spo2": 98.5,
  "temperature": 36.6,
  "blood_glucose": 104.0
}
```