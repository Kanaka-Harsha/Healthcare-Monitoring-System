import React, { useState, useEffect } from 'react';
import api, { extractErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
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

const PatientDashboard = () => {
  const { user } = useAuth();
  const [medicalFile, setMedicalFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPatientData();
  }, []);

  const fetchPatientData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/patient/my-records');
      setMedicalFile(res.data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to fetch your health records.'));
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-2">
        <span className="spinner"></span>
        <p className="text-xs text-slate-600">Loading your personal health records...</p>
      </div>
    );
  }

  if (error || !medicalFile) {
    return (
      <div className="max-w-md mx-auto my-10 p-6 bg-white rounded border border-slate-200 text-center space-y-3">
        <p className="text-xs text-rose-800 font-medium">{error || 'No records found.'}</p>
        <button
          onClick={fetchPatientData}
          className="px-4 py-1.5 text-xs font-semibold rounded bg-teal-800 text-white hover:bg-teal-900 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { patient, vitals_history, clinical_history } = medicalFile;
  const latestVitals = vitals_history.length > 0 ? vitals_history[0] : null;

  // Chart data
  const chartData = [...vitals_history].reverse().map((v) => ({
    time: new Date(v.recorded_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    systolic: v.systolic_bp,
    diastolic: v.diastolic_bp,
    heartRate: v.heart_rate,
    spo2: v.spo2,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Patient Header Card */}
      <div className="p-5 rounded bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">{patient.full_name}</h1>
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-semibold">
              Verified Patient
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-1">
            <span>Mobile: <strong>+91 {patient.phone}</strong></span>
            <span>•</span>
            <span>Aadhaar: <strong className="font-mono">{patient.aadhaar_masked}</strong></span>
            <span>•</span>
            <span>Age: <strong>{patient.age || 'N/A'} yrs</strong></span>
            <span>•</span>
            <span>Gender: <strong>{patient.gender || 'N/A'}</strong></span>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 transition"
        >
          Print Health Record
        </button>
      </div>

      {/* Latest Vitals Summary */}
      {latestVitals ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Latest Health Measurements
            </h2>
            <span className="text-xs text-slate-500">
              Recorded {new Date(latestVitals.recorded_at).toLocaleDateString([], { dateStyle: 'medium' })}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            {/* Blood Pressure */}
            <div className="p-3.5 rounded bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-600 block">Blood Pressure</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {latestVitals.systolic_bp ?? '--'} / {latestVitals.diastolic_bp ?? '--'}
                <span className="text-xs font-normal text-slate-500 ml-1">mmHg</span>
              </div>
              <p className="text-[11px] text-emerald-700 mt-0.5 font-semibold">
                {latestVitals.systolic_bp < 120 ? 'Normal Range' : 'Check with Doctor'}
              </p>
            </div>

            {/* Heart Rate */}
            <div className="p-3.5 rounded bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-600 block">Pulse Rate</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {latestVitals.heart_rate ?? '--'}
                <span className="text-xs font-normal text-slate-500 ml-1">BPM</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">Pulse</p>
            </div>

            {/* SpO2 */}
            <div className="p-3.5 rounded bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-600 block">Oxygen (SpO2)</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {latestVitals.spo2 ?? '--'}
                <span className="text-xs font-normal text-slate-500 ml-1">%</span>
              </div>
              <p className="text-[11px] text-emerald-700 mt-0.5 font-semibold">
                {latestVitals.spo2 >= 95 ? 'Normal Oxygen' : 'Low Oxygen'}
              </p>
            </div>

            {/* Temperature */}
            <div className="p-3.5 rounded bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-600 block">Body Temperature</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {latestVitals.temperature ?? '36.6'}
                <span className="text-xs font-normal text-slate-500 ml-1">°C</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">Normal</p>
            </div>

          </div>
        </div>
      ) : (
        <div className="p-6 text-center bg-white rounded border border-slate-200 text-slate-600 text-xs">
          No vitals recorded yet. Visit the local healthcamp assistant to perform a screening.
        </div>
      )}

      {/* Vitals Trend Graph */}
      {chartData.length > 1 && (
        <div className="p-5 rounded bg-white border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Health Measurements Trend</h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={['dataMin - 10', 'dataMax + 10']} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', fontSize: '12px' }} />
                <Legend />
                <Line type="monotone" dataKey="systolic" name="Systolic BP" stroke="#0284c7" strokeWidth={2} />
                <Line type="monotone" dataKey="diastolic" name="Diastolic BP" stroke="#0f766e" strokeWidth={2} />
                <Line type="monotone" dataKey="heartRate" name="Pulse Rate" stroke="#e11d48" strokeWidth={2} />
                <Line type="monotone" dataKey="spo2" name="Oxygen %" stroke="#16a34a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Doctor Prescriptions & Clinical Advice */}
      <div className="bg-white p-5 rounded border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase pb-2 border-b border-slate-100">
          Doctor Prescriptions & Advice
        </h3>

        {clinical_history.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">
            No doctor prescriptions recorded yet.
          </p>
        ) : (
          clinical_history.map((item) => (
            <div key={item.id} className="p-4 rounded bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{item.diagnosis || 'Clinical Diagnosis'}</h4>
                  <p className="text-[11px] text-slate-500">
                    Dr. {item.doctor_name} • {new Date(item.created_at).toLocaleDateString([], { dateStyle: 'long' })}
                  </p>
                </div>
                {item.follow_up_date && (
                  <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 text-[11px] font-semibold">
                    Next Visit: {item.follow_up_date}
                  </span>
                )}
              </div>

              {item.prescription && (
                <div className="text-xs text-slate-800 bg-white p-2.5 rounded border border-slate-200">
                  {item.prescription}
                </div>
              )}

              {item.prescribed_medicines && item.prescribed_medicines.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-700">Medicines:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {item.prescribed_medicines.map((m, idx) => (
                      <div key={idx} className="p-2 rounded bg-white border border-slate-200 text-xs flex items-center justify-between">
                        <span className="font-bold text-slate-900">{m.name} {m.dosage}</span>
                        <span className="text-slate-600">{m.frequency} ({m.days} days)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default PatientDashboard;
