import React, { useState } from 'react';
import api, { extractErrorMessage } from '../../services/api';
import { useSync } from '../../context/SyncContext';

const COMMON_STATES = [
  'Andhra Pradesh'
];

const ANDHRA_PRADESH_DISTRICTS = [
  'Alluri Sitharama Raju',
  'Anakapalli',
  'Ananthapuramu',
  'Annamayya',
  'Bapatla',
  'Chittoor',
  'Dr. B.R. Ambedkar Konaseema',
  'East Godavari',
  'Eluru',
  'Guntur',
  'Kakinada',
  'Krishna',
  'Kurnool',
  'Nandyal',
  'NTR',
  'Palnadu',
  'Parvathipuram Manyam',
  'Markapuram',
  'Polavaram',
  'Prakasam',
  'Sri Potti Sriramulu Nellore',
  'Sri Sathya Sai',
  'Srikakulam',
  'Tirupati',
  'Visakhapatnam',
  'Vizianagaram',
  'West Godavari',
  'YSR Kadapa',
  'Other'
];

const COMMON_DISTRICTS_BY_STATE = {
  'Andhra Pradesh': ANDHRA_PRADESH_DISTRICTS
};

const REPORT_TYPE_OPTIONS = [
  'Blood Test Report',
  'ECG / Heart Graph',
  'X-Ray Scan',
  'MRI / CT Scan',
  'Ultrasound Scan',
  'Doctor Prescription',
  'Hospital Discharge Summary',
  'Lab / Urine Report',
  'Other Medical Document'
];

const PRIMARY_PROBLEMS = [
  'Routine Preventive Checkup',
  'High Blood Pressure / Dizziness',
  'Diabetes / High Sugar Symptoms',
  'Chest Pain / Heart Concern',
  'Asthma / Breathing Trouble',
  'Joint Pain / Arthritis',
  'Eye / Vision Problem',
  'Fever / Infection',
  'Kidney / Urinary Problem',
  'General Weakness / Fatigue',
  'Skin Rash / Allergy',
  'Other'
];

const KNOWN_CONDITIONS_OPTIONS = [
  'Hypertension (High Blood Pressure)',
  'Type 2 Diabetes',
  'Heart Condition / CAD',
  'Asthma / Bronchitis',
  'Thyroid Disorder',
  'Kidney Illness',
  'Arthritis / Joint Pain',
  'None / No Known Long-term Illness'
];

