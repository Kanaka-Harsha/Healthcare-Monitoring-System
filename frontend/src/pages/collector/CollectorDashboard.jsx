import React, { useState, useEffect } from 'react';
import api, { extractErrorMessage } from '../../services/api';
import { useSync } from '../../context/SyncContext';
import bluetoothService from '../../services/bluetoothService';
import BluetoothModal from '../../components/bluetooth/BluetoothModal';
import LiveVitalsWidget from '../../components/bluetooth/LiveVitalsWidget';

const CollectorDashboard = () => {
  const { isOnline, pendingCount, triggerSync, enqueueRecord } = useSync();
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState(false);
  const [liveVitals, setLiveVitals] = useState(null);
  const [isBLEConnected, setIsBLEConnected] = useState(bluetoothService.isConnected);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');

  // Vitals Form Inputs
  const [systolicBP, setSystolicBP] = useState('');
  const [diastolicBP, setDiastolicBP] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [spo2, setSpo2] = useState('');
  const [temperature, setTemperature] = useState('36.6');
  const [bloodGlucose, setBloodGlucose] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // Listen to BLE data
  useEffect(() => {
    const unsubscribe = bluetoothService.subscribe((event) => {
      if (event.status === 'connected') {
        setIsBLEConnected(true);
      } else if (event.status === 'disconnected') {
        setIsBLEConnected(false);
      } else if (event.status === 'data') {
        setLiveVitals(event.vitals);
      }
    });

    fetchHistory();
    return () => unsubscribe();
  }, []);

  const fetchHistory = async () => {
    if (!isOnline) return;
    setLoadingHistory(true);
    try {
      const res = await api.get('/collector/history');
      setHistoryRecords(res.data || []);
    } catch (err) {
      console.error('Failed to fetch history:', err);
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

    setNotification({
      type: 'success',
      message: 'Live vitals transferred into screening form successfully.'
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSubmitScreening = async (e) => {
    e.preventDefault();
    setNotification(null);

    // Validation
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanAadhaar = aadhaar.replace(/\D/g, '');

    if (!fullName.trim()) {
      setNotification({ type: 'error', message: 'Patient full name is required.' });
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

    const payload = {
      patient_name: fullName.trim(),
      patient_phone: cleanPhone,
      patient_aadhaar: cleanAadhaar,
      patient_age: age ? parseInt(age) : null,
      patient_gender: gender,
      systolic_bp: systolicBP ? parseFloat(systolicBP) : null,
      diastolic_bp: diastolicBP ? parseFloat(diastolicBP) : null,
      heart_rate: heartRate ? parseInt(heartRate) : null,
      spo2: spo2 ? parseFloat(spo2) : null,
      temperature: temperature ? parseFloat(temperature) : null,
      blood_glucose: bloodGlucose ? parseFloat(bloodGlucose) : null,
      device_id: liveVitals?.device_id || 'MANUAL-COLLECTOR',
      recorded_at: new Date().toISOString()
    };

    setSubmitting(true);

    if (isOnline) {
      try {
        await api.post('/collector/vitals', payload);
        setNotification({
          type: 'success',
          message: `Screening for ${fullName} saved to patient health record.`
        });
        resetForm();
        fetchHistory();
      } catch (err) {
        if (!err.response || err.message === 'Network Error' || err.code === 'ECONNABORTED') {
          await enqueueRecord(payload);
          setNotification({
            type: 'warning',
            message: 'No internet connection: Screening safely saved on this device. It will upload when connected.'
          });
          resetForm();
        } else {
          setNotification({
            type: 'error',
            message: extractErrorMessage(err, 'Failed to submit screening. Please check form details.')
          });
        }
      } finally {
        setSubmitting(false);
      }
    } else {
      await enqueueRecord(payload);
      setNotification({
        type: 'warning',
        message: 'Saved on this device. It will automatically upload when connected.'
      });
      resetForm();
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setAadhaar('');
    setAge('');
    setSystolicBP('');
    setDiastolicBP('');
    setHeartRate('');
    setSpo2('');
    setBloodGlucose('');
  };

  const filteredHistory = historyRecords.filter((r) => 
    r.patient_name.toLowerCase().includes(historySearch.toLowerCase()) ||
    r.patient_phone.includes(historySearch) ||
    r.patient_aadhaar_masked.includes(historySearch)
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Top Banner & Device Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded bg-white border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
            SwastGrama - Healthcamp & Assistant Scan
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Healthcamp Vitals Screening</h1>
          <p className="text-xs text-slate-600">
            Record patient vital signs and capture wireless readings from medical health devices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsBluetoothModalOpen(true)}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
              isBLEConnected
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-teal-800 hover:bg-teal-900 text-white'
            }`}
          >
            {isBLEConnected ? 'Device Connected' : 'Connect Medical Device'}
          </button>

          {pendingCount > 0 && (
            <button
              onClick={triggerSync}
              disabled={!isOnline}
              className="px-3 py-1.5 rounded text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition"
            >
              Send {pendingCount} Saved Records
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`p-3 rounded text-xs font-medium border ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : notification.type === 'warning'
            ? 'bg-amber-50 border-amber-300 text-amber-900'
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Live Vitals Widget */}
      <LiveVitalsWidget
        vitals={liveVitals}
        isConnected={isBLEConnected}
        onApplyToForm={handleApplyLiveVitals}
        onOpenModal={() => setIsBluetoothModalOpen(true)}
      />

      {/* Main Grid: Screening Form & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Patient Intake & Vitals Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Patient Screening Form
            </h2>
            <span className="text-xs text-slate-500">
              Aadhaar ID Auto-Masked
            </span>
          </div>

          <form onSubmit={handleSubmitScreening} className="space-y-4">
            
            {/* 1. Demographics */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase">
                1. Patient Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    required
                    className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-sm focus:border-teal-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number (10 Digits) *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit number"
                    maxLength={10}
                    required
                    className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-sm focus:border-teal-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Aadhaar Number (12 Digits) *
                  </label>
                  <input
                    type="text"
                    value={aadhaar}
                    onChange={(e) => setAadhaar(e.target.value)}
                    placeholder="12-digit Aadhaar"
                    maxLength={14}
                    required
                    className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-sm font-mono focus:border-teal-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Age & Gender
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Age"
                      min={0}
                      max={120}
                      className="w-1/2 px-2 py-2 rounded bg-white border border-slate-300 text-slate-900 text-sm text-center focus:border-teal-700 focus:outline-none"
                    />
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-1/2 px-2 py-2 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:border-teal-700 focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Vitals */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase">
                  2. Vital Signs (Readings)
                </h3>
                {isBLEConnected && (
                  <span className="text-xs text-teal-800 font-semibold">
                    Device Paired
                  </span>
                )}
              </div>

              {/* BP & Heart Rate */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Systolic BP
                  </label>
                  <input
                    type="number"
                    value={systolicBP}
                    onChange={(e) => setSystolicBP(e.target.value)}
                    placeholder="120"
                    className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-900 font-mono text-sm focus:border-teal-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Diastolic BP
                  </label>
                  <input
                    type="number"
                    value={diastolicBP}
                    onChange={(e) => setDiastolicBP(e.target.value)}
                    placeholder="80"
                    className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-900 font-mono text-sm focus:border-teal-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pulse (BPM)
                  </label>
                  <input
                    type="number"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    placeholder="72"
                    className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-900 font-mono text-sm focus:border-teal-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SpO2 Oxygen (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    placeholder="98"
                    className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-900 font-mono text-sm focus:border-teal-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* Temp & Glucose */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Temperature (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="36.6"
                    className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-900 font-mono text-sm focus:border-teal-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Blood Glucose (mg/dL)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={bloodGlucose}
                    onChange={(e) => setBloodGlucose(e.target.value)}
                    placeholder="Optional (e.g. 110)"
                    className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-900 font-mono text-sm focus:border-teal-700 focus:outline-none"
                  />
                </div>
              </div>

            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded bg-teal-800 hover:bg-teal-900 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <span className="spinner-white"></span>
                    <span>Saving patient screening...</span>
                  </>
                ) : isOnline ? (
                  'Save Patient Screening'
                ) : (
                  'Save on This Device (Offline)'
                )}
              </button>
            </div>

          </form>
        </div>

        {/* Right Col: Collector History & Scanned Patients (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded border border-slate-200 shadow-sm space-y-3 flex flex-col h-full">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Scanned Patients</h3>
            <button
              onClick={fetchHistory}
              disabled={!isOnline || loadingHistory}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
            >
              {loadingHistory ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {/* Search Box */}
          <div>
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search by name, phone or Aadhaar..."
              className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
            />
          </div>

          {/* Scanned Patients List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[460px] pr-1">
            {filteredHistory.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                {loadingHistory ? 'Loading history...' : 'No patients scanned yet.'}
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div key={item.id} className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{item.patient_name}</h4>
                      <p className="text-[11px] text-slate-500">+91 {item.patient_phone} • {item.patient_aadhaar_masked}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(item.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Vitals Summary */}
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
                      <span className="text-[10px] text-slate-500 block">SpO2</span>
                      <strong>{item.spo2 || '--'}%</strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

      </div>

      {/* Bluetooth Pairing Modal */}
      <BluetoothModal
        isOpen={isBluetoothModalOpen}
        onClose={() => setIsBluetoothModalOpen(false)}
        onVitalsReceived={setLiveVitals}
      />

    </div>
  );
};

export default CollectorDashboard;
