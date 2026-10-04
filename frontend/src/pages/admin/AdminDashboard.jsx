import React, { useState, useEffect } from 'react';
import api, { extractErrorMessage } from '../../services/api';
import { 
  Shield, 
  Users, 
  Activity, 
  Cpu, 
  FileText, 
  AlertTriangle, 
  Plus, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  UserPlus, 
  Smartphone, 
  RefreshCw,
  TrendingUp,
  Heart,
  Eye,
  Check,
  Radio,
  X,
  HeartPulse,
  Wind
} from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'patients' | 'vitalsLogs' | 'devices' | 'audits'
  
  // Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Users Management State
  const [users, setUsers] = useState([]);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('registrar');
  const [newPassword, setNewPassword] = useState('');
  const [userActionMsg, setUserActionMsg] = useState('');

  // Device Management State
  const [devices, setDevices] = useState([]);
  const [showCreateDeviceModal, setShowCreateDeviceModal] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceMAC, setNewDeviceMAC] = useState('');
  const [newDeviceCollector, setNewDeviceCollector] = useState('');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);

  // Patients & Questionnaire Modal State
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientForModal, setSelectedPatientForModal] = useState(null);

  // Healthcamp Vitals Logs State
  const [vitalsLogs, setVitalsLogs] = useState([]);
  const [vitalsSearch, setVitalsSearch] = useState('');
  const [loadingVitals, setLoadingVitals] = useState(false);

  useEffect(() => {
    fetchAnalytics();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'devices') { fetchDevices(); fetchUsers(); }
    if (activeTab === 'audits') fetchAuditLogs();
    if (activeTab === 'patients') fetchPatients();
    if (activeTab === 'vitalsLogs') fetchVitalsLogs();
  }, [activeTab]);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/admin/analytics/overview');
      setAnalytics(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDevices = async () => {
    try {
      const res = await api.get('/admin/devices');
      setDevices(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get('/admin/audit-logs');
      setAuditLogs(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPatients = async (query = '') => {
    try {
      const res = await api.get(`/admin/patients${query ? `?search=${query}` : ''}`);
      setPatients(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVitalsLogs = async () => {
    setLoadingVitals(true);
    try {
      const res = await api.get('/collector/history?limit=100');
      setVitalsLogs(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingVitals(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserActionMsg('');
    try {
      await api.post('/admin/users', {
        full_name: newFullName,
        email: newEmail || null,
        phone: newPhone,
        role: newRole,
        password: newPassword,
        is_active: true
      });
      setUserActionMsg('User created successfully!');
      setShowCreateUserModal(false);
      setNewFullName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
      fetchUsers();
    } catch (err) {
      setUserActionMsg('Error: ' + extractErrorMessage(err, 'Failed to create user. Please verify entered data.'));
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      await api.put(`/admin/users/${userId}/status?is_active=${!currentStatus}`);
      fetchUsers();
    } catch (err) {
      setUserActionMsg('Error toggling status: ' + extractErrorMessage(err, 'Could not update user status.'));
    }
  };

  const handleCreateDevice = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/devices', {
        device_name: newDeviceName,
        device_mac: newDeviceMAC,
        assigned_collector_id: newDeviceCollector || null,
        is_active: true
      });
      setShowCreateDeviceModal(false);
      setNewDeviceName('');
      setNewDeviceMAC('');
      fetchDevices();
    } catch (err) {
      alert(extractErrorMessage(err, 'Failed to register device. MAC address may already exist.'));
    }
  };

  const filteredVitals = vitalsLogs.filter(v => 
    v.patient_name?.toLowerCase().includes(vitalsSearch.toLowerCase()) ||
    v.patient_phone?.includes(vitalsSearch) ||
    v.device_id?.toLowerCase().includes(vitalsSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl glass-panel border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">System Administration</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold">
              Admin Portal
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage staff accounts, view patient medical questionnaires, monitor healthcamp scans, and review access logs.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'overview' ? 'bg-purple-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'users' ? 'bg-purple-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Staff (4 Roles)
          </button>
          <button
            onClick={() => setActiveTab('patients')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'patients' ? 'bg-purple-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Patients & History
          </button>
          <button
            onClick={() => setActiveTab('vitalsLogs')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'vitalsLogs' ? 'bg-purple-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" /> Healthcamp Scans
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'devices' ? 'bg-purple-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" /> Medical Devices
          </button>
          <button
            onClick={() => setActiveTab('audits')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'audits' ? 'bg-purple-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Security Logs
          </button>
        </div>
      </div>

      {/* TAB 1: Analytics Overview */}
      {activeTab === 'overview' && analytics && (
        <div className="space-y-8">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-5 rounded-3xl glass-panel border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                <span>Total Healthcamp Scans</span>
                <Activity className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-3xl font-black text-white">{analytics.total_screenings}</div>
              <p className="text-[11px] text-teal-400 font-semibold mt-1">
                +{analytics.recent_screenings_count_24h} in past 24 hours
              </p>
            </div>

            <div className="p-5 rounded-3xl glass-panel border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                <span>Registered Patients</span>
                <Users className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-3xl font-black text-white">{analytics.total_patients}</div>
              <p className="text-[11px] text-slate-400 mt-1">Medical Questionnaires Synced</p>
            </div>

            <div className="p-5 rounded-3xl glass-panel border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                <span>Vitals Anomalies</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-3xl font-black text-rose-400">{analytics.vitals_anomalies_count}</div>
              <p className="text-[11px] text-rose-300 mt-1">Hypertension & Low SpO2</p>
            </div>

            <div className="p-5 rounded-3xl glass-panel border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                <span>Active Medical Staff</span>
                <Shield className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-3xl font-black text-white">
                {analytics.total_doctors + analytics.total_collectors}
              </div>
              <p className="text-[11px] text-purple-300 mt-1">
                {analytics.total_doctors} Doctors • {analytics.total_collectors} Field Staff
              </p>
            </div>

          </div>

          {/* Recent Audit Trails */}
          <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Recent System & Consent Audit Logs</h3>
              </div>
              <button
                onClick={() => setActiveTab('audits')}
                className="text-xs text-purple-400 hover:text-purple-300 transition font-semibold"
              >
                View Full Audit Log &rarr;
              </button>
            </div>

            <div className="divide-y divide-slate-800/80">
              {analytics.recent_audit_logs.map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-purple-300 font-bold">
                      {log.action}
                    </span>
                    <span className="text-slate-300">{log.details}</span>
                  </div>
                  <span className="text-slate-500 font-mono">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Staff User Management (4 Roles) */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Medical & Staff Directory (4 Logins)</h3>
              <p className="text-xs text-slate-400">Manage credentials and authorization for Registrars, Healthcamp Assistants, Doctors, and Admins.</p>
            </div>
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 transition flex items-center gap-1.5 shadow-lg shadow-purple-500/20"
            >
              <UserPlus className="w-4 h-4" /> Create Staff Account
            </button>
          </div>

          {userActionMsg && (
            <div className="p-3 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs">
              {userActionMsg}
            </div>
          )}

          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Assigned Role</th>
                  <th className="p-4">Account Status</th>
                  <th className="p-4">Created On</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/50 transition">
                    <td className="p-4 font-bold text-white">{u.full_name}</td>
                    <td className="p-4 text-slate-400">{u.email || '--'}</td>
                    <td className="p-4 font-mono">{u.phone}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                        u.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                        u.role === 'doctor' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                        u.role === 'registrar' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                        'bg-teal-500/20 text-teal-300 border-teal-500/30'
                      }`}>
                        {u.role === 'registrar' ? '1. User Registration' :
                         u.role === 'collector' ? '2. Healthcamp / Assistant' :
                         u.role === 'doctor' ? '3. Doctor' : '4. Administrator'}
                      </span>
                    </td>
                    <td className="p-4">
                      {u.is_active ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-400 font-semibold">
                          <XCircle className="w-3.5 h-3.5" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-slate-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                          u.is_active
                            ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Patients & Medical Questionnaire Explorer */}
      {activeTab === 'patients' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Registered Patient Population & Questionnaires</h3>
              <p className="text-xs text-slate-400">Search patients and inspect their doctor-grade medical background histories.</p>
            </div>
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => {
                  setPatientSearch(e.target.value);
                  fetchPatients(e.target.value);
                }}
                placeholder="Search by name, phone, Aadhaar..."
                className="w-full px-3.5 py-2 pl-9 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-4">Full Name</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Aadhaar (Protected)</th>
                  <th className="p-4">Age / Gender</th>
                  <th className="p-4">Medical History Status</th>
                  <th className="p-4">Registered On</th>
                  <th className="p-4 text-right">Medical Questionnaire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/50 transition">
                    <td className="p-4 font-bold text-white">{p.full_name}</td>
                    <td className="p-4 font-mono">{p.phone}</td>
                    <td className="p-4 font-mono text-purple-300">{p.aadhaar_masked}</td>
                    <td className="p-4">{p.age || '--'} yrs • {p.gender || '--'}</td>
                    <td className="p-4">
                      {p.medical_history ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          ✓ Completed
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                          Basic Intake
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-slate-400">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedPatientForModal(p)}
                        className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition flex items-center gap-1.5 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Medical File
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Healthcamp Vitals & Bluetooth Scans Explorer */}
      {activeTab === 'vitalsLogs' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Healthcamp Vitals Scans Log</h3>
              <p className="text-xs text-slate-400">Review all vital readings recorded during health camps and clinical screenings.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={vitalsSearch}
                  onChange={(e) => setVitalsSearch(e.target.value)}
                  placeholder="Filter by patient name or device..."
                  className="w-full px-3.5 py-2 pl-9 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              </div>
              <button
                onClick={fetchVitalsLogs}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
              >
                <RefreshCw className={`w-4 h-4 ${loadingVitals ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Patient Name & Phone</th>
                  <th className="p-4">Blood Pressure</th>
                  <th className="p-4">Heart Rate</th>
                  <th className="p-4">SpO2 Oxygen</th>
                  <th className="p-4">Temperature</th>
                  <th className="p-4">Medical Device Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredVitals.map((v) => {
                  const isBPAnomalous = (v.systolic_bp >= 140 || v.diastolic_bp >= 90);
                  const isSpO2Anomalous = (v.spo2 && v.spo2 < 94);
                  return (
                    <tr key={v.id} className="hover:bg-slate-900/50 transition">
                      <td className="p-4 font-mono text-slate-400">
                        {new Date(v.recorded_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="p-4">
                        <strong className="text-white block">{v.patient_name}</strong>
                        <span className="text-slate-400 font-mono text-[11px]">+91 {v.patient_phone}</span>
                      </td>
                      <td className="p-4">
                        <span className={`font-bold ${isBPAnomalous ? 'text-rose-400 font-extrabold' : 'text-slate-200'}`}>
                          {v.systolic_bp ?? '--'} / {v.diastolic_bp ?? '--'} mmHg
                        </span>
                        {isBPAnomalous && (
                          <span className="block text-[10px] text-rose-400 font-semibold">Hypertension Stage</span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-rose-400">
                        {v.heart_rate ? `${v.heart_rate} BPM` : '--'}
                      </td>
                      <td className="p-4">
                        <span className={`font-bold ${isSpO2Anomalous ? 'text-rose-400' : 'text-teal-400'}`}>
                          {v.spo2 ? `${v.spo2}%` : '--'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300">
                        {v.temperature ? `${v.temperature}°C` : '--'}
                      </td>
                      <td className="p-4 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-teal-300">
                          {v.device_id || 'Medical Device'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Medical Device Registry */}
      {activeTab === 'devices' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Medical Devices Registry</h3>
              <p className="text-xs text-slate-400">Authorized health monitors and diagnostic devices.</p>
            </div>
            <button
              onClick={() => setShowCreateDeviceModal(true)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 transition flex items-center gap-1.5 shadow-lg shadow-purple-500/20"
            >
              <Plus className="w-4 h-4" /> Register Medical Device
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {devices.length === 0 ? (
              <div className="md:col-span-3 p-12 text-center rounded-3xl glass-panel border border-slate-800 text-slate-400 text-xs">
                No medical devices registered yet. Click 'Register Medical Device' to pair a new device.
              </div>
            ) : (
              devices.map((d) => (
                <div key={d.id} className="p-5 rounded-3xl glass-panel border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Authorized
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{d.device_name}</h4>
                    <p className="text-xs font-mono text-purple-300">{d.device_mac}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    Assigned: <strong className="text-slate-200">{d.assigned_collector_name || 'Unassigned Field Pool'}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: Security & System Access Logs */}
      {activeTab === 'audits' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Security & System Access Logs</h3>
              <p className="text-xs text-slate-400">Chronological record of all patient data accesses and staff actions.</p>
            </div>
            <button
              onClick={fetchAuditLogs}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Actor</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Resource</th>
                  <th className="p-4">Audit Details</th>
                  <th className="p-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/50 transition">
                    <td className="p-4 font-mono text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <strong className="text-white">{log.user_name}</strong>
                      <span className="text-[10px] text-slate-500 block uppercase font-mono">{log.user_role}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">{log.resource_type || '--'}</td>
                    <td className="p-4 text-slate-300">{log.details}</td>
                    <td className="p-4 font-mono text-slate-500">{log.ip_address || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: View Patient Medical Questionnaire */}
      {selectedPatientForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedPatientForModal.full_name}</h3>
                  <p className="text-xs text-slate-400">
                    Phone: +91 {selectedPatientForModal.phone} • Aadhaar: {selectedPatientForModal.aadhaar_masked} • {selectedPatientForModal.age || 'N/A'} yrs ({selectedPatientForModal.gender || 'N/A'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPatientForModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedPatientForModal.medical_history ? (
              <div className="space-y-5 text-xs">
                
                {/* Chronic conditions */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-400 uppercase tracking-wider block">Past Chronic Medical Issues</span>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(selectedPatientForModal.medical_history.past_medical_issues) ? (
                      selectedPatientForModal.medical_history.past_medical_issues.map((c, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-300 border border-blue-500/20">
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400">None reported</span>
                    )}
                  </div>
                </div>

                {/* Family History */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-400 uppercase tracking-wider block">Family Medical History & Role</span>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(selectedPatientForModal.medical_history.family_medical_history) ? (
                      selectedPatientForModal.medical_history.family_medical_history.map((f, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          {f}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400">None reported</span>
                    )}
                  </div>
                  {selectedPatientForModal.medical_history.family_role && (
                    <p className="text-slate-300 pt-1">
                      <span className="text-slate-500 font-semibold">Support Role: </span>
                      {selectedPatientForModal.medical_history.family_role}
                    </p>
                  )}
                </div>

                {/* Surgeries & Allergies */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <span className="font-bold text-slate-400 uppercase tracking-wider block">Surgeries & Hospitalizations</span>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.isArray(selectedPatientForModal.medical_history.surgeries_and_hospitalizations) ? (
                        selectedPatientForModal.medical_history.surgeries_and_hospitalizations.map((s, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px]">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <span className="font-bold text-slate-400 uppercase tracking-wider block">Known Allergies</span>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.isArray(selectedPatientForModal.medical_history.known_allergies) ? (
                        selectedPatientForModal.medical_history.known_allergies.map((a, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[11px]">
                            {a}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lifestyle */}
                {selectedPatientForModal.medical_history.lifestyle && (
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <span className="font-bold text-slate-400 uppercase tracking-wider block">Lifestyle & Habits</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Smoking</span>
                        <span className="font-semibold text-white">{selectedPatientForModal.medical_history.lifestyle.smoking}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Alcohol</span>
                        <span className="font-semibold text-white">{selectedPatientForModal.medical_history.lifestyle.alcohol}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Activity</span>
                        <span className="font-semibold text-white">{selectedPatientForModal.medical_history.lifestyle.physical_activity}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Diet</span>
                        <span className="font-semibold text-white">{selectedPatientForModal.medical_history.lifestyle.diet}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Medications & Notes */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-400 uppercase tracking-wider block">Current Medications</span>
                  <p className="text-teal-300">{selectedPatientForModal.medical_history.current_medications || 'None'}</p>
                </div>

              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No detailed medical questionnaire record found for this patient.
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPatientForModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
              >
                Close Medical File
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: Create Staff User (4 Roles) */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create Staff Member Account</h3>
            <p className="text-xs text-slate-400">Add an authorized user for any of the 4 access portals.</p>
            
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  required
                  placeholder="e.g. Elena Vance"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. registrar@healthcare.local"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  required
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Role (4 Logins) *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:border-purple-500"
                >
                  <option value="registrar">1. User Registration (Registrar)</option>
                  <option value="collector">2. Healthcamps / Assistant Scan</option>
                  <option value="doctor">3. Doctor</option>
                  <option value="admin">4. Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Password *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-purple-500/20"
                >
                  Create User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Register Device */}
      {showCreateDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Register Medical Device</h3>
            <form onSubmit={handleCreateDevice} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Device Name *</label>
                <input
                  type="text"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  required
                  placeholder="e.g. Wireless Health Monitor Kit Alpha"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Device Serial Number / ID *</label>
                <input
                  type="text"
                  value={newDeviceMAC}
                  onChange={(e) => setNewDeviceMAC(e.target.value)}
                  required
                  placeholder="e.g. DEV-HEALTH-001"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-sm uppercase"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateDeviceModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-purple-500/20"
                >
                  Register Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
