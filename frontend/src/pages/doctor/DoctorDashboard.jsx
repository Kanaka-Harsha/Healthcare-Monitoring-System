import React, { useState } from 'react';
import api from '../../services/api';
import { 
  Stethoscope, 
  Search, 
  KeyRound, 
  ShieldCheck, 
  Activity, 
  Heart, 
  Wind, 
  FileText, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Calendar, 
  Clock, 
  Send,
  Pill,
  TrendingUp,
  X
} from 'lucide-react';
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
  const [devOtpHint, setDevOtpHint] = useState('');
  
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
  const [activeTab, setActiveTab] = useState('vitals'); // 'vitals' | 'notes' | 'addNote'

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
        if (res.data.dev_otp) {
          setDevOtpHint(res.data.dev_otp);
          setOtpCode(res.data.dev_otp); // Auto-fill in dev mode
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Patient not found or failed to dispatch OTP.');
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
      setErrorMsg(err.response?.data?.detail || 'Invalid or expired OTP.');
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

      setSuccessMsg('Clinical prescription and diagnosis saved successfully!');
      // Reset form
      setDiagnosis('');
      setPrescription('');
      setClinicalNotes('');
      setMedicines([{ name: '', dosage: '', frequency: '1-0-1', days: '5' }]);
      setActiveTab('notes');
    } catch (err) {
      setErrorMsg('Failed to save clinical note: ' + (err.response?.data?.detail || err.message));
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
    time: new Date(v.recorded_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    systolic: v.systolic_bp,
    diastolic: v.diastolic_bp,
    heartRate: v.heart_rate,
    spo2: v.spo2
  })) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl glass-panel border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Clinical Doctor Portal</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold">
              OTP Consent Access
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Secure, patient-consented access to electronic vitals history, telemetry trends, and prescriptions.
          </p>
        </div>

        {unlockedFile && (
          <button
            onClick={handleResetSession}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1.5"
          >
            <X className="w-4 h-4" /> Close Patient File
          </button>
        )}
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-start gap-2.5 text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Screen 1: If No Patient Unlocked, Show Phone & OTP Search Box */}
      {!unlockedFile ? (
        <div className="max-w-xl mx-auto glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10">
              <Stethoscope className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Patient Record Access</h2>
            <p className="text-xs text-slate-400">
              Enter the patient's phone number. The patient will receive a 6-digit OTP to authorize access.
            </p>
          </div>

          {!otpSent ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Patient Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-400 hover:to-teal-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Sending OTP to Patient...' : 'Request Patient Consent OTP'}
                <KeyRound className="w-4 h-4 stroke-[2.5]" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1">
                <p>Consent OTP dispatched to: <strong>+91 {patientPhone}</strong></p>
                {maskedPatientName && <p>Patient: <strong>{maskedPatientName}</strong></p>}
                {devOtpHint && (
                  <p className="font-mono text-emerald-400 pt-1">
                    Dev Test OTP: <strong>{devOtpHint}</strong>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Enter 6-Digit Consent Code (from Patient)
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-center font-mono tracking-[0.4em] text-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-400 hover:to-teal-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isVerifying ? 'Verifying & Decrypting...' : 'Verify OTP & Open Medical File'}
                <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="w-full text-center text-xs text-slate-400 hover:text-white transition pt-2"
              >
                Change phone number
              </button>
            </form>
          )}
        </div>
      ) : (
        /* Screen 2: Unlocked Patient Medical Record File */
        <div className="space-y-8">
          
          {/* Patient Profile Card */}
          <div className="p-6 rounded-3xl glass-panel border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg">
                {unlockedFile.patient.full_name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">{unlockedFile.patient.full_name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> OTP Verified
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>Phone: <strong className="text-slate-200">{unlockedFile.patient.phone}</strong></span>
                  <span>•</span>
                  <span>Aadhaar: <strong className="text-slate-200 font-mono">{unlockedFile.patient.aadhaar_masked}</strong></span>
                  <span>•</span>
                  <span>Age: <strong className="text-slate-200">{unlockedFile.patient.age || 'N/A'}</strong></span>
                  <span>•</span>
                  <span>Gender: <strong className="text-slate-200">{unlockedFile.patient.gender || 'N/A'}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('vitals')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'vitals' ? 'bg-blue-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" /> Vitals & Trends ({unlockedFile.vitals_history.length})
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'notes' ? 'bg-blue-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Notes ({unlockedFile.clinical_history.length})
              </button>
              <button
                onClick={() => setActiveTab('addNote')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'addNote' ? 'bg-teal-400 text-slate-950' : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> New Diagnosis
              </button>
            </div>
          </div>

          {/* TAB 1: Vitals Timeline & Trend Charts */}
          {activeTab === 'vitals' && (
            <div className="space-y-6">
              
              {/* Latest Vitals Highlights */}
              {unlockedFile.vitals_history.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* BP */}
                  <div className="p-4 rounded-2xl glass-card border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                      <span>Latest Blood Pressure</span>
                      <Activity className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="text-2xl font-extrabold text-white">
                      {unlockedFile.vitals_history[0].systolic_bp ?? '--'} / {unlockedFile.vitals_history[0].diastolic_bp ?? '--'}
                      <span className="text-xs font-normal text-slate-400 ml-1">mmHg</span>
                    </div>
                  </div>

                  {/* Heart Rate */}
                  <div className="p-4 rounded-2xl glass-card border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                      <span>Heart Rate</span>
                      <Heart className="w-4 h-4 text-rose-400" />
                    </div>
                    <div className="text-2xl font-extrabold text-white">
                      {unlockedFile.vitals_history[0].heart_rate ?? '--'}
                      <span className="text-xs font-normal text-slate-400 ml-1">BPM</span>
                    </div>
                  </div>

                  {/* SpO2 */}
                  <div className="p-4 rounded-2xl glass-card border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                      <span>SpO2 Oxygen</span>
                      <Wind className="w-4 h-4 text-teal-400" />
                    </div>
                    <div className="text-2xl font-extrabold text-white">
                      {unlockedFile.vitals_history[0].spo2 ?? '--'}
                      <span className="text-xs font-normal text-slate-400 ml-1">%</span>
                    </div>
                  </div>

                  {/* Temperature */}
                  <div className="p-4 rounded-2xl glass-card border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                      <span>Temperature</span>
                      <Activity className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-2xl font-extrabold text-white">
                      {unlockedFile.vitals_history[0].temperature ?? '36.6'}
                      <span className="text-xs font-normal text-slate-400 ml-1">°C</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Vitals Trend Chart */}
              {chartData.length > 1 && (
                <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-teal-400" />
                      <h3 className="text-base font-bold text-white">Vitals Trend Analysis</h3>
                    </div>
                    <span className="text-xs text-slate-400">Chronological Telemetry</span>
                  </div>

                  <div className="h-72 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} domain={['dataMin - 10', 'dataMax + 10']} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                        <Legend />
                        <Line type="monotone" dataKey="systolic" name="Systolic BP (mmHg)" stroke="#38bdf8" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="diastolic" name="Diastolic BP (mmHg)" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="heartRate" name="Heart Rate (BPM)" stroke="#f43f5e" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="spo2" name="SpO2 (%)" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Vitals History Table */}
              <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
                <h3 className="text-base font-bold text-white">Screening Records Log</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px]">
                      <tr>
                        <th className="p-3">Recorded At</th>
                        <th className="p-3">Systolic / Diastolic</th>
                        <th className="p-3">Heart Rate</th>
                        <th className="p-3">SpO2</th>
                        <th className="p-3">Temp / Glucose</th>
                        <th className="p-3">Device / Node</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {unlockedFile.vitals_history.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-900/50 transition">
                          <td className="p-3 font-mono text-slate-400">
                            {new Date(rec.recorded_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                          <td className="p-3 font-bold text-white">
                            {rec.systolic_bp ?? '--'} / {rec.diastolic_bp ?? '--'} mmHg
                          </td>
                          <td className="p-3 font-bold text-rose-400">{rec.heart_rate ?? '--'} BPM</td>
                          <td className="p-3 font-bold text-teal-400">{rec.spo2 ?? '--'}%</td>
                          <td className="p-3">{rec.temperature ? `${rec.temperature}°C` : '--'}</td>
                          <td className="p-3 text-[11px] text-slate-400">{rec.device_id || 'ESP32'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: Clinical History & Prescriptions */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {unlockedFile.clinical_history.length === 0 ? (
                <div className="p-12 text-center rounded-3xl glass-panel border border-slate-800 space-y-3">
                  <FileText className="w-10 h-10 text-slate-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">No clinical notes recorded yet.</p>
                  <button
                    onClick={() => setActiveTab('addNote')}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-500 text-slate-950 hover:bg-teal-400 transition"
                  >
                    Write First Diagnosis & Prescription
                  </button>
                </div>
              ) : (
                unlockedFile.clinical_history.map((note) => (
                  <div key={note.id} className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
                    <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                      <div>
                        <h4 className="text-base font-bold text-white">{note.diagnosis || 'Clinical Assessment'}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Prescribed by <strong className="text-slate-200">{note.doctor_name}</strong> on {new Date(note.created_at).toLocaleDateString([], { dateStyle: 'long' })}
                        </p>
                      </div>
                      {note.follow_up_date && (
                        <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold">
                          Follow-up: {note.follow_up_date}
                        </span>
                      )}
                    </div>

                    {note.prescription && (
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400 mb-1">Prescription / Instructions</p>
                        <p className="text-sm text-slate-200 whitespace-pre-line bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                          {note.prescription}
                        </p>
                      </div>
                    )}

                    {note.prescribed_medicines && note.prescribed_medicines.length > 0 && (
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400 mb-2">Prescribed Medicines</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {note.prescribed_medicines.map((med, idx) => (
                            <div key={idx} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between">
                              <span className="font-bold text-teal-300 flex items-center gap-1.5">
                                <Pill className="w-3.5 h-3.5" /> {med.name} {med.dosage}
                              </span>
                              <span className="text-slate-400">{med.frequency} ({med.days} days)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {note.clinical_notes && (
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400 mb-1">Doctor Advice / Notes</p>
                        <p className="text-xs text-slate-300">{note.clinical_notes}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: Add Diagnosis & Prescription */}
          {activeTab === 'addNote' && (
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
              <div className="pb-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white">Create Clinical Diagnosis & Prescription</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Record your evaluation and medicine regimen for {unlockedFile.patient.full_name}.
                </p>
              </div>

              <form onSubmit={handleSubmitClinicalNote} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Primary Diagnosis / Clinical Findings *
                  </label>
                  <input
                    type="text"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="e.g. Mild Hypertension, Stage 1 / Bronchitis"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>

                {/* Medicines List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Prescribed Medicines
                    </label>
                    <button
                      type="button"
                      onClick={handleAddMedicineRow}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-teal-400 font-medium transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Medicine
                    </button>
                  </div>

                  {medicines.map((med, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={med.name}
                          onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                          placeholder="Medicine Name (e.g. Amlodipine)"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-teal-500 focus:outline-none"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                          placeholder="Dosage (5mg)"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-teal-500 focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={med.frequency}
                          onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                          placeholder="1-0-1"
                          className="w-full px-2 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white text-center focus:border-teal-500 focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={med.days}
                          onChange={(e) => handleMedicineChange(idx, 'days', e.target.value)}
                          placeholder="Days (e.g. 7)"
                          className="w-full px-2 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white text-center focus:border-teal-500 focus:outline-none"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        {medicines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicineRow(idx)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Prescription & Dietary Advice
                  </label>
                  <textarea
                    rows={3}
                    value={prescription}
                    onChange={(e) => setPrescription(e.target.value)}
                    placeholder="e.g. Reduce daily sodium intake, regular 30m morning walk, monitor BP bi-weekly..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Follow-Up Date / Next Visit
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full sm:w-1/2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-extrabold text-sm transition shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4 stroke-[2.5]" />
                    {loading ? 'Saving Clinical File...' : 'Save & Publish Prescription to Patient File'}
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
