# SwasthGrama (स्वस्थ ग्राम) — System Architecture & Clinical Documentation

> **A Rural Healthcare Monitoring, Wireless Medical Telemetry & Digital Health Records Platform**

---

## 1. Executive Summary & Clinical Purpose

**SwasthGrama** is a connected digital healthcare platform designed specifically for rural villages, mobile healthcamps, and community clinics. It bridges the gap between remote villages and medical doctors by enabling field health workers to capture live physiological data using wireless medical sensors, maintain comprehensive patient medical histories, work completely offline in areas without internet, and allow doctors to conduct secure, consent-based telemedicine consultations.

```
       +-------------------------------------------------------------------------+
       |                         SWASTHGRAMA ECOSYSTEM                           |
       +-------------------------------------------------------------------------+
       |                                                                         |
       |   [ Field Healthcamp ]                [ Cloud Backend ]      [ Doctor ] |
       |   • Patient Registration (Aadhaar)    • Secure API           • Tele-Consult
       |   • Bluetooth Sensor Hub (ESP32)  ==> • PostgreSQL Database ==>  • Consent OTP
       |   • Offline-First Syncing             • Audit Log Trail      • Prescription
       |                                                                         |
       +-------------------------------------------------------------------------+
```

---

## 2. What the Software Does (Role-by-Role Guide)

### 🩺 For Medical Doctors: Clinical Decision Support & Tele-Consultation
If a doctor is using SwasthGrama, the platform provides a complete clinical workstation:

1. **Patient-Consent Medical File Unlocking**:
   - To protect patient privacy, a doctor cannot arbitrarily view a patient's file.
   - The doctor enters the patient's mobile number; the system instantly dispatches a **6-digit SMS Consent OTP** to the patient's phone.
   - Once the patient shares the OTP with the doctor, the patient's full medical history and vitals timeline are unlocked.

2. **Longitudinal Vitals Trending & Visual Charts**:
   - Doctors see real-time interactive charts showing trends for:
     - **Blood Pressure** (Systolic & Diastolic over weeks/months)
     - **Pulse Rate / Heart Rate** (BPM)
     - **Blood Oxygen Saturation** (SpO2 %)
     - **Body Temperature** (°C) and **Blood Glucose** (mg/dL)
   - Automatically color-codes abnormal readings (e.g., Stage 1/Stage 2 Hypertension, Hypoxemia, Tachycardia).

3. **Intake & Comprehensive Health History**:
   - Displays chronic conditions (Diabetes, CAD, Asthma, CKD).
   - Drug and substance allergies (e.g., Penicillin, NSAIDs, Sulfa drugs) to prevent adverse drug reactions.
   - Family medical history (paternal/maternal diabetes, cardiovascular diseases).
   - Surgical history and lifestyle risk factors (smoking status, alcohol, physical activity, diet).

4. **Digital Clinical Diagnosis & E-Prescription**:
   - Record clinical findings and provisional diagnoses.
   - Add structured medication prescriptions (Drug name, dosage, frequency like `1-0-1`, and duration in days).
   - Schedule follow-up consultation dates.

---

### 🎒 For Field Healthcamp Assistants & Village Data Collectors
Health workers visiting remote villages use the app on mobile phones or tablets:

1. **Wireless Bluetooth (BLE) Telemetry Streaming**:
   - Connects wirelessly to portable medical sensor kits (**ESP32 Bluetooth Low Energy Hub**).
   - Live vitals (Blood Pressure, SpO2, Heart Rate, Temperature) stream directly onto the screen in real-time.
   - Health workers tap **"Transfer Live Readings Into Screening Form"** with zero manual data-entry errors.

2. **100% Offline-First Operation**:
   - Remote villages often have zero cellular connectivity.
   - Health workers can register patients and record hundreds of vitals screenings completely offline.
   - All data is securely stored locally in the device's encrypted IndexedDB storage.
   - When the health worker returns to an area with mobile data or Wi-Fi, the app automatically syncs all unsent records with one tap.

---

### 📋 For Registration Desks & Front Office Staff
1. **New Resident Onboarding**:
   - Rapid demographic intake (Name, Phone, Age, Gender, Address, Emergency Contact).
   - Standardized clinical questionnaire capturing chronic ailments, surgeries, and family health risks.
2. **National ID (Aadhaar) Privacy Protection**:
   - Field workers enter the 12-digit Aadhaar number for identity deduplication.
   - The system immediately hashes and masks the number into `XXXX-XXXX-1234`. Raw national IDs are never stored in plaintext.

---

### 📱 For Patients & Villagers
1. **Zero-Password Mobile Login**:
   - Villagers log in to the Patient Portal using their mobile number and a 6-digit SMS OTP (no complex passwords to remember).
