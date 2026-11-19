import React, { useState } from 'react';
import api, { extractErrorMessage } from '../../services/api';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { 
  UserCheck, 
  Heart, 
  FileText, 
  ClipboardList, 
  PlusCircle, 
  Search, 
  CheckCircle2, 
  X, 
  Plus, 
  Download,
  Activity,
  AlertTriangle
} from 'lucide-react';

const DoctorDashboard = () => {
  // Step 1: Search Patient
  const [patientPhone, setPatientPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [maskedPatientName, setMaskedPatientName] = useState('');
  
  // Step 2: Verify OTP
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [unlockedFile, setUnlockedFile] = useState(null);

  // New Clinical Note Form
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [medicines, setMedicines] = useState([{ name: '', dosage: '', frequency: '1-0-1', days: '5' }]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('vitals'); // 'vitals' | 'history' | 'reports' | 'notes' | 'addNote'

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const cleanPhone = patientPhone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit patient mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/doctor/patient/request-consent-otp', { phone: cleanPhone });
      if (res.data.success) {
        setOtpSent(true);
        setMaskedPatientName(res.data.patient_name_masked);
        setSuccessMsg(res.data.message);
      }
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, 'Patient not found or failed to dispatch OTP.'));
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & Unlock Medical Records
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const cleanPhone = patientPhone.replace(/\D/g, '').slice(-10);

    if (!otpCode) {
      setErrorMsg('Please enter the 6-digit OTP code provided by the patient.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await api.post('/doctor/patient/verify-consent-otp', {
        phone: cleanPhone,
        otp: otpCode.trim()
      });
      setUnlockedFile(res.data);
      setSuccessMsg('Consent verified! Patient medical file unlocked.');
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, 'Invalid or expired OTP. Please verify with patient.'));
    } finally {
      setIsVerifying(false);
    }
  };

  // Step 3: Add Clinical Note / Prescription
  const handleAddMedicineRow = () => {
    setMedicines([...medicines, { name: '', dosage: '', frequency: '1-0-1', days: '5' }]);
  };

  const handleMedicineChange = (index, field, value) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  const handleRemoveMedicineRow = (index) => {
    if (medicines.length <= 1) return;
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleSubmitClinicalNote = async (e) => {
    e.preventDefault();
    if (!diagnosis.trim()) {
      setErrorMsg('Please provide a primary diagnosis.');
      return;
    }

    const cleanMeds = medicines.filter(m => m.name.trim() !== '');

    setLoading(true);
    try {
      await api.post('/doctor/clinical-notes', {
        patient_id: unlockedFile.patient.id,
        diagnosis: diagnosis.trim(),
        prescription: prescription.trim() || null,
        prescribed_medicines: cleanMeds.length > 0 ? cleanMeds : null,
        clinical_notes: clinicalNotes.trim() || null,
        follow_up_date: followUpDate || null
      });

      setSuccessMsg('Clinical consultation and prescription recorded successfully!');
      setDiagnosis('');
      setPrescription('');
      setClinicalNotes('');
      setFollowUpDate('');
      setMedicines([{ name: '', dosage: '', frequency: '1-0-1', days: '5' }]);
      
      // Refresh patient file
      const refreshed = await api.post('/doctor/patient/verify-consent-otp', {
        phone: unlockedFile.patient.phone,
        otp: otpCode.trim()
      });
      setUnlockedFile(refreshed.data);
      setActiveTab('notes');
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, 'Failed to save clinical note.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetSession = () => {
    setUnlockedFile(null);
    setOtpSent(false);
    setPatientPhone('');
    setOtpCode('');
    setErrorMsg('');
    setSuccessMsg('');
    setActiveTab('vitals');
  };

  // Format chart data (chronological)
  const chartData = unlockedFile?.vitals_history ? [...unlockedFile.vitals_history].reverse().map(v => ({
    time: new Date(v.recorded_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    systolic: v.systolic_bp,
    diastolic: v.diastolic_bp,
    heartRate: v.heart_rate,
    spo2: v.spo2
  })) : [];

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">
              Doctor Consultation Desk
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800">
              Consent-Gated EHR
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">Patient Clinical Consultation & History</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter citizen's phone number. Patient will receive a secure OTP to grant clinical records access.
          </p>
        </div>

        {unlockedFile && (
          <button
            onClick={handleResetSession}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm flex items-center justify-center gap-1.5 flex-shrink-0"
          >
            <span>Close Patient File</span>
          </button>
        )}
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium shadow-sm flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="font-bold text-sm text-rose-500 hover:text-rose-800">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium shadow-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="font-bold text-sm text-emerald-600 hover:text-emerald-900">✕</button>
        </div>
      )}

      {/* Screen 1: Search Patient by Phone & OTP */}
      {!unlockedFile ? (
        <div className="max-w-lg mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Citizen Health File Access</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter patient's mobile number. A 6-digit consent OTP will be sent to their registered mobile.
            </p>
          </div>

          {!otpSent ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Patient Mobile Number *
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 text-xs bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl text-slate-600 font-semibold">+91</span>
                  <input
                    type="tel"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    maxLength={10}
                    required
                    className="w-full px-3 py-2.5 rounded-r-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="spinner-white"></span>
                    <span>Sending Consent Code via SMS...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Request Patient Consent Code</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-200 text-xs text-teal-900 space-y-1">
                <p>Verification code dispatched to: <strong>+91 {patientPhone}</strong></p>
                {maskedPatientName && <p>Patient Name: <strong>{maskedPatientName}</strong></p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Enter 6-Digit Consent Code (from Patient) *
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-center font-mono font-bold tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isVerifying ? (
                  <>
                    <span className="spinner-white"></span>
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verify Code & Unlock File</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 underline pt-1"
              >
                Use a different mobile number
              </button>
            </form>
          )}
        </div>
      ) : (
        /* Screen 2: Unlocked Patient Medical Record File */
        <div className="space-y-5">
          
          {/* Patient Profile Card (Separated cleanly from tabs) */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{unlockedFile.patient.full_name}</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  Verified & Open
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-1">
                <span>📞 +91 {unlockedFile.patient.phone}</span>
                <span>•</span>
                <span>Aadhaar: <strong className="font-mono">{unlockedFile.patient.aadhaar_masked}</strong></span>
                <span>•</span>
                <span>{unlockedFile.patient.age || 'N/A'} yrs</span>
                <span>•</span>
                <span>{unlockedFile.patient.gender || 'N/A'}</span>
                {unlockedFile.patient.district && (
                  <>
                    <span>•</span>
                    <span>{unlockedFile.patient.village_or_town ? `${unlockedFile.patient.village_or_town}, ` : ''}{unlockedFile.patient.district}</span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={handleResetSession}
              className="text-xs font-semibold text-slate-500 hover:text-rose-700 underline self-start sm:self-auto"
            >
              Close Record
            </button>
          </div>

          {/* DEDICATED TABS BAR */}
          <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto horizontal-scroll-touch flex items-center gap-1.5">
            {[
              { id: 'vitals', label: `Vital Signs (${unlockedFile.vitals_history.length})`, icon: Activity },
              { id: 'history', label: 'Medical History', icon: ClipboardList },
              { id: 'reports', label: `Medical Reports (${unlockedFile.reports?.length || 0})`, icon: FileText },
              { id: 'notes', label: `Doctor Notes (${unlockedFile.clinical_history.length})`, icon: UserCheck },
              { id: 'addNote', label: '+ New Diagnosis', icon: PlusCircle, highlight: true },
            ].map((tab) => {
              const Icon = tab.icon;
              const isCurrent = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                    isCurrent
                      ? tab.highlight
                        ? 'bg-teal-800 text-white shadow-sm'
                        : 'bg-slate-900 text-white shadow-sm'
                      : tab.highlight
                      ? 'bg-teal-50 text-teal-900 border border-teal-200 hover:bg-teal-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: Vitals Timeline & Trend Charts */}
          {activeTab === 'vitals' && (
            <div className="space-y-5">
              
              {/* Latest Vitals Highlights */}
              {unlockedFile.vitals_history.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-500 block font-medium">Blood Pressure</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {unlockedFile.vitals_history[0].systolic_bp ?? '--'} / {unlockedFile.vitals_history[0].diastolic_bp ?? '--'}
                      <span className="text-xs font-normal text-slate-400 ml-1">mmHg</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-500 block font-medium">Pulse Rate</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {unlockedFile.vitals_history[0].heart_rate ?? '--'}
                      <span className="text-xs font-normal text-slate-400 ml-1">BPM</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-500 block font-medium">SpO2 Oxygen</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {unlockedFile.vitals_history[0].spo2 ?? '--'}
                      <span className="text-xs font-normal text-slate-400 ml-1">%</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-500 block font-medium">Temperature</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {unlockedFile.vitals_history[0].temperature ?? '36.6'}
                      <span className="text-xs font-normal text-slate-400 ml-1">°C</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Vitals Trend Chart */}
              {chartData.length > 1 && (
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">Vitals History Trend</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} domain={['dataMin - 10', 'dataMax + 10']} />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                        <Legend />
                        <Line type="monotone" dataKey="systolic" name="Systolic BP" stroke="#0284c7" strokeWidth={2} />
                        <Line type="monotone" dataKey="diastolic" name="Diastolic BP" stroke="#0f766e" strokeWidth={2} />
                        <Line type="monotone" dataKey="heartRate" name="Pulse (BPM)" stroke="#e11d48" strokeWidth={2} />
                        <Line type="monotone" dataKey="spo2" name="Oxygen (%)" stroke="#16a34a" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Vitals History Table */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Recorded Vital Signs Log</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 min-w-[600px]">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-3">Date & Time</th>
                        <th className="p-3">Blood Pressure</th>
                        <th className="p-3">Pulse Rate</th>
                        <th className="p-3">SpO2 Oxygen</th>
                        <th className="p-3">Temperature</th>
                        <th className="p-3">Source Device</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {unlockedFile.vitals_history.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50">
                          <td className="p-3 text-slate-600 font-mono">
                            {new Date(rec.recorded_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                          <td className="p-3 font-bold text-slate-900">
                            {rec.systolic_bp ?? '--'} / {rec.diastolic_bp ?? '--'} mmHg
                          </td>
                          <td className="p-3 text-slate-800">{rec.heart_rate ?? '--'} BPM</td>
                          <td className="p-3 text-slate-800">{rec.spo2 ?? '--'}%</td>
                          <td className="p-3">{rec.temperature ? `${rec.temperature}°C` : '--'}</td>
                          <td className="p-3 text-slate-500">{rec.device_id || 'Manual Entry'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: Medical History Questionnaire */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {unlockedFile.patient.medical_history ? (
                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide pb-2 border-b border-slate-100">
                      Chronic Illnesses & Pre-existing Conditions
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(unlockedFile.patient.medical_history.past_medical_issues) && 
                       unlockedFile.patient.medical_history.past_medical_issues.length > 0 ? (
                        unlockedFile.patient.medical_history.past_medical_issues.map((c, i) => (
                          <span key={i} className="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                            {c}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">None reported during healthcamp intake.</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide pb-2 border-b border-slate-100">
                      Lifestyle Profile & Medications
                    </h4>
                    
                    {unlockedFile.patient.medical_history.lifestyle && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 block">Smoking</span>
                          <span className="font-semibold text-slate-800">{unlockedFile.patient.medical_history.lifestyle.smoking || 'N/A'}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 block">Alcohol</span>
                          <span className="font-semibold text-slate-800">{unlockedFile.patient.medical_history.lifestyle.alcohol || 'N/A'}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 block">Physical Activity</span>
                          <span className="font-semibold text-slate-800">{unlockedFile.patient.medical_history.lifestyle.physical_activity || 'N/A'}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 block">Diet</span>
                          <span className="font-semibold text-slate-800">{unlockedFile.patient.medical_history.lifestyle.diet || 'N/A'}</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-xs font-bold text-slate-700 block mb-1">Ongoing Daily Medications</span>
                        <p className="text-xs text-slate-800">{unlockedFile.patient.medical_history.current_medications || 'None recorded'}</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-xs font-bold text-slate-700 block mb-1">Registration Notes</span>
                        <p className="text-xs text-slate-800">{unlockedFile.patient.medical_history.intake_notes || 'No remarks.'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 shadow-sm">
                  No medical history questionnaire recorded for this patient.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Doctor Notes & Prescriptions */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {unlockedFile.clinical_history.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-3 shadow-sm">
                  <p>No doctor clinical notes recorded yet.</p>
                  <button
                    onClick={() => setActiveTab('addNote')}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-800 text-white shadow-sm"
                  >
                    Write First Diagnosis & Prescription
                  </button>
                </div>
              ) : (
                unlockedFile.clinical_history.map((note) => (
                  <div key={note.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-start justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{note.diagnosis || 'Clinical Diagnosis'}</h4>
                        <p className="text-xs text-slate-500">
                          Doctor: <strong>{note.doctor_name}</strong> • {new Date(note.created_at).toLocaleDateString([], { dateStyle: 'long' })}
                        </p>
                      </div>
                      {note.follow_up_date && (
                        <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 text-xs font-semibold">
                          Follow-up: {note.follow_up_date}
                        </span>
                      )}
                    </div>

                    {note.prescription && (
                      <div>
                        <p className="text-xs font-bold text-slate-700 mb-1">Prescription & Medical Advice</p>
                        <p className="text-xs text-slate-800 whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-200">
                          {note.prescription}
                        </p>
                      </div>
                    )}

                    {note.prescribed_medicines && note.prescribed_medicines.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-700 mb-1.5">Prescribed Medicines</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {note.prescribed_medicines.map((med, idx) => (
                            <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                              <span className="font-bold text-slate-900">{med.name} {med.dosage}</span>
                              <span className="text-slate-600 font-mono">{med.frequency} ({med.days} days)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {note.clinical_notes && (
                      <div>
                        <p className="text-xs font-bold text-slate-700 mb-1">Doctor Remarks</p>
                        <p className="text-xs text-slate-700">{note.clinical_notes}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: Medical Reports */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Uploaded Medical Reports & Scans</h3>
                  <p className="text-xs text-slate-500">Reports uploaded for this patient during village intake</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  {unlockedFile.reports?.length || 0} File(s)
                </span>
              </div>

              {(!unlockedFile.reports || unlockedFile.reports.length === 0) ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 shadow-sm">
                  No additional medical reports uploaded for this patient yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {unlockedFile.reports.map((rep) => (
                    <div key={rep.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                            {rep.report_type}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(rep.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 mt-2 truncate">{rep.stored_filename}</p>
                        <p className="text-[11px] text-slate-500">Uploaded by: {rep.uploaded_by_name || 'Staff'}</p>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                        <a
                          href={`/api/v1/reports/download/${rep.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download / View</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Add Diagnosis & Prescription */}
          {activeTab === 'addNote' && (
            <div className="bg-white p-5 sm:p-7 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  New Clinical Diagnosis & Prescription
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record doctor assessment and medication instructions for {unlockedFile.patient.full_name}.
                </p>
              </div>

              <form onSubmit={handleSubmitClinicalNote} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Primary Diagnosis *
                  </label>
                  <input
                    type="text"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="e.g. Mild Hypertension, Respiratory Infection..."
                    required
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                {/* Medicines List - Fully Responsive Grid (No Collapsing) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Prescribed Medicines
                    </label>
                    <button
                      type="button"
                      onClick={handleAddMedicineRow}
                      className="px-3 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Medicine</span>
                    </button>
                  </div>

                  {medicines.map((med, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-center">
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          value={med.name}
                          onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                          placeholder="Medicine Name (e.g. Paracetamol)"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                          placeholder="Dosage (500mg)"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:contents">
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            value={med.frequency}
                            onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                            placeholder="1-0-1"
                            className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 text-center focus:outline-none focus:border-teal-700"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            value={med.days}
                            onChange={(e) => handleMedicineChange(idx, 'days', e.target.value)}
                            placeholder="5 Days"
                            className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 text-center focus:outline-none focus:border-teal-700"
                          />
                        </div>
                      </div>
                      <div className="sm:col-span-1 text-right sm:text-center">
                        {medicines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicineRow(idx)}
                            className="text-xs font-bold text-rose-600 hover:text-rose-800 p-1"
                            title="Remove medicine"
                          >
                            ✕ Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Prescription & Dietary Advice
                  </label>
                  <textarea
                    rows={3}
                    value={prescription}
                    onChange={(e) => setPrescription(e.target.value)}
                    placeholder="e.g. Reduce salt intake, maintain 30 min daily walking, drink plenty of water..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confidential Clinical Notes / Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    placeholder="Clinical findings, referral notes, or differential diagnosis..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Recommended Follow-up Date
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full sm:w-60 px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
                  >
                    {loading ? 'Recording Consultation...' : 'Save Consultation & Issue Prescription'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default DoctorDashboard;