const UserRegistrationPage = () => {
  const { isOnline, enqueuePatientRecord } = useSync();

  // Citizen Identity
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [patientPin, setPatientPin] = useState('');

  // Demographics (Dropdowns)
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState('');
  const [ageMonths, setAgeMonths] = useState('');
  const [ageGroup, setAgeGroup] = useState('Adult (19-45)');
  const [bloodGroup, setBloodGroup] = useState('O+');

  // Separated Address Columns
  const [houseNumber, setHouseNumber] = useState('');
  const [villageOrTown, setVillageOrTown] = useState('');
  const [city, setCity] = useState('');
  const [selectedState, setSelectedState] = useState('Andhra Pradesh');
  const [selectedDistrict, setSelectedDistrict] = useState('Visakhapatnam');
  const [customDistrict, setCustomDistrict] = useState('');
  const [pincode, setPincode] = useState('');

  // Clinical Profiling
  const [primaryProblem, setPrimaryProblem] = useState(PRIMARY_PROBLEMS[0]);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [issueCategories, setIssueCategories] = useState([]);
  const [pregnancyStatus, setPregnancyStatus] = useState('unknown');
  const [pregnancyMonth, setPregnancyMonth] = useState('');
  const [pregnancyIssues, setPregnancyIssues] = useState([]);
  const [ancVisits, setAncVisits] = useState('');
  const [vaccinationStatus, setVaccinationStatus] = useState('unknown');
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [growthIssues, setGrowthIssues] = useState([]);
  const [mandal, setMandal] = useState('');
  const [phcName, setPhcName] = useState('');

  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('Spouse');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Medical Reports Multi-Upload Queue
  const [queuedFiles, setQueuedFiles] = useState([]); // [{ file, reportType, previewName }]

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [createdPatient, setCreatedPatient] = useState(null);
  const [uploadedReportsList, setUploadedReportsList] = useState([]);

  const handleAgeChange = (val) => {
    setAge(val);
    const num = parseInt(val);
    if (num > 2) setAgeMonths('');
    if (!isNaN(num)) {
      if (num <= 12) setAgeGroup('Infant / Child (0-12)');
      else if (num <= 18) setAgeGroup('Youth (13-18)');
      else if (num <= 45) setAgeGroup('Adult (19-45)');
      else if (num <= 60) setAgeGroup('Middle-Aged (46-60)');
      else setAgeGroup('Senior Citizen (60+)');
    }
  };

  const toggleCondition = (item) => {
    if (item.startsWith('None')) {
      setSelectedConditions([item]);
      return;
    }
    const filtered = selectedConditions.filter(c => !c.startsWith('None'));
    if (filtered.includes(item)) {
      setSelectedConditions(filtered.filter(c => c !== item));
    } else {
      setSelectedConditions([...filtered, item]);
    }
  };

  // Handle Multi-file Selection
  const handleFileSelection = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const patientSafeName = (fullName.trim() || 'Patient').replace(/[^a-zA-Z0-9]/g, '_');
    const newQueueItems = files.map((file, idx) => {
      const ext = file.name.split('.').pop() || 'pdf';
      const defaultType = REPORT_TYPE_OPTIONS[0];
      const typeSafe = defaultType.replace(/[^a-zA-Z0-9]/g, '_');
      return {
        id: `${Date.now()}-${idx}`,
        file,
        reportType: defaultType,
        previewName: `${patientSafeName}_${typeSafe}_${idx + 1}.${ext}`
      };
    });

    setQueuedFiles(prev => [...prev, ...newQueueItems]);
  };

  const updateQueuedFileType = (id, newType) => {
    const patientSafeName = (fullName.trim() || 'Patient').replace(/[^a-zA-Z0-9]/g, '_');
    const typeSafe = newType.replace(/[^a-zA-Z0-9]/g, '_');

    setQueuedFiles(prev => prev.map(item => {
      if (item.id === id) {
        const ext = item.file.name.split('.').pop() || 'pdf';
        return {
          ...item,
          reportType: newType,
          previewName: `${patientSafeName}_${typeSafe}.${ext}`
        };
      }
      return item;
    }));
  };

  const removeQueuedFile = (id) => {
    setQueuedFiles(prev => prev.filter(item => item.id !== id));
  };

  // Submit Patient Registration & Multi-File Reports
  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setNotification(null);

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanAadhaar = aadhaar.replace(/\D/g, '');

    if (!fullName.trim()) {
      setNotification({ type: 'error', message: 'Citizen full name is required.' });
      return;
    }
    if (cleanPhone.length < 10) {
      setNotification({ type: 'error', message: 'Please enter a valid 10-digit mobile number.' });
      return;
    }
    if (cleanAadhaar.length !== 12) {
      setNotification({ type: 'error', message: 'Aadhaar card number must be exactly 12 digits.' });
      return;
    }

    const finalDistrict = selectedDistrict === 'Other' ? (customDistrict.trim() || 'Other') : selectedDistrict;
    const underFive = (ageMonths && parseInt(ageMonths) < 60) || (age && parseInt(age) < 5);

    const payload = {
      full_name: fullName.trim(),
      phone: cleanPhone,
      aadhaar_number: cleanAadhaar,
      patient_pin: patientPin.trim() || cleanPhone.slice(-4),
      age: age ? parseInt(age) : null,
      age_months: ageMonths ? parseInt(ageMonths) : null,
      gender,
      mandal: mandal.trim() || null,
      phc_name: phcName.trim() || null,
      health_issue_categories: issueCategories,
      is_pregnant: gender !== 'Female' ? null : pregnancyStatus === 'yes' ? true : pregnancyStatus === 'no' ? false : null,
      pregnancy_month: gender === 'Female' && pregnancyStatus === 'yes' && pregnancyMonth ? parseInt(pregnancyMonth) : null,
      pregnancy_issues: gender === 'Female' && pregnancyStatus === 'yes' ? pregnancyIssues : [],
      anc_visit_count: gender === 'Female' && pregnancyStatus === 'yes' && ancVisits ? parseInt(ancVisits) : null,
      vaccination_status: underFive && vaccinationStatus !== 'unknown' ? vaccinationStatus : null,
      weight_kg: underFive && weightKg ? parseFloat(weightKg) : null,
      height_cm: underFive && heightCm ? parseFloat(heightCm) : null,
      growth_issues: underFive ? growthIssues : [],
      house_number: houseNumber.trim() || null,
      village_or_town: villageOrTown.trim() || null,
      city: city.trim() || null,
      district: finalDistrict,
      state: selectedState,
      country: 'India',
      pincode: pincode.trim() || null,
      primary_health_issue: primaryProblem,
      health_issues_list: selectedConditions.length > 0 ? selectedConditions : ['None Known'],
      emergency_contact: {
        name: emergencyName.trim() || null,
        relation: emergencyRelation,
        phone: emergencyPhone.replace(/\D/g, '').slice(-10) || null,
        blood_group: bloodGroup
      }
    };

    setSubmitting(true);

    if (isOnline) {
      try {
        // Step 1: Save Patient Record
        const res = await api.post('/collector/patient', payload);
        const registered = res.data;
        setCreatedPatient(registered);

        // Step 2: Upload Medical Reports if any queued
        let uploaded = [];
        if (queuedFiles.length > 0) {
          const formData = new FormData();
          queuedFiles.forEach(item => {
            formData.append('files', item.file);
            formData.append('report_types', item.reportType);
          });

          const uploadRes = await api.post(`/reports/patient/${registered.id}/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          uploaded = uploadRes.data || [];
          setUploadedReportsList(uploaded);
        }

        setNotification({
          type: 'success',
          message: `Citizen ${fullName} is successfully registered. ${uploaded.length > 0 ? `${uploaded.length} medical report(s) saved.` : ''} Login PIN: ${payload.patient_pin}`
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });

      } catch (err) {
        setNotification({
          type: 'error',
          message: extractErrorMessage(err, 'Failed to save registration. Please check information and try again.')
        });
      } finally {
        setSubmitting(false);
      }
    } else {
      // Offline mode
      await enqueuePatientRecord(payload);
      setCreatedPatient({
        id: `OFFLINE-${cleanPhone.slice(-4)}`,
        full_name: fullName.trim(),
        phone: cleanPhone,
        aadhaar_masked: `XXXX-XXXX-${cleanAadhaar.slice(-4)}`,
        village_or_town: villageOrTown,
        district: finalDistrict,
        isOffline: true
      });
      setNotification({
        type: 'warning',
        message: `Offline Notice: Citizen ${fullName} is saved safely on this device. It will upload automatically when internet connects.`
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setAadhaar('');
    setPatientPin('');
    setAge('');
    setAgeMonths('');
    setMandal('');
    setPhcName('');
    setIssueCategories([]);
    setPregnancyStatus('unknown');
    setPregnancyMonth('');
    setPregnancyIssues([]);
    setAncVisits('');
    setVaccinationStatus('unknown');
    setWeightKg('');
    setHeightCm('');
    setGrowthIssues([]);
    setHouseNumber('');
    setVillageOrTown('');
    setCity('');
    setPincode('');
    setPrimaryProblem(PRIMARY_PROBLEMS[0]);
    setSelectedConditions([]);
    setEmergencyName('');
    setEmergencyPhone('');
    setQueuedFiles([]);
    setCreatedPatient(null);
    setUploadedReportsList([]);
    setNotification(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Page Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Citizen Health Registration</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Village healthcamp intake desk. Fill details with simple dropdowns and upload previous test reports.
          </p>
        </div>
        {createdPatient && (
          <button
            onClick={resetForm}
            className="px-3.5 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold shadow-sm transition"
          >
            + Register Next Citizen
          </button>
        )}
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-xl border text-xs font-medium ${
          notification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
            : notification.type === 'warning'
            ? 'bg-amber-50 text-amber-900 border-amber-300'
            : 'bg-rose-50 text-rose-900 border-rose-300'
        }`}>
          {notification.message}
        </div>
      )}

      {/* SUCCESS RECEIPT MODAL / CARD */}
      {createdPatient && (
        <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base">
              ✓
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Registration Complete</h3>
              <p className="text-xs text-slate-500">Citizen is enrolled and can now sign in using their phone number.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl text-xs">
            <div>
              <span className="text-slate-500 block">Name</span>
              <span className="font-bold text-slate-900">{createdPatient.full_name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Login Phone</span>
              <span className="font-bold text-slate-900">+91 {createdPatient.phone}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Location</span>
              <span className="font-semibold text-slate-800">{createdPatient.village_or_town || 'Village'}, {createdPatient.district}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Login PIN</span>
              <span className="font-bold text-teal-700">{patientPin || createdPatient.phone.slice(-4)}</span>
            </div>
          </div>

          {uploadedReportsList.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <span className="text-xs font-bold text-slate-700 block">Saved Medical Reports:</span>
              <div className="space-y-1">
                {uploadedReportsList.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-xs bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
                    <span className="font-medium text-slate-800">{r.report_type} ({r.stored_filename})</span>
                    <a
                      href={`/api/v1/reports/download/${r.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-700 hover:underline font-semibold"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-lg bg-teal-800 text-white font-semibold text-xs hover:bg-teal-900 transition"
            >
              Register Another Citizen
            </button>
          </div>
        </div>
      )}

      {/* REGISTRATION FORM */}
      {!createdPatient && (
        <form onSubmit={handleRegisterPatient} className="space-y-6">
          
          {/* SECTION 1: Citizen Identity */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center">1</span>
              <h2 className="text-sm font-bold text-slate-900">Citizen Identity & Login Setup</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone Number (Login Username) *</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 text-xs bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-slate-600 font-semibold">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Aadhaar Card Number *</label>
                <input
                  type="text"
                  maxLength={12}
                  required
                  value={aadhaar}
                  onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ''))}
                  placeholder="12-digit Aadhaar Number"
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium tracking-wider"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Set Citizen Portal PIN (Optional)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={patientPin}
                  onChange={(e) => setPatientPin(e.target.value)}
                  placeholder={`Default: last 4 digits (${phone.slice(-4) || 'XXXX'})`}
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Patient uses this PIN to log in and view test reports.</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: Demographics (Dropdowns) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center">2</span>
              <h2 className="text-sm font-bold text-slate-900">Demographics & Blood Group</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gender *</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-semibold text-slate-800"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Age in Years</label>
                <input
                  type="number"
                  min="0"
                  max="125"
                  value={age}
                  onChange={(e) => handleAgeChange(e.target.value)}
                  placeholder="e.g. 45"
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Age Group</label>
                <select
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium text-slate-800"
                >
                  <option value="Infant / Child (0-12)">Child (0-12)</option>
                  <option value="Youth (13-18)">Youth (13-18)</option>
                  <option value="Adult (19-45)">Adult (19-45)</option>
                  <option value="Middle-Aged (46-60)">Middle-Aged (46-60)</option>
                  <option value="Senior Citizen (60+)">Senior (60+)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-semibold text-slate-800"
                >
                  <option value="O+">O Positive (O+)</option>
                  <option value="A+">A Positive (A+)</option>
                  <option value="B+">B Positive (B+)</option>
                  <option value="AB+">AB Positive (AB+)</option>
                  <option value="O-">O Negative (O-)</option>
                  <option value="A-">A Negative (A-)</option>
                  <option value="B-">B Negative (B-)</option>
                  <option value="AB-">AB Negative (AB-)</option>
                  <option value="Unknown">Don't Know</option>
                </select>
              </div>
            </div>
          </div>

          <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div><h2 className="text-sm font-bold text-slate-900">Health details for reports</h2><p className="text-xs text-slate-500 mt-1">These details are optional. Record them when known.</p></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(!age || parseInt(age) <= 2 || ageMonths) && <div><label className="block text-xs font-bold text-slate-700 mb-1">Baby's age in months</label><input type="number" min="0" max="24" value={ageMonths} onChange={e=>setAgeMonths(e.target.value)} className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg" /></div>}
              {gender === 'Female' && <div><label className="block text-xs font-bold text-slate-700 mb-1">Pregnant?</label><select value={pregnancyStatus} onChange={e=>setPregnancyStatus(e.target.value)} className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg"><option value="unknown">Not recorded</option><option value="yes">Yes</option><option value="no">No</option></select></div>}
              {gender === 'Female' && pregnancyStatus === 'yes' && <>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">Pregnancy month</label><select value={pregnancyMonth} onChange={e=>setPregnancyMonth(e.target.value)} className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg"><option value="">Choose month</option>{Array.from({length:9},(_,i)=><option key={i+1} value={i+1}>{i+1} month</option>)}</select></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">Check-up visits</label><input type="number" min="0" max="30" value={ancVisits} onChange={e=>setAncVisits(e.target.value)} className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg" /></div>
              </>}
              {((age && parseInt(age) <= 5) || (ageMonths && parseInt(ageMonths) < 60)) && <>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">Vaccines</label><select value={vaccinationStatus} onChange={e=>setVaccinationStatus(e.target.value)} className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg"><option value="unknown">Not recorded</option><option value="up_to_date">All due vaccines given</option><option value="some_missed">Some vaccines missed</option><option value="overdue">Vaccines overdue</option></select></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">Weight (kg)</label><input type="number" step="0.1" min="0" max="100" value={weightKg} onChange={e=>setWeightKg(e.target.value)} className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">Height (cm)</label><input type="number" step="0.1" min="0" max="200" value={heightCm} onChange={e=>setHeightCm(e.target.value)} className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg" /></div>
                {(parseInt(age) <= 2 || (ageMonths && parseInt(ageMonths) <= 24)) && <div className="sm:col-span-2 lg:col-span-4"><label className="block text-xs font-bold text-slate-700 mb-2">Baby health or growth problem</label><div className="flex flex-wrap gap-2">{['Low weight','Slow growth','Frequent illness','Other'].map(x=><label key={x} className="text-xs flex items-center gap-1.5 rounded-full bg-slate-50 border px-2.5 py-1.5"><input type="checkbox" checked={growthIssues.includes(x)} onChange={e=>setGrowthIssues(v=>e.target.checked?[...v,x]:v.filter(k=>k!==x))}/>{x}</label>)}</div></div>}
              </>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold text-slate-700 mb-2">Health problem areas</label><div className="flex flex-wrap gap-2">{['Heart','Breathing','Kidney or urine','Stomach','Brain or nerves','Bones or movement','Diabetes','Eyes','Ears','Skin','Mental health','Other'].map(x=><label key={x} className="text-xs flex items-center gap-1.5 rounded-full bg-slate-50 border px-2.5 py-1.5"><input type="checkbox" checked={issueCategories.includes(x)} onChange={e=>setIssueCategories(v=>e.target.checked?[...v,x]:v.filter(k=>k!==x))}/>{x}</label>)}</div></div>
              {gender === 'Female' && pregnancyStatus === 'yes' && <div><label className="block text-xs font-bold text-slate-700 mb-2">Pregnancy problems</label><div className="flex flex-wrap gap-2">{['High blood pressure','Low blood level','Diabetes','Swelling','Other'].map(x=><label key={x} className="text-xs flex items-center gap-1.5 rounded-full bg-slate-50 border px-2.5 py-1.5"><input type="checkbox" checked={pregnancyIssues.includes(x)} onChange={e=>setPregnancyIssues(v=>e.target.checked?[...v,x]:v.filter(k=>k!==x))}/>{x}</label>)}</div></div>}
            </div>
          </section>

          {/* SECTION 3: Structured Address Columns */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center">3</span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Address Details (Separated Columns for Analytics)</h2>
                <span className="text-[11px] text-slate-500">Helps authorities view village-wise and district-wise health metrics.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mandal</label>
                <input type="text" value={mandal} onChange={(e) => setMandal(e.target.value)} placeholder="Mandal name" className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PHC / Health Centre</label>
                <input type="text" value={phcName} onChange={(e) => setPhcName(e.target.value)} placeholder="Health centre name" className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">House / Door / Flat No.</label>
                <input
                  type="text"
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  placeholder="e.g. 4-12/B or Near Temple"
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Village / Town / Ward *</label>
                <input
                  type="text"
                  required
                  value={villageOrTown}
                  onChange={(e) => setVillageOrTown(e.target.value)}
                  placeholder="e.g. Pendurthi or Madhurawada"
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City / Taluka / Block</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Visakhapatnam or Guntur"
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">State *</label>
                <select
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    const distList = COMMON_DISTRICTS_BY_STATE[e.target.value];
                    if (distList && distList.length > 0) setSelectedDistrict(distList[0]);
                  }}
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-semibold text-slate-800"
                >
                  {COMMON_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">District *</label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-semibold text-slate-800"
                >
                  {ANDHRA_PRADESH_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {selectedDistrict === 'Other' && (
                  <input
                    type="text"
                    required
                    value={customDistrict}
                    onChange={(e) => setCustomDistrict(e.target.value)}
                    placeholder="Enter district name"
                    className="w-full mt-1.5 text-xs px-3 py-1.5 bg-slate-50 border border-slate-300 rounded focus:outline-none"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PIN Code (6 Digits)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="571103"
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Health Categorization for Analytics */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center">4</span>
              <h2 className="text-sm font-bold text-slate-900">Health Complaints & Conditions</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Main Health Complaint / Reason for Checkup *</label>
                <select
                  value={primaryProblem}
                  onChange={(e) => setPrimaryProblem(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-semibold text-slate-800"
                >
                  {PRIMARY_PROBLEMS.map((prob) => (
                    <option key={prob} value={prob}>{prob}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Previous Long-term Health Issues (Click to select)</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {KNOWN_CONDITIONS_OPTIONS.map((c) => {
                    const isSelected = selectedConditions.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCondition(c)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                          isSelected
                            ? 'bg-teal-700 text-white border-teal-800 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: Multi-File Medical Reports Upload */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center">5</span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Upload Additional Medical Reports</h2>
                  <span className="text-[11px] text-slate-500">
                    Each file is automatically named after the patient name and report type.
                  </span>
                </div>
              </div>
            </div>

            {/* File Input */}
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center bg-slate-50 hover:bg-slate-100/60 transition cursor-pointer relative">
              <input
                type="file"
                multiple
                accept=".pdf,image/png,image/jpeg,image/jpg"
                onChange={handleFileSelection}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-1">
                <span className="text-xs font-bold text-teal-800 block">Click or Drag & Drop Multiple Medical Reports</span>
                <span className="text-[11px] text-slate-500 block">Supports PDFs, Blood Test scans, ECG graphs, X-Ray images</span>
              </div>
            </div>

            {/* Queued Files List */}
            {queuedFiles.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-slate-700 block">
                  Files Queued to Upload ({queuedFiles.length})
                </span>
                <div className="space-y-2">
                  {queuedFiles.map((item) => (
                    <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 truncate block">{item.file.name}</span>
                        <span className="text-[11px] text-teal-700 font-medium">
                          Saved as: {item.previewName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <select
                          value={item.reportType}
                          onChange={(e) => updateQueuedFileType(item.id, e.target.value)}
                          className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 focus:outline-none"
                        >
                          {REPORT_TYPE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeQueuedFile(item.id)}
                          className="px-2 py-1 text-xs text-rose-600 hover:text-rose-800 font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-sm shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Saving Citizen Registration & Uploading Reports...' : 'Complete Registration & Save Reports'}
            </button>
          </div>

        </form>
      )}

    </div>
  );
};

export default UserRegistrationPage;
