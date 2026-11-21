import React, { useState, useEffect } from 'react';
import api, { extractErrorMessage } from '../../services/api';
import { useSync } from '../../context/SyncContext';
import bluetoothService from '../../services/bluetoothService';
import BluetoothModal from '../../components/bluetooth/BluetoothModal';
import LiveVitalsWidget from '../../components/bluetooth/LiveVitalsWidget';
import { 
  Search, 
  UserCheck, 
  UserPlus, 
  Activity, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ChevronRight,
  Bluetooth,
  UploadCloud
} from 'lucide-react';

// ─── Step indicator ───────────────────────────────────────────────────────────
const StepBadge = ({ num, label, active, done }) => (
  <div className={`flex items-center gap-2 ${active ? 'opacity-100' : 'opacity-40'}`}>
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition ${
      done ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' :
      active ? 'bg-teal-800 border-teal-800 text-white shadow-sm' :
      'bg-white border-slate-300 text-slate-500'
    }`}>
      {done ? '✓' : num}
    </div>
    <span className="text-xs font-bold text-slate-800">{label}</span>
  </div>
);

// ─── Risk badge ────────────────────────────────────────────────────────────────
const RiskBadge = ({ risk }) => {
  const map = {
    Red: 'bg-rose-100 text-rose-800 border-rose-300',
    Orange: 'bg-amber-100 text-amber-800 border-amber-300',
    Green: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${map[risk] || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
      {risk === 'Red' ? '🔴 Critical / High' : risk === 'Orange' ? '🟠 Borderline' : '🟢 Normal'}
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
  const [searchResult, setSearchResult] = useState(null);
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
  const [heightCm, setHeightCm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastVitalsResult, setLastVitalsResult] = useState(null);

  // ── History panel ─────────────────────────────────────────────────────────────
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

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
    if (v.height_cm) setHeightCm(v.height_cm);
    notify('success', 'Readings captured from ESP32 Master into the screening form.');
  };

  // ── Step 1a: Search master patient registry ────────────────────────────────
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
      // Search master patient registry (includes all citizens registered by Volunteers)
      const res = await api.get('/collector/patient/search', {
        params: { phone: cleanPhone }
      });
      const patient = res.data;
      if (patient) {
        setSearchResult(patient);
        notify('success', `Found registered citizen: ${patient.full_name}. No need to register again!`);
      }
    } catch (err) {
      // Fallback: check history records
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
        notify('success', `Found from camp screening logs: ${foundInHistory.patient_name}.`);
      } else if (err.response?.status === 404) {
        notify('warning', `No citizen record found with mobile ${cleanPhone}. Fill the quick form below to register.`);
        setShowQuickReg(true);
        setQrPhone(cleanPhone);
      } else {
        notify('error', extractErrorMessage(err, 'Could not complete search. Please verify your connection.'));
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
    notify('success', `Selected ${patName}. Enter vitals below.`);
  };

  // ── Step 1b: Quick-register patient ────────────────────────────────────────
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
        notify('success', `${pat.full_name} registered successfully. Proceeding to vitals.`);
      } catch (err) {
        notify('error', extractErrorMessage(err, 'Could not register patient. Check form details.'));
      } finally {
        setQrRegistering(false);
      }
    } else {
      await enqueueRecord({ type: 'patient', ...payload });
      setConfirmedPatient({ id: null, phone: cleanPhone, name: qrName.trim() });
      setStep(2);
      notify('warning', 'Offline: patient saved on device and will sync when internet returns.');
      setQrRegistering(false);
    }
  };

  // ── Step 2: Submit vitals ───────────────────────────────────────────────────
  const handleSubmitVitals = async (e) => {
    e.preventDefault();
    if (!confirmedPatient) {
      notify('error', 'No patient selected. Please return to Step 1.');
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
      additional_metrics: {
        ...(heightCm ? { height_cm: parseFloat(heightCm) } : {})
      },
      device_id: liveVitals?.device_id || 'HEALTH_MASTER',
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
          notify('warning', 'Offline: vitals saved on this device. Will upload automatically when online.');
          resetVitalsForm();
        } else {
          notify('error', extractErrorMessage(err, 'Could not save vitals. Please check values.'));
        }
      } finally {
        setSubmitting(false);
      }
    } else {
      await enqueueRecord({ type: 'vitals', ...payload });
      notify('warning', 'Offline: vitals saved locally on device. Will auto-sync when online.');
      setLastVitalsResult({
        risk_level: computeLocalRisk(systolicBP, diastolicBP, spo2),
        systolic_bp: systolicBP,
        diastolic_bp: diastolicBP,
        heart_rate: heartRate,
        spo2: spo2,
      });
      resetVitalsForm();
      setSubmitting(false);
    }
  };

  const computeLocalRisk = (sys, dia, o2) => {
    const s = parseFloat(sys);
    const d = parseFloat(dia);
    const o = parseFloat(o2);
    if (s >= 160 || d >= 100 || (o && o < 90)) return 'Red';
    if (s >= 140 || d >= 90 || (o && o < 95)) return 'Orange';
    return 'Green';
  };

  const resetVitalsForm = () => {
    setSystolicBP('');
    setDiastolicBP('');
    setHeartRate('');
    setSpo2('');
    setTemperature('36.6');
    setBloodGlucose('');
    setHeightCm('');
  };

  const handleStartNew = () => {
    setConfirmedPatient(null);
    setSearchResult(null);
    setSearchPhone('');
    setShowQuickReg(false);
    setQrName('');
    setQrPhone('');
    setQrAadhaar('');
    setQrAge('');
    setLastVitalsResult(null);
    resetVitalsForm();
    setStep(1);
  };

  const filteredHistory = historyRecords.filter((r) => {
    if (!historySearch) return true;
    const s = historySearch.toLowerCase();
    return (
      (r.patient_name && r.patient_name.toLowerCase().includes(s)) ||
      (r.patient_phone && r.patient_phone.includes(s))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
      
      {/* ── Top Header Banner ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">
              Assistant/Camp Health Desk
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800">
              Field Vitals Capture
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">Village Healthcamp Screening & Vitals Intake</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Step 1: Locate citizen in master registry &nbsp;→&nbsp; Step 2: Measure and record vital signs.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsBluetoothModalOpen(true)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
              isBLEConnected
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-teal-800 hover:bg-teal-900 text-white'
            }`}
          >
            <Bluetooth className="w-3.5 h-3.5" />
            <span>{isBLEConnected ? '✓ Medical Device Connected' : 'Connect BLE Sensor'}</span>
          </button>

          {pendingCount > 0 && (
            <button
              onClick={triggerSync}
              disabled={!isOnline}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload ({pendingCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Step Progress Indicator ─────────────────────────────────────────── */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <StepBadge num={1} label="Find / Select Citizen" active={step >= 1} done={step > 1} />
        <div className="flex-1 h-0.5 bg-slate-200" />
        <StepBadge num={2} label="Record Vital Signs" active={step >= 2} done={!!lastVitalsResult} />
      </div>

      {/* ── Notifications ──────────────────────────────────────────────────── */}
      {notification && (
        <div className={`p-4 rounded-2xl text-xs font-medium border shadow-sm flex items-center justify-between ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
          notification.type === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-900' :
          'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="font-bold text-sm px-2">✕</button>
        </div>
      )}

      {/* ── Live Vitals Widget ─────────────────────────────────────────────── */}
      <LiveVitalsWidget
        vitals={liveVitals}
        isConnected={isBLEConnected}
        onApplyToForm={handleApplyLiveVitals}
        onOpenModal={() => setIsBluetoothModalOpen(true)}
      />

      {/* ── Main Two-Column Layout ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT: Wizard Step 1 or 2 (7 cols) ────────────────────────────── */}
        <div className="lg:col-span-7 space-y-5">

          {/* ════ STEP 1: Find / Register Citizen ════ */}
          {step === 1 && (
            <div className="bg-white p-5 sm:p-7 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-7 h-7 rounded-full bg-teal-800 text-white flex items-center justify-center text-xs font-bold">1</div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Locate Citizen in Master Registry</h2>
                  <p className="text-xs text-slate-500">Citizens registered by Village Volunteers will appear here automatically.</p>
                </div>
              </div>

              {/* Search Form */}
              <form onSubmit={handleSearchPatient} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Citizen Mobile Phone Number *
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex flex-1">
                      <span className="inline-flex items-center px-3 text-xs bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl text-slate-600 font-semibold">+91</span>
                      <input
                        type="tel"
                        value={searchPhone}
                        onChange={(e) => setSearchPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 10-digit mobile number"
                        maxLength={10}
                        required
                        className="w-full px-3 py-2.5 rounded-r-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={searching}
                      className="px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 flex-shrink-0 disabled:opacity-60"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>{searching ? 'Searching Registry...' : 'Find Citizen'}</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Citizen Found Card */}
              {searchResult && (
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border-2 border-emerald-400 space-y-4 shadow-sm animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 uppercase tracking-wide">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      Citizen Enrolled in Master Registry
                    </span>
                    <span className="text-[11px] font-bold text-teal-800 px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300">
                      Ready to Screen
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-base font-bold text-slate-900">{searchResult.full_name || searchResult.patient_name}</p>
                      <p className="text-xs text-slate-600 font-mono mt-0.5">📞 +91 {searchResult.phone || searchResult.patient_phone}</p>
                      {searchResult.aadhaar_masked && (
                        <p className="text-xs text-slate-500 font-mono mt-0.5">Aadhaar: {searchResult.aadhaar_masked}</p>
                      )}
                    </div>

                    <div className="space-y-1 text-slate-700">
                      {(searchResult.age || searchResult.gender) && (
                        <p className="text-xs">
                          <strong>Demographics:</strong> {searchResult.age ? `${searchResult.age} yrs` : ''} {searchResult.gender ? `• ${searchResult.gender}` : ''}
                        </p>
                      )}
                      {(searchResult.village_or_town || searchResult.district) && (
                        <p className="text-xs text-slate-600">
                          <strong>Location:</strong> {searchResult.village_or_town ? `${searchResult.village_or_town}, ` : ''}{searchResult.district || 'Andhra Pradesh'}
                        </p>
                      )}
                      {searchResult.primary_health_issue && (
                        <p className="text-xs text-teal-900 font-semibold">
                          <strong>Main Issue:</strong> {searchResult.primary_health_issue}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-emerald-900 font-medium text-center sm:text-left">
                      ✓ Citizen profile confirmed. No re-registration required.
                    </p>
                    <button
                      onClick={handleUseFoundPatient}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold shadow transition flex items-center justify-center gap-1.5 flex-shrink-0"
                    >
                      <span>Proceed to Take Vitals</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Quick registration prompt (if not in registry) */}
              {!showQuickReg && !searchResult && (
                <div className="pt-2 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={() => setShowQuickReg(true)}
                    className="text-xs font-bold text-teal-800 hover:text-teal-950 underline inline-flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Citizen not found? Quick-register new visitor</span>
                  </button>
                </div>
              )}

              {/* Quick Registration Form */}
              {showQuickReg && (
                <form onSubmit={handleQuickRegister} className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      First-Time Camp Visitor Registration
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowQuickReg(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 underline"
                    >
                      Hide form
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={qrName}
                        onChange={(e) => setQrName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        required
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                      <input
                        type="tel"
                        value={qrPhone}
                        onChange={(e) => setQrPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="10-digit mobile"
                        maxLength={10}
                        required
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Aadhaar Number (12 digits) *</label>
                    <input
                      type="text"
                      value={qrAadhaar}
                      onChange={(e) => setQrAadhaar(e.target.value.replace(/\D/g, ''))}
                      placeholder="12-digit Aadhaar Number"
                      maxLength={12}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Age in Years</label>
                      <input
                        type="number"
                        value={qrAge}
                        onChange={(e) => setQrAge(e.target.value)}
                        placeholder="e.g. 45"
                        min={0} max={120}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                      <select
                        value={qrGender}
                        onChange={(e) => setQrGender(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700 font-semibold"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                    <button
                      type="submit"
                      disabled={qrRegistering}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-sm transition disabled:opacity-60"
                    >
                      {qrRegistering ? 'Registering...' : 'Register Citizen & Proceed to Vitals →'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQuickReg(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
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
            <div className="bg-white p-5 sm:p-7 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              
              {/* Confirmed Patient Banner */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-teal-50 border border-teal-200">
                <div>
                  <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wide">Screening Patient</span>
                  <p className="text-sm font-bold text-teal-950">{confirmedPatient?.name}</p>
                  <p className="text-xs text-teal-800 font-mono">📞 +91 {confirmedPatient?.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setStep(1); setLastVitalsResult(null); }}
                  className="text-xs font-bold text-teal-800 hover:underline"
                >
                  ← Change Citizen
                </button>
              </div>

              {/* Vitals Result Card (After Save) */}
              {lastVitalsResult && (
                <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm space-y-3 ${
                  lastVitalsResult.risk_level === 'Red' ? 'bg-rose-50 border-rose-300 text-rose-950' :
                  lastVitalsResult.risk_level === 'Orange' ? 'bg-amber-50 border-amber-300 text-amber-950' :
                  'bg-emerald-50 border-emerald-300 text-emerald-950'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">Screening Risk Classification</span>
                      <div className="mt-1">
                        <RiskBadge risk={lastVitalsResult.risk_level} />
                      </div>
                      {lastVitalsResult.risk_level === 'Red' && (
                        <p className="text-xs font-bold text-rose-800 mt-2">
                          ⚠️ Critical readings detected. Refer patient immediately to the medical officer / doctor.
                        </p>
                      )}
                      {lastVitalsResult.risk_level === 'Orange' && (
                        <p className="text-xs font-semibold text-amber-800 mt-2">
                          Borderline readings. Advise repeat check or doctor consultation.
                        </p>
                      )}
                    </div>

                    <button
                      onClick={handleStartNew}
                      className="px-4 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 flex-shrink-0"
                    >
                      <span>Screen Next Citizen</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Vitals Form */}
              <form onSubmit={handleSubmitVitals} className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                    Cardiovascular & Respiratory Readings
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Systolic BP <span className="text-slate-400 font-normal">(mmHg)</span>
                      </label>
                      <input
                        type="number"
                        value={systolicBP}
                        onChange={(e) => setSystolicBP(e.target.value)}
                        placeholder="120"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Diastolic BP <span className="text-slate-400 font-normal">(mmHg)</span>
                      </label>
                      <input
                        type="number"
                        value={diastolicBP}
                        onChange={(e) => setDiastolicBP(e.target.value)}
                        placeholder="80"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Pulse Rate <span className="text-slate-400 font-normal">(BPM)</span>
                      </label>
                      <input
                        type="number"
                        value={heartRate}
                        onChange={(e) => setHeartRate(e.target.value)}
                        placeholder="72"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Oxygen SpO2 <span className="text-slate-400 font-normal">(%)</span>
                      </label>
                      <input
                        type="number"
                        value={spo2}
                        onChange={(e) => setSpo2(e.target.value)}
                        placeholder="98"
                        min={50} max={100}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                    Temperature, Height & Physical Metrics
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Body Temperature (°C)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value)}
                        placeholder="36.6"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Height <span className="text-slate-400 font-normal">(cm, from Height Slave)</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        placeholder="e.g. 165.0"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Random Blood Glucose <span className="text-slate-400 font-normal">(mg/dL)</span>
                      </label>
                      <input
                        type="number"
                        value={bloodGlucose}
                        onChange={(e) => setBloodGlucose(e.target.value)}
                        placeholder="Optional (e.g. 110)"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Reference Ranges (Responsive - No Clipping) */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-200">
                    <span className="font-bold text-emerald-800 block">🟢 Normal Range</span>
                    <span className="text-slate-600">BP: &lt; 120/80 • SpO2: ≥ 95%</span>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-200">
                    <span className="font-bold text-amber-800 block">🟠 Borderline</span>
                    <span className="text-slate-600">BP: 120-139/80-89 • SpO2: 90-94%</span>
                  </div>
                  <div className="p-2 rounded-lg bg-rose-50/60 border border-rose-200">
                    <span className="font-bold text-rose-800 block">🔴 High Risk</span>
                    <span className="text-slate-600">BP: ≥ 140/90 • SpO2: &lt; 90%</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 px-4 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {submitting ? 'Saving Readings...' : '✓ Save Vitals & Triaged Health Status'}
                  </button>
                </div>
              </form>

            </div>
          )}

        </div>

        {/* ── RIGHT: Today's Screening History (5 cols) ────────────────────── */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3.5 flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Today's Screened Citizens</h3>
              <p className="text-[11px] text-slate-500">Screenings conducted during this camp</p>
            </div>
            <button
              onClick={fetchHistory}
              disabled={!isOnline || loadingHistory}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
            >
              {loadingHistory ? 'Updating...' : 'Refresh'}
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Filter by citizen name or phone..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[500px] pr-1">
            {filteredHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                {loadingHistory ? 'Loading history...' : 'No citizen vitals recorded yet today.'}
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 cursor-pointer hover:border-teal-300 hover:bg-teal-50/50 transition"
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
                      <p className="text-[11px] text-slate-500 font-mono">📞 +91 {item.patient_phone}</p>
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
                      <span className="text-[10px] text-slate-400 block font-medium">BP</span>
                      <strong className="font-bold">{item.systolic_bp || '--'}/{item.diastolic_bp || '--'}</strong>
                    </div>
                    <div className="text-slate-700">
                      <span className="text-[10px] text-slate-400 block font-medium">Pulse</span>
                      <strong className="font-bold">{item.heart_rate || '--'} BPM</strong>
                    </div>
                    <div className="text-slate-700">
                      <span className="text-[10px] text-slate-400 block font-medium">SpO2</span>
                      <strong className="font-bold">{item.spo2 || '--'}%</strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Bluetooth modal */}
      <BluetoothModal
        isOpen={isBluetoothModalOpen}
        onClose={() => setIsBluetoothModalOpen(false)}
        onVitalsReceived={handleApplyLiveVitals}
      />

    </div>
  );
};

export default CollectorDashboard;
