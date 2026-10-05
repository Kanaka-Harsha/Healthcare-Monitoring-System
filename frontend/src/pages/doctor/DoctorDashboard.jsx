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
  const [activeTab, setActiveTab] = useState('vitals'); // 'vitals' | 'history' | 'notes' | 'addNote'

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
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleSubmitClinicalNote = async (e) => {
    e.preventDefault();
    if (!unlockedFile) return;

    setLoading(true);
    try {
      const payload = {
        patient_id: unlockedFile.patient.id,
        diagnosis,
        prescription,
        clinical_notes: clinicalNotes,
        prescribed_medicines: medicines.filter(m => m.name.trim() !== ''),
        follow_up_date: followUpDate
      };

      const res = await api.post('/doctor/clinical-note', payload);
      setUnlockedFile({
        ...unlockedFile,
        clinical_history: [res.data, ...unlockedFile.clinical_history]
      });

      setSuccessMsg('Clinical prescription and diagnosis saved successfully.');
      // Reset form
      setDiagnosis('');
      setPrescription('');
      setClinicalNotes('');
      setMedicines([{ name: '', dosage: '', frequency: '1-0-1', days: '5' }]);
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded bg-white border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
            SwastGrama - Doctor Portal
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Doctor Consultation & Clinical History</h1>
          <p className="text-xs text-slate-600">
            Search patient by mobile number and enter patient-approved OTP to access medical records.
          </p>
        </div>

        {unlockedFile && (
          <button
            onClick={handleResetSession}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
          >
            Close Patient File
          </button>
        )}
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
          {successMsg}
        </div>
      )}

      {/* Screen 1: Search Patient by Phone & OTP */}
      {!unlockedFile ? (
        <div className="max-w-lg mx-auto bg-white p-6 sm:p-7 rounded border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Patient File Access</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Enter the patient's mobile number. A 6-digit verification code will be sent to the patient.
            </p>
          </div>

          {!otpSent ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Patient Mobile Number
                </label>
                <input
                  type="tel"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="Enter 10-digit mobile number"
                  maxLength={10}
                  required
                  className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded bg-teal-800 hover:bg-teal-900 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="spinner-white"></span>
                    <span>Sending code via SMS...</span>
                  </>
                ) : (
                  'Request Patient Consent Code'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                <p>Verification code dispatched to: <strong>+91 {patientPhone}</strong></p>
                {maskedPatientName && <p>Patient: <strong>{maskedPatientName}</strong></p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enter 6-Digit Code (from Patient)
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  required
                  className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-center font-mono tracking-widest text-base focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-2.5 px-4 rounded bg-teal-800 hover:bg-teal-900 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isVerifying ? (
                  <>
                    <span className="spinner-white"></span>
                    <span>Verifying code...</span>
                  </>
                ) : (
                  'Verify Code & Open Medical File'
                )}
              </button>

              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="w-full text-center text-xs text-slate-600 hover:text-slate-900 underline pt-1"
              >
                Use a different mobile number
              </button>
            </form>
          )}
        </div>
      ) : (
        /* Screen 2: Unlocked Patient Medical Record File */
        <div className="space-y-6">
          
          {/* Patient Profile Card */}
          <div className="p-5 rounded bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{unlockedFile.patient.full_name}</h2>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-semibold">
                  Verified & Open
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-1">
                <span>Phone: <strong>+91 {unlockedFile.patient.phone}</strong></span>
                <span>•</span>
                <span>Aadhaar: <strong className="font-mono">{unlockedFile.patient.aadhaar_masked}</strong></span>
                <span>•</span>
                <span>Age: <strong>{unlockedFile.patient.age || 'N/A'} yrs</strong></span>
                <span>•</span>
                <span>Gender: <strong>{unlockedFile.patient.gender || 'N/A'}</strong></span>
              </div>
            </div>

            <div className="flex overflow-x-auto horizontal-scroll-touch items-center gap-1.5 pb-1 max-w-full">
              <button
                onClick={() => setActiveTab('vitals')}
                className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition touch-target ${
                  activeTab === 'vitals' ? 'bg-teal-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Vital Signs ({unlockedFile.vitals_history.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition touch-target ${
                  activeTab === 'history' ? 'bg-teal-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Medical History
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition touch-target ${
                  activeTab === 'notes' ? 'bg-teal-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Doctor Notes ({unlockedFile.clinical_history.length})
              </button>
              <button
                onClick={() => setActiveTab('addNote')}
                className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition touch-target ${
                  activeTab === 'addNote' ? 'bg-teal-800 text-white' : 'bg-teal-50 text-teal-900 border border-teal-200 hover:bg-teal-100'
                }`}
              >
                + New Diagnosis
              </button>
            </div>
          </div>

          {/* TAB 1: Vitals Timeline & Trend Charts */}
          {activeTab === 'vitals' && (
            <div className="space-y-6">
              
              {/* Latest Vitals Highlights */}
              {unlockedFile.vitals_history.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded bg-white border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-600 block">Latest Blood Pressure</span>
                    <div className="text-lg font-bold text-slate-900 mt-1">
                      {unlockedFile.vitals_history[0].systolic_bp ?? '--'} / {unlockedFile.vitals_history[0].diastolic_bp ?? '--'}
                      <span className="text-xs font-normal text-slate-500 ml-1">mmHg</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded bg-white border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-600 block">Pulse Rate</span>
                    <div className="text-lg font-bold text-slate-900 mt-1">
                      {unlockedFile.vitals_history[0].heart_rate ?? '--'}
                      <span className="text-xs font-normal text-slate-500 ml-1">BPM</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded bg-white border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-600 block">SpO2 Oxygen</span>
                    <div className="text-lg font-bold text-slate-900 mt-1">
                      {unlockedFile.vitals_history[0].spo2 ?? '--'}
                      <span className="text-xs font-normal text-slate-500 ml-1">%</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded bg-white border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-600 block">Body Temperature</span>
                    <div className="text-lg font-bold text-slate-900 mt-1">
                      {unlockedFile.vitals_history[0].temperature ?? '36.6'}
                      <span className="text-xs font-normal text-slate-500 ml-1">°C</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Vitals Trend Chart */}
              {chartData.length > 1 && (
                <div className="p-5 rounded bg-white border border-slate-200 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">Vitals History Trend</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} domain={['dataMin - 10', 'dataMax + 10']} />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', fontSize: '12px' }} />
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
              <div className="bg-white p-5 rounded border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Recorded Vital Signs Log</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Date & Time</th>
                        <th className="p-2.5">Blood Pressure</th>
                        <th className="p-2.5">Pulse Rate</th>
                        <th className="p-2.5">SpO2 Oxygen</th>
                        <th className="p-2.5">Temperature</th>
                        <th className="p-2.5">Source Device</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {unlockedFile.vitals_history.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50">
                          <td className="p-2.5 text-slate-600 font-mono">
                            {new Date(rec.recorded_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900">
                            {rec.systolic_bp ?? '--'} / {rec.diastolic_bp ?? '--'} mmHg
                          </td>
                          <td className="p-2.5 text-slate-800">{rec.heart_rate ?? '--'} BPM</td>
                          <td className="p-2.5 text-slate-800">{rec.spo2 ?? '--'}%</td>
                          <td className="p-2.5">{rec.temperature ? `${rec.temperature}°C` : '--'}</td>
                          <td className="p-2.5 text-slate-500">{rec.device_id || 'Manual Entry'}</td>
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
            <div className="space-y-5">
              {unlockedFile.patient.medical_history ? (
                <div className="space-y-5">
                  
                  {/* Past Conditions & Family Medical History */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Past Chronic Conditions */}
                    <div className="bg-white p-5 rounded border border-slate-200 shadow-sm space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 uppercase pb-2 border-b border-slate-100">
                        Past Chronic Conditions
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(unlockedFile.patient.medical_history.past_medical_issues) && unlockedFile.patient.medical_history.past_medical_issues.length > 0 ? (
                          unlockedFile.patient.medical_history.past_medical_issues.map((cond, idx) => (
                            <span key={idx} className="px-2.5 py-1 rounded bg-slate-100 text-slate-800 text-xs font-medium">
                              {cond}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">None reported.</span>
                        )}
                      </div>
                    </div>

                    {/* Family Medical History */}
                    <div className="bg-white p-5 rounded border border-slate-200 shadow-sm space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 uppercase pb-2 border-b border-slate-100">
                        Family Medical History
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(unlockedFile.patient.medical_history.family_medical_history) && unlockedFile.patient.medical_history.family_medical_history.length > 0 ? (
                          unlockedFile.patient.medical_history.family_medical_history.map((hist, idx) => (
                            <span key={idx} className="px-2.5 py-1 rounded bg-slate-100 text-slate-800 text-xs font-medium">
                              {hist}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">No family hereditary conditions reported.</span>
                        )}
                      </div>
                      {unlockedFile.patient.medical_history.family_role && (
                        <div className="pt-2 border-t border-slate-100 text-xs text-slate-600">
                          <span className="font-semibold block mb-0.5">Family Role / Living Situation:</span>
                          <span className="text-slate-800">{unlockedFile.patient.medical_history.family_role}</span>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Surgeries & Allergies */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Past Surgeries */}
                    <div className="bg-white p-5 rounded border border-slate-200 shadow-sm space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 uppercase pb-2 border-b border-slate-100">
                        Past Surgeries & Hospitalizations
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(unlockedFile.patient.medical_history.surgeries_and_hospitalizations) && unlockedFile.patient.medical_history.surgeries_and_hospitalizations.length > 0 ? (
                          unlockedFile.patient.medical_history.surgeries_and_hospitalizations.map((surg, idx) => (
                            <span key={idx} className="px-2.5 py-1 rounded bg-slate-100 text-slate-800 text-xs font-medium">
                              {surg}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">None recorded.</span>
                        )}
                      </div>
                    </div>

                    {/* Known Allergies */}
                    <div className="bg-white p-5 rounded border border-slate-200 shadow-sm space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 uppercase pb-2 border-b border-slate-100">
                        Known Drug & Food Allergies
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(unlockedFile.patient.medical_history.known_allergies) && unlockedFile.patient.medical_history.known_allergies.length > 0 ? (
                          unlockedFile.patient.medical_history.known_allergies.map((allg, idx) => (
                            <span key={idx} className="px-2.5 py-1 rounded bg-rose-50 text-rose-800 text-xs font-medium border border-rose-200">
                              {allg}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">No known allergies.</span>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Lifestyle & Medications */}
                  <div className="bg-white p-5 rounded border border-slate-200 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase pb-2 border-b border-slate-100">
                      Lifestyle Profile & Ongoing Medications
                    </h4>
                    
                    {unlockedFile.patient.medical_history.lifestyle && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 block">Tobacco / Smoking</span>
                          <span className="font-semibold text-slate-800">{unlockedFile.patient.medical_history.lifestyle.smoking || 'N/A'}</span>
                        </div>
                        <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 block">Alcohol</span>
                          <span className="font-semibold text-slate-800">{unlockedFile.patient.medical_history.lifestyle.alcohol || 'N/A'}</span>
                        </div>
                        <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 block">Physical Activity</span>
                          <span className="font-semibold text-slate-800">{unlockedFile.patient.medical_history.lifestyle.physical_activity || 'N/A'}</span>
                        </div>
                        <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 block">Diet</span>
                          <span className="font-semibold text-slate-800">{unlockedFile.patient.medical_history.lifestyle.diet || 'N/A'}</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 rounded bg-slate-50 border border-slate-200">
                        <span className="text-xs font-bold text-slate-700 block mb-1">Ongoing Daily Medications</span>
                        <p className="text-xs text-slate-800">{unlockedFile.patient.medical_history.current_medications || 'None recorded'}</p>
                      </div>
                      <div className="p-3 rounded bg-slate-50 border border-slate-200">
                        <span className="text-xs font-bold text-slate-700 block mb-1">Registration Intake Notes</span>
                        <p className="text-xs text-slate-800">{unlockedFile.patient.medical_history.intake_notes || 'No remarks.'}</p>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded border border-slate-200 text-xs text-slate-500">
                  No medical history questionnaire recorded for this patient.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Doctor Notes & Prescriptions */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {unlockedFile.clinical_history.length === 0 ? (
                <div className="p-8 text-center bg-white rounded border border-slate-200 text-xs text-slate-500 space-y-3">
                  <p>No doctor clinical notes recorded yet.</p>
                  <button
                    onClick={() => setActiveTab('addNote')}
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-teal-800 text-white"
                  >
                    Write First Diagnosis & Prescription
                  </button>
                </div>
              ) : (
                unlockedFile.clinical_history.map((note) => (
                  <div key={note.id} className="p-5 rounded bg-white border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-start justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{note.diagnosis || 'Clinical Diagnosis'}</h4>
                        <p className="text-xs text-slate-500">
                          Attending Doctor: <strong>{note.doctor_name}</strong> • {new Date(note.created_at).toLocaleDateString([], { dateStyle: 'long' })}
                        </p>
                      </div>
                      {note.follow_up_date && (
                        <span className="px-2.5 py-1 rounded bg-teal-50 text-teal-800 text-xs font-semibold">
                          Follow-up Date: {note.follow_up_date}
                        </span>
                      )}
                    </div>

                    {note.prescription && (
                      <div>
                        <p className="text-xs font-bold text-slate-700 mb-1">Prescription & Medical Advice</p>
                        <p className="text-xs text-slate-800 whitespace-pre-line bg-slate-50 p-2.5 rounded border border-slate-200">
                          {note.prescription}
                        </p>
                      </div>
                    )}

                    {note.prescribed_medicines && note.prescribed_medicines.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-700 mb-1.5">Prescribed Medicines</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {note.prescribed_medicines.map((med, idx) => (
                            <div key={idx} className="p-2 rounded bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                              <span className="font-bold text-slate-900">{med.name} {med.dosage}</span>
                              <span className="text-slate-600">{med.frequency} ({med.days} days)</span>
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

          {/* TAB 4: Add Diagnosis & Prescription */}
          {activeTab === 'addNote' && (
            <div className="bg-white p-5 sm:p-6 rounded border border-slate-200 shadow-sm space-y-4">
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Diagnosis *
                  </label>
                  <input
                    type="text"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="e.g. Mild Hypertension, Respiratory Infection..."
                    required
                    className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-sm focus:border-teal-700 focus:outline-none"
                  />
                </div>

                {/* Medicines List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Prescribed Medicines
                    </label>
                    <button
                      type="button"
                      onClick={handleAddMedicineRow}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                    >
                      + Add Medicine
                    </button>
                  </div>

                  {medicines.map((med, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={med.name}
                          onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                          placeholder="Medicine Name"
                          className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                          placeholder="Dosage (5mg)"
                          className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={med.frequency}
                          onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                          placeholder="1-0-1"
                          className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 text-xs text-slate-900 text-center focus:border-teal-700 focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={med.days}
                          onChange={(e) => handleMedicineChange(idx, 'days', e.target.value)}
                          placeholder="Days"
                          className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 text-xs text-slate-900 text-center focus:border-teal-700 focus:outline-none"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        {medicines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicineRow(idx)}
                            className="text-xs font-bold text-slate-400 hover:text-rose-700"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prescription & Dietary Advice
                  </label>
                  <textarea
                    rows={3}
                    value={prescription}
                    onChange={(e) => setPrescription(e.target.value)}
                    placeholder="e.g. Reduce salt intake, regular 30 min morning walk..."
                    className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:border-teal-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Follow-Up Date / Next Visit
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full sm:w-1/2 px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:border-teal-700 focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded bg-teal-800 hover:bg-teal-900 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-white"></span>
                        <span>Saving prescription to medical record...</span>
                      </>
                    ) : (
                      'Save & Publish Prescription to Patient File'
                    )}
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
