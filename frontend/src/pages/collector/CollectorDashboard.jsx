import React, { useState, useEffect } from 'react';
import api, { extractErrorMessage } from '../../services/api';
import { useSync } from '../../context/SyncContext';
import bluetoothService from '../../services/bluetoothService';
import BluetoothModal from '../../components/bluetooth/BluetoothModal';
import LiveVitalsWidget from '../../components/bluetooth/LiveVitalsWidget';

// ─── Step indicator ───────────────────────────────────────────────────────────
const StepBadge = ({ num, label, active, done }) => (
  <div className={`flex items-center gap-2 ${active ? 'opacity-100' : 'opacity-40'}`}>
    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
      done ? 'bg-emerald-600 border-emerald-600 text-white' :
      active ? 'bg-teal-800 border-teal-800 text-white' :
      'bg-white border-slate-300 text-slate-500'
    }`}>
      {done ? '✓' : num}
    </div>
    <span className="text-xs font-semibold text-slate-700 hidden sm:inline">{label}</span>
  </div>
);

// ─── Risk badge ────────────────────────────────────────────────────────────────
const RiskBadge = ({ risk }) => {
  const map = {
    Red: 'bg-red-100 text-red-800 border-red-300',
    Orange: 'bg-orange-100 text-orange-800 border-orange-300',
    Green: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${map[risk] || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
      {risk === 'Red' ? '🔴 Critical' : risk === 'Orange' ? '🟠 Borderline' : '🟢 Normal'}
    </span>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const CollectorDashboard = () => {
  const { isOnline, pendingCount, triggerSync, enqueueRecord } = useSync();
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState(false);
  const [liveVitals, setLiveVitals] = useState(null);
  const [isBLEConnected, setIsBLEConnected] = useState(bluetoothService.isConnected);

  // ── Wizard step: 1 = find patient, 2 = take vitals ──────────────────────────
  const [step, setStep] = useState(1);
  const [notification, setNotification] = useState(null);

  // ── Step 1: patient search / quick register ──────────────────────────────────
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResult, setSearchResult] = useState(null); // found patient from history
  const [searching, setSearching] = useState(false);
  const [showQuickReg, setShowQuickReg] = useState(false);

  // Quick register mini-form (just basics for repeat visit / new camp registration)
  const [qrName, setQrName] = useState('');
  const [qrPhone, setQrPhone] = useState('');
  const [qrAadhaar, setQrAadhaar] = useState('');
  const [qrAge, setQrAge] = useState('');
  const [qrGender, setQrGender] = useState('Male');
  const [qrRegistering, setQrRegistering] = useState(false);

  // ── Confirmed patient (from search or quick-reg) ─────────────────────────────
  const [confirmedPatient, setConfirmedPatient] = useState(null);

  // ── Step 2: Vitals form ───────────────────────────────────────────────────────
  const [systolicBP, setSystolicBP] = useState('');
  const [diastolicBP, setDiastolicBP] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [spo2, setSpo2] = useState('');
  const [temperature, setTemperature] = useState('36.6');
  const [bloodGlucose, setBloodGlucose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastVitalsResult, setLastVitalsResult] = useState(null); // { risk_level, ... }

  // ── History panel ─────────────────────────────────────────────────────────────
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = bluetoothService.subscribe((event) => {
      if (event.status === 'connected') setIsBLEConnected(true);
      else if (event.status === 'disconnected') setIsBLEConnected(false);
      else if (event.status === 'data') setLiveVitals(event.vitals);
    });
    fetchHistory();
    return () => unsubscribe();
  }, []);

  const notify = (type, message, ms = 5000) => {
    setNotification({ type, message });
    if (ms) setTimeout(() => setNotification(null), ms);
  };

  const fetchHistory = async () => {
    if (!isOnline) return;
    setLoadingHistory(true);
    try {
      const res = await api.get('/collector/history');
      setHistoryRecords(res.data || []);
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleApplyLiveVitals = (v) => {
    if (v.systolic_bp) setSystolicBP(v.systolic_bp);
    if (v.diastolic_bp) setDiastolicBP(v.diastolic_bp);
    if (v.heart_rate) setHeartRate(v.heart_rate);
    if (v.spo2) setSpo2(v.spo2);
    if (v.temperature) setTemperature(v.temperature);
    if (v.blood_glucose) setBloodGlucose(v.blood_glucose);
    notify('success', 'Device readings filled into the vitals form.');
  };

  // ── Step 1a: Search master patient registry (Volunteer entries included) ───
  const handleSearchPatient = async (e) => {
    e.preventDefault();
    const cleanPhone = searchPhone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length < 10) {
      notify('error', 'Please enter a valid 10-digit mobile number to search.');
      return;
    }
    setSearching(true);
    setSearchResult(null);
    setShowQuickReg(false);
    try {
      // 1. First search master patient registry (includes all citizens registered by Volunteers)
      const res = await api.get('/collector/patient/search', {
        params: { phone: cleanPhone }
      });
      const patient = res.data;
      if (patient) {
        setSearchResult(patient);
        notify('success', `Found registered citizen: ${patient.full_name}. No need to register again!`);
      }
    } catch (err) {
      // 2. Fallback: check if they exist in history records
      const foundInHistory = historyRecords.find(r => (r.patient_phone || '').includes(cleanPhone));
      if (foundInHistory) {
        setSearchResult({
          id: foundInHistory.patient_id,
          full_name: foundInHistory.patient_name,
          phone: foundInHistory.patient_phone,
          aadhaar_masked: foundInHistory.patient_aadhaar_masked,
          systolic_bp: foundInHistory.systolic_bp,
          diastolic_bp: foundInHistory.diastolic_bp,
          spo2: foundInHistory.spo2
        });
        notify('success', `Found from camp records: ${foundInHistory.patient_name}.`);
      } else if (err.response?.status === 404) {
        notify('warning', `No registered citizen found with mobile number ${cleanPhone}. If this is their first camp visit, register them below.`);
        setShowQuickReg(true);
        setQrPhone(cleanPhone);
      } else {
        notify('error', extractErrorMessage(err, 'Could not complete search. Please check your connection.'));
      }
    } finally {
      setSearching(false);
    }
  };

  const handleUseFoundPatient = () => {
    const patId = searchResult.id || searchResult.patient_id || null;
    const patPhone = searchResult.phone || searchResult.patient_phone;
    const patName = searchResult.full_name || searchResult.patient_name;

    setConfirmedPatient({
      id: patId,
      phone: patPhone,
      name: patName,
    });
    setStep(2);
    notify('success', `Ready to record vitals for ${patName}.`);
  };

  // ── Step 1b: Quick-register patient (then proceed to vitals) ────────────────
  const handleQuickRegister = async (e) => {
    e.preventDefault();
    const cleanPhone = qrPhone.replace(/\D/g, '').slice(-10);
    const cleanAadhaar = qrAadhaar.replace(/\D/g, '');

    if (!qrName.trim()) { notify('error', 'Patient full name is required.'); return; }
    if (cleanPhone.length < 10) { notify('error', 'Enter a valid 10-digit mobile number.'); return; }
    if (cleanAadhaar.length !== 12) { notify('error', 'Aadhaar number must be exactly 12 digits.'); return; }

    const payload = {
      full_name: qrName.trim(),
      phone: cleanPhone,
      aadhaar_number: cleanAadhaar,
      age: qrAge ? parseInt(qrAge) : null,
      gender: qrGender,
    };

    setQrRegistering(true);
    if (isOnline) {
      try {
        const res = await api.post('/collector/patient', payload);
        const pat = res.data;
        setConfirmedPatient({ id: pat.id, phone: pat.phone, name: pat.full_name });
        setStep(2);
        fetchHistory();
        notify('success', `${pat.full_name} registered. Now record their vitals.`);
      } catch (err) {
        notify('error', extractErrorMessage(err, 'Could not register patient. Please check the form.'));
      } finally {
        setQrRegistering(false);
      }
    } else {
      // Offline: save registration to sync queue, still allow vitals entry
      await enqueueRecord({ type: 'patient', ...payload });
      setConfirmedPatient({ id: null, phone: cleanPhone, name: qrName.trim() });
      setStep(2);
      notify('warning', 'No internet — patient info saved on this device and will sync when connected.');
      setQrRegistering(false);
    }
  };

  // ── Step 2: Submit vitals ───────────────────────────────────────────────────
  const handleSubmitVitals = async (e) => {
    e.preventDefault();
    if (!confirmedPatient) {
      notify('error', 'No patient selected. Please go back to Step 1.');
      return;
    }

    const payload = {
      patient_id: confirmedPatient.id || undefined,
      patient_phone: confirmedPatient.phone,
      systolic_bp: systolicBP ? parseFloat(systolicBP) : null,
      diastolic_bp: diastolicBP ? parseFloat(diastolicBP) : null,
      heart_rate: heartRate ? parseInt(heartRate) : null,
      spo2: spo2 ? parseFloat(spo2) : null,
      temperature: temperature ? parseFloat(temperature) : null,
      blood_glucose: bloodGlucose ? parseFloat(bloodGlucose) : null,
      device_id: liveVitals?.device_id || 'MANUAL-COLLECTOR',
      recorded_at: new Date().toISOString(),
    };

    setSubmitting(true);
    if (isOnline) {
      try {
        const res = await api.post('/collector/vitals', payload);
        setLastVitalsResult(res.data);
        fetchHistory();
        resetVitalsForm();
      } catch (err) {
        if (!err.response || err.message === 'Network Error' || err.code === 'ECONNABORTED') {
          await enqueueRecord({ type: 'vitals', ...payload });
          notify('warning', 'No connection — vitals saved on this device and will upload automatically when online.');
          resetVitalsForm();
        } else {
          notify('error', extractErrorMessage(err, 'Could not save vitals. Please check form.'));
        }
      } finally {
        setSubmitting(false);
      }
    } else {
      await enqueueRecord({ type: 'vitals', ...payload });
      notify('warning', 'Saved on this device. Will upload when connected.');
      resetVitalsForm();
      setSubmitting(false);
    }
  };

  const resetVitalsForm = () => {
    setSystolicBP(''); setDiastolicBP(''); setHeartRate('');
    setSpo2(''); setTemperature('36.6'); setBloodGlucose('');
  };

  const handleStartNew = () => {
    setStep(1);
    setSearchPhone('');
    setSearchResult(null);
    setShowQuickReg(false);
    setConfirmedPatient(null);
    setLastVitalsResult(null);
    setQrName(''); setQrPhone(''); setQrAadhaar('');
    setQrAge(''); setQrGender('Male');
    resetVitalsForm();
    setNotification(null);
  };

  const filteredHistory = historyRecords.filter((r) =>
    (r.patient_name || '').toLowerCase().includes(historySearch.toLowerCase()) ||
    (r.patient_phone || '').includes(historySearch)
  );

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* ── Top Banner ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
            SwasthGrama — Assistant/Camp Screening Station
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Record Patient Vitals</h1>
          <p className="text-xs text-slate-600">
            Step 1: Find or register the patient &nbsp;→&nbsp; Step 2: Enter their health readings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsBluetoothModalOpen(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm ${
              isBLEConnected
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-teal-800 hover:bg-teal-900 text-white'
            }`}
          >
            {isBLEConnected ? '✓ Device Connected' : 'Connect Medical Device'}
          </button>

          {pendingCount > 0 && (
            <button
              onClick={triggerSync}
              disabled={!isOnline}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition"
            >
              Upload {pendingCount} Saved Record{pendingCount > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {/* ── Step Progress Indicator ─────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-1">
        <StepBadge num={1} label="Find / Register Patient" active={step >= 1} done={step > 1} />
        <div className="flex-1 h-px bg-slate-200" />
        <StepBadge num={2} label="Record Vital Signs" active={step >= 2} done={!!lastVitalsResult} />
      </div>

      {/* ── Notifications ──────────────────────────────────────────────────── */}
      {notification && (
        <div className={`p-3.5 rounded-xl text-sm font-medium border shadow-sm ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
          notification.type === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-900' :
          'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          {notification.message}
        </div>
      )}

      {/* ── Live Vitals Widget ─────────────────────────────────────────────── */}
      <LiveVitalsWidget
        vitals={liveVitals}
        isConnected={isBLEConnected}
        onApplyToForm={handleApplyLiveVitals}
        onOpenModal={() => setIsBluetoothModalOpen(true)}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN GRID: Left = Wizard  |  Right = History
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT: Wizard ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-7 space-y-5">

          {/* ════ STEP 1: Find / Register Patient ════ */}
          {step === 1 && (
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="w-6 h-6 rounded-full bg-teal-800 text-white flex items-center justify-center text-xs font-bold">1</div>
                <h2 className="text-sm font-bold text-slate-900">Find the Patient</h2>
              </div>

              {/* Search by phone */}
              <form onSubmit={handleSearchPatient} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Patient's Mobile Number *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={searchPhone}
                      onChange={(e) => setSearchPhone(e.target.value)}
                      placeholder="Enter 10-digit mobile number"
                      maxLength={10}
                      className="flex-1 px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:border-teal-700 focus:outline-none shadow-sm"
                    />
                    <button
                      type="submit"
                      disabled={searching}
                      className="px-4 py-2 rounded-lg bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold transition disabled:opacity-60 shadow-sm"
                    >
                      {searching ? 'Searching...' : 'Find Patient'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enter the citizen's mobile number. Citizens registered by village volunteers will be located immediately.
                  </p>
                </div>
              </form>

              {/* Found patient card */}
              {searchResult && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 uppercase tracking-wide">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                      ✓ Citizen Found in Master Village Registry
                    </span>
                    <span className="text-[11px] font-semibold text-teal-800 px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200">
                      Already Enrolled
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-base font-bold text-slate-900">{searchResult.full_name || searchResult.patient_name}</p>
                      <p className="text-xs text-slate-600 font-mono mt-0.5">📞 +91 {searchResult.phone || searchResult.patient_phone}</p>
                      {searchResult.aadhaar_masked && (
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">Aadhaar: {searchResult.aadhaar_masked}</p>
                      )}
                    </div>

                    <div className="space-y-1 text-slate-700">
                      {(searchResult.age || searchResult.gender) && (
                        <p className="text-xs font-medium">
                          <strong>Demographics:</strong> {searchResult.age ? `${searchResult.age} yrs` : ''} {searchResult.gender ? `• ${searchResult.gender}` : ''}
                        </p>
                      )}
                      {(searchResult.village_or_town || searchResult.district) && (
                        <p className="text-xs text-slate-600">
                          <strong>Location:</strong> {searchResult.village_or_town ? `${searchResult.village_or_town}, ` : ''}{searchResult.district || 'Andhra Pradesh'}
                        </p>
                      )}
                      {searchResult.primary_health_issue && (
                        <p className="text-xs text-teal-900 font-medium">
                          <strong>Health Complaint:</strong> {searchResult.primary_health_issue}
                        </p>
                      )}
                    </div>
                  </div>

                  {searchResult.systolic_bp && (
                    <div className="text-[11px] text-slate-600 bg-white/70 p-2 rounded-lg border border-emerald-100">
                      <strong>Previous Camp Vitals:</strong> BP {searchResult.systolic_bp}/{searchResult.diastolic_bp} mmHg &nbsp;•&nbsp; Pulse: {searchResult.heart_rate || '--'} BPM &nbsp;•&nbsp; SpO₂: {searchResult.spo2}%
                    </div>
                  )}

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-emerald-200">
                    <p className="text-[11px] text-emerald-800 font-medium">
                      ✓ Registered citizen. No need to re-register:
                    </p>
                    <button
                      onClick={handleUseFoundPatient}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold shadow transition flex items-center justify-center gap-1.5"
                    >
                      <span>Select Patient & Record Vitals</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Quick registration (collapsed unless needed) */}
              {!showQuickReg && !searchResult && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowQuickReg(true)}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900 underline"
                  >
                    + Register a new patient (first-time visitor)
                  </button>
                </div>
              )}

              {showQuickReg && (
                <form onSubmit={handleQuickRegister} className="space-y-4 pt-3 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Register New Patient</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={qrName}
                        onChange={(e) => setQrName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        required
                        className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-sm focus:border-teal-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
                      <input
                        type="tel"
                        value={qrPhone}
                        onChange={(e) => setQrPhone(e.target.value)}
                        placeholder="10-digit mobile"
                        maxLength={10}
                        required
                        className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-sm focus:border-teal-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Aadhaar Number (12 digits) *</label>
                    <input
                      type="text"
                      value={qrAadhaar}
                      onChange={(e) => setQrAadhaar(e.target.value)}
                      placeholder="12-digit Aadhaar"
                      maxLength={14}
                      required
                      className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-sm font-mono focus:border-teal-700 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Stored securely — only last 4 digits shown anywhere.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Age</label>
                      <input
                        type="number"
                        value={qrAge}
                        onChange={(e) => setQrAge(e.target.value)}
                        placeholder="e.g. 45"
                        min={0} max={120}
                        className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-sm focus:border-teal-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                      <select
                        value={qrGender}
                        onChange={(e) => setQrGender(e.target.value)}
                        className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-sm focus:border-teal-700 focus:outline-none"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 bg-blue-50 border border-blue-200 rounded p-2">
                    ℹ️ The patient's phone number becomes their login username. Their default PIN will be the last 4 digits of their mobile number. Full address details can be filled in at the registration desk.
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={qrRegistering}
                      className="flex-1 py-2.5 rounded bg-teal-800 hover:bg-teal-900 text-white font-semibold text-sm transition disabled:opacity-60"
                    >
                      {qrRegistering ? 'Registering...' : 'Register & Continue to Vitals →'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowQuickReg(false); setQrName(''); setQrPhone(searchPhone); setQrAadhaar(''); }}
                      className="px-3 py-2.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ════ STEP 2: Vitals Form ════ */}
          {step === 2 && (
            <div className="bg-white p-5 sm:p-6 rounded border border-slate-200 shadow-sm space-y-5">

              {/* Patient confirmation bar */}
              <div className="flex items-center justify-between p-3 rounded bg-teal-50 border border-teal-200">
                <div>
                  <p className="text-xs text-teal-700 font-semibold uppercase tracking-wide">Recording vitals for</p>
                  <p className="text-sm font-bold text-teal-900">{confirmedPatient?.name}</p>
                  <p className="text-xs text-teal-600">📞 +91 {confirmedPatient?.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setStep(1); setLastVitalsResult(null); }}
                  className="text-xs text-teal-700 hover:text-teal-900 underline font-semibold"
                >
                  ← Change Patient
                </button>
              </div>

              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-6 h-6 rounded-full bg-teal-800 text-white flex items-center justify-center text-xs font-bold">2</div>
                <h2 className="text-sm font-bold text-slate-900">Record Vital Signs</h2>
                {isBLEConnected && <span className="text-xs text-teal-700 font-semibold ml-auto">Device Paired ✓</span>}
              </div>

              {/* Vitals result card */}
              {lastVitalsResult && (
                <div className={`p-4 rounded border ${
                  lastVitalsResult.risk_level === 'Red' ? 'bg-red-50 border-red-300' :
                  lastVitalsResult.risk_level === 'Orange' ? 'bg-orange-50 border-orange-300' :
                  'bg-emerald-50 border-emerald-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-700 uppercase">Vitals Saved — Health Status</p>
                      <RiskBadge risk={lastVitalsResult.risk_level} />
                      {lastVitalsResult.risk_level === 'Red' && (
                        <p className="text-xs text-red-700 mt-1 font-semibold">⚠️ This patient needs immediate doctor attention.</p>
                      )}
                      {lastVitalsResult.risk_level === 'Orange' && (
                        <p className="text-xs text-orange-700 mt-1">This patient has borderline readings — refer to doctor.</p>
                      )}
                    </div>
                    <button
                      onClick={handleStartNew}
                      className="ml-4 px-4 py-2 rounded bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold"
                    >
                      Next Patient →
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmitVitals} className="space-y-4">
                {/* BP & Heart Rate */}
                <div>
                  <h3 className="text-xs font-bold text-slate-600 uppercase mb-2">Blood Pressure & Pulse</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Systolic BP <span className="text-slate-400 font-normal">(mmHg)</span></label>
                      <input
                        type="number"
                        value={systolicBP}
                        onChange={(e) => setSystolicBP(e.target.value)}
                        placeholder="120"
                        className="w-full px-2.5 py-2 rounded bg-white border border-slate-300 text-slate-900 font-mono text-sm focus:border-teal-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Diastolic BP <span className="text-slate-400 font-normal">(mmHg)</span></label>
                      <input
                        type="number"
                        value={diastolicBP}
                        onChange={(e) => setDiastolicBP(e.target.value)}
                        placeholder="80"
                        className="w-full px-2.5 py-2 rounded bg-white border border-slate-300 text-slate-900 font-mono text-sm focus:border-teal-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Pulse Rate <span className="text-slate-400 font-normal">(BPM)</span></label>
                      <input
                        type="number"
                        value={heartRate}
                        onChange={(e) => setHeartRate(e.target.value)}
                        placeholder="72"
                        className="w-full px-2.5 py-2 rounded bg-white border border-slate-300 text-slate-900 font-mono text-sm focus:border-teal-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Oxygen Level <span className="text-slate-400 font-normal">(SpO₂ %)</span></label>
                      <input
                        type="number"
                        step="0.1"
                        value={spo2}
                        onChange={(e) => setSpo2(e.target.value)}
                        placeholder="98"
                        className="w-full px-2.5 py-2 rounded bg-white border border-slate-300 text-slate-900 font-mono text-sm focus:border-teal-700 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Temperature & Glucose */}
                <div>
                  <h3 className="text-xs font-bold text-slate-600 uppercase mb-2">Temperature & Blood Sugar</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Body Temperature <span className="text-slate-400 font-normal">(°C)</span></label>
                      <input
                        type="number"
                        step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value)}
                        placeholder="36.6"
                        className="w-full px-2.5 py-2 rounded bg-white border border-slate-300 text-slate-900 font-mono text-sm focus:border-teal-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Sugar <span className="text-slate-400 font-normal">(mg/dL, optional)</span></label>
                      <input
                        type="number"
                        step="0.1"
                        value={bloodGlucose}
                        onChange={(e) => setBloodGlucose(e.target.value)}
                        placeholder="e.g. 110"
                        className="w-full px-2.5 py-2 rounded bg-white border border-slate-300 text-slate-900 font-mono text-sm focus:border-teal-700 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Reference guide */}
                <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded p-3 grid grid-cols-3 gap-2">
                  <div>
                    <span className="font-bold text-emerald-700">🟢 Normal BP:</span> Below 120/80
                  </div>
                  <div>
                    <span className="font-bold text-orange-600">🟠 Borderline:</span> 120–139 / 80–89
                  </div>
                  <div>
                    <span className="font-bold text-red-600">🔴 High BP:</span> 140/90 or above
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded bg-teal-800 hover:bg-teal-900 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {submitting
                    ? 'Saving readings...'
                    : isOnline
                    ? '✓ Save Vitals & Get Health Status'
                    : 'Save on This Device (No Internet)'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ── RIGHT: History Panel ─────────────────────────────────────────── */}
        <div className="lg:col-span-5 bg-white p-5 rounded border border-slate-200 shadow-sm space-y-3 flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Today's Screened Patients</h3>
            <button
              onClick={fetchHistory}
              disabled={!isOnline || loadingHistory}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
            >
              {loadingHistory ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <input
            type="text"
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
          />

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[460px] pr-1">
            {filteredHistory.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                {loadingHistory ? 'Loading...' : 'No patients screened yet today.'}
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1.5 cursor-pointer hover:border-teal-300 hover:bg-teal-50 transition"
                  onClick={() => {
                    setSearchPhone(item.patient_phone);
                    setSearchResult(item);
                    setShowQuickReg(false);
                    setStep(1);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{item.patient_name}</h4>
                      <p className="text-[11px] text-slate-500">📞 +91 {item.patient_phone}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {item.risk_level && <RiskBadge risk={item.risk_level} />}
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200 text-[11px]">
                    <div className="text-slate-700">
                      <span className="text-[10px] text-slate-500 block">BP</span>
                      <strong>{item.systolic_bp || '--'}/{item.diastolic_bp || '--'}</strong>
                    </div>
                    <div className="text-slate-700">
                      <span className="text-[10px] text-slate-500 block">Pulse</span>
                      <strong>{item.heart_rate || '--'} BPM</strong>
                    </div>
                    <div className="text-slate-700">
                      <span className="text-[10px] text-slate-500 block">SpO₂</span>
                      <strong>{item.spo2 || '--'}%</strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── Bluetooth Modal ─────────────────────────────────────────────────── */}
      <BluetoothModal
        isOpen={isBluetoothModalOpen}
        onClose={() => setIsBluetoothModalOpen(false)}
        onVitalsReceived={setLiveVitals}
      />

    </div>
  );
};

export default CollectorDashboard;