2. **Personal Health Summary & Prescription Record**:
   - View recent screening results, blood pressure history, doctor notes, and prescribed medicines.
   - Print or save digital clinical summaries for visits to secondary/tertiary hospitals.

---

### 🛡️ For Healthcare Administrators & Public Health Officers
1. **Village Health Analytics**:
   - Aggregated metrics: Total patients screened, hypertension/diabetes prevalence rates, screening volumes per camp.
2. **Staff & Device Inventory Management**:
   - Manage user accounts and roles (`Doctor`, `Collector`, `Registrar`, `Administrator`).
   - Track and register BLE medical hardware by MAC address.
3. **Tamper-Proof Audit Logging**:
   - Complete electronic audit trail recording who accessed which patient record, IP addresses, and timestamps for medical governance.

---

## 3. System Architecture & Technical Specifications

```
+------------------------------------------------------------------------------------+
|                                    CLIENT TIER                                     |
|                                                                                    |
|  • Framework: React 18 + Vite + Tailwind CSS                                       |
|  • App Type: Progressive Web App (PWA) with Full-Screen Standalone Mode            |
|  • Hardware Link: Web Bluetooth API (Nordic UART Service GATT Profile)             |
|  • Local Storage: Browser IndexedDB (idb-keyval) for Offline-First Storage         |
|  • 1-Click Install: Native PWA prompt + iOS Home Screen Guide                      |
+------------------------------------------------------------------------------------+
                                         │
                                   HTTPS REST API
                                         │
+------------------------------------------------------------------------------------+
|                                 APPLICATION TIER                                   |
|                                                                                    |
|  • Framework: FastAPI (Python 3.10+ ASGI High-Performance Engine)                  |
|  • Authentication: JWT (HS256) + Bcrypt Password Hashing                          |
|  • SMS Gateway: Twilio Verify & Programmable SMS (BackgroundTasks non-blocking)    |
|  • Rate Limiting: 30s OTP Cooldown + 5-Attempt Brute-Force Lockout Protection      |
|  • Privacy Engine: SHA-256 Aadhaar Hashing & Masking                               |
|  • Security Headers: X-Content-Type, X-Frame-Options, XSS Protection, HSTS        |
+------------------------------------------------------------------------------------+
                                         │
                            SQLAlchemy ORM (Connection Pool)
                                         │
+------------------------------------------------------------------------------------+
|                                    DATA TIER                                       |
|                                                                                    |
|  • Database: PostgreSQL (Supabase Cloud Database)                                  |
|  • Connection Management: Resilient TCP Keepalives, Pool Pre-Ping & Auto-Recycle   |
|  • Core Tables: users, patients, vitals_logs, clinical_notes, devices, audit_logs  |
+------------------------------------------------------------------------------------+
```

---

## 4. Key Security & Privacy Safeguards

| Safeguard | Implementation Details | Clinical / Legal Benefit |
| :--- | :--- | :--- |
| **Doctor Consent Verification** | 6-digit cryptographic OTP required before unlocking records. | Guarantees patient confidentiality; prevents unauthorized file browsing. |
| **Aadhaar / PII Masking** | SHA-256 irreversible hashing for index; masked format `XXXX-XXXX-1234`. | Complies with national privacy regulations; prevents identity theft. |
| **Constant-Time Comparison** | `hmac.compare_digest()` for all OTP verifications. | Eliminates timing attacks on authentication endpoints. |
| **Anti-Brute Force Lockout** | Account/session locks after 5 consecutive failed OTP attempts. | Protects patient accounts against automated guessing scripts. |
| **Audit Trail** | System-wide audit logger recording user ID, action, resource, IP, and time. | Ensures non-repudiation and forensic accountability for clinical audits. |
| **Safe Offline Storage** | Automatic purging of synced records from local cache upon successful upload. | Minimizes data exposure risk on lost or stolen field mobile devices. |

---

## 5. Summary Table: Features vs. User Benefit

| Feature | How It Works | Benefit to Healthcare Delivery |
| :--- | :--- | :--- |
| **Bluetooth Live Telemetry** | Auto-reads BP, SpO2, Heart Rate from ESP32 kit | Eliminates human transcription errors; speeds up screening to < 1 min. |
| **Offline-First Syncing** | Queues records in IndexedDB without internet | Allows uninterrupted medical camps in remote villages and hilly terrains. |
| **E-Prescription Module** | Doctor types dosage & schedule digitally | Eliminates illegible handwriting; creates clean digital patient history. |
| **Interactive Graphs** | Recharts visualizes historical BP & pulse | Helps doctors instantly spot hypertension deterioration or cardiac risks. |
| **1-Click Mobile App Install** | PWA standalone launcher without browser bars | Provides a native Android/iOS app experience without app store downloads. |
