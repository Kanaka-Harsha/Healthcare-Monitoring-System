import React, { useState, useEffect } from 'react';
import api, { extractErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Heart, 
  Activity, 
  Wind, 
  Thermometer, 
  FileText, 
  Calendar, 
  User, 
  ShieldCheck, 
  Clock, 
  TrendingUp, 
  Pill,
  Printer
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Activity className="w-8 h-8 text-teal-400 animate-spin" />
        <p className="text-sm text-slate-400">Loading your personal health records...</p>
      </div>
    );
  }

  if (error || !medicalFile) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 glass-panel rounded-3xl border border-slate-800 text-center space-y-4">
        <p className="text-sm text-rose-300">{error || 'No records found.'}</p>
        <button
          onClick={fetchPatientData}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-500 text-slate-950 hover:bg-teal-400 transition"
        >
          Retry
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Patient Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-slate-950 font-black text-2xl shadow-xl shadow-teal-500/20">
            {patient.full_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white tracking-tight">{patient.full_name}</h1>
              <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Patient
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
              <span>Mobile: <strong className="text-slate-200">+91 {patient.phone}</strong></span>
              <span>•</span>
              <span>Aadhaar: <strong className="text-slate-200 font-mono">{patient.aadhaar_masked}</strong></span>
              <span>•</span>
              <span>Age: <strong className="text-slate-200">{patient.age || 'N/A'} yrs</strong></span>
              <span>•</span>
              <span>Gender: <strong className="text-slate-200">{patient.gender || 'N/A'}</strong></span>
            </div>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition flex items-center gap-2"
        >
          <Printer className="w-4 h-4" /> Print / Save Health Card
        </button>
      </div>

      {/* Latest Vitals Summary */}
      {latestVitals ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white uppercase tracking-wider">Latest Health Metrics</h2>
            <span className="text-xs text-slate-400">
              Recorded {new Date(latestVitals.recorded_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            {/* Blood Pressure */}
            <div className="p-4 rounded-2xl glass-card border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                <span>Blood Pressure</span>
                <Activity className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                {latestVitals.systolic_bp ?? '--'} / {latestVitals.diastolic_bp ?? '--'}
                <span className="text-xs font-normal text-slate-400 ml-1">mmHg</span>
              </div>
              <p className="text-[11px] text-emerald-400 mt-1 font-semibold">
                {latestVitals.systolic_bp < 120 ? 'Normal Range' : 'Check with Doctor'}
              </p>
            </div>

            {/* Heart Rate */}
            <div className="p-4 rounded-2xl glass-card border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                <span>Heart Rate</span>
                <Heart className="w-4 h-4 text-rose-400 animate-heartbeat" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                {latestVitals.heart_rate ?? '--'}
                <span className="text-xs font-normal text-slate-400 ml-1">BPM</span>
              </div>
              <p className="text-[11px] text-rose-300 mt-1 font-semibold">Pulse Rate</p>
            </div>

            {/* SpO2 */}
            <div className="p-4 rounded-2xl glass-card border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                <span>Blood Oxygen</span>
                <Wind className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                {latestVitals.spo2 ?? '--'}
                <span className="text-xs font-normal text-slate-400 ml-1">%</span>
              </div>
              <p className="text-[11px] text-teal-400 mt-1 font-semibold">
                {latestVitals.spo2 >= 95 ? 'Healthy Oxygen' : 'Low SpO2'}
              </p>
            </div>

            {/* Temperature */}
            <div className="p-4 rounded-2xl glass-card border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                <span>Body Temp</span>
                <Thermometer className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                {latestVitals.temperature ?? '36.6'}
                <span className="text-xs font-normal text-slate-400 ml-1">°C</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-semibold">Normal</p>
            </div>

          </div>
        </div>
      ) : (
        <div className="p-8 text-center rounded-3xl glass-panel border border-slate-800 text-slate-400 text-sm">
          No vitals recorded yet. Contact your field data collector to perform your first screening.
        </div>
      )}

      {/* Vitals Trend Graph */}
      {chartData.length > 1 && (
        <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-400" />
              <h3 className="text-base font-bold text-white">Your Health Metric Trends</h3>
            </div>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={['dataMin - 10', 'dataMax + 10']} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                <Legend />
                <Line type="monotone" dataKey="systolic" name="Systolic BP" stroke="#38bdf8" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="diastolic" name="Diastolic BP" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="heartRate" name="Heart Rate" stroke="#f43f5e" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="spo2" name="SpO2 %" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Doctor Prescriptions & Clinical Advice */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
          <FileText className="w-5 h-5 text-teal-400" />
          <h3 className="text-base font-bold text-white">Doctor Prescriptions & Advice</h3>
        </div>

        {clinical_history.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            No prescriptions recorded yet. Your doctor will attach advice and medications during consultation.
          </p>
        ) : (
          clinical_history.map((item) => (
            <div key={item.id} className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">{item.diagnosis || 'Clinical Diagnosis'}</h4>
                  <p className="text-xs text-slate-400">
                    Dr. {item.doctor_name} • {new Date(item.created_at).toLocaleDateString([], { dateStyle: 'long' })}
                  </p>
                </div>
                {item.follow_up_date && (
                  <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold">
                    Next Visit: {item.follow_up_date}
                  </span>
                )}
              </div>

              {item.prescription && (
                <div className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  {item.prescription}
                </div>
              )}

              {item.prescribed_medicines && item.prescribed_medicines.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase text-slate-400">Medicines:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {item.prescribed_medicines.map((m, idx) => (
                      <div key={idx} className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between">
                        <span className="font-bold text-teal-300 flex items-center gap-1.5">
                          <Pill className="w-3.5 h-3.5" /> {m.name} {m.dosage}
                        </span>
                        <span className="text-slate-400">{m.frequency} ({m.days} days)</span>
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
