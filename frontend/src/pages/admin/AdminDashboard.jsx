import React, { useState, useEffect } from 'react';
import api from '../../services/api';
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
  Check
} from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'devices' | 'audits' | 'patients'
  
  // Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Users Management State
  const [users, setUsers] = useState([]);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('doctor');
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

  // Patients State
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');

  useEffect(() => {
    fetchAnalytics();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'devices') { fetchDevices(); fetchUsers(); }
    if (activeTab === 'audits') fetchAuditLogs();
    if (activeTab === 'patients') fetchPatients();
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
      // Reset form
      setNewFullName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
      fetchUsers();
    } catch (err) {
      setUserActionMsg('Failed to create user: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      await api.put(`/admin/users/${userId}/status?is_active=${!currentStatus}`);
      fetchUsers();
    } catch (err) {
      console.error(err);
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
      alert('Failed to register device: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Admin Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl glass-panel border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">System Administration & Analytics</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold">
              Root Admin
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage medical staff, monitor ESP32 fleets, inspect security audit trails, and review population health.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'overview' ? 'bg-purple-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'users' ? 'bg-purple-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Staff ({users.length || '--'})
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'devices' ? 'bg-purple-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" /> ESP32 Devices
          </button>
          <button
            onClick={() => setActiveTab('patients')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'patients' ? 'bg-purple-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Patients
          </button>
          <button
            onClick={() => setActiveTab('audits')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'audits' ? 'bg-purple-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
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
                <span>Total Screenings</span>
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
              <p className="text-[11px] text-slate-400 mt-1">Unique Aadhaar Protected</p>
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
                {analytics.total_doctors} Doctors • {analytics.total_collectors} Collectors
              </p>
            </div>

          </div>

          {/* Recent Audit Trails */}
          <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Recent Security & Consent Audits</h3>
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

      {/* TAB 2: User & Staff Management */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Medical & Operational Staff</h3>
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 text-white transition flex items-center gap-1.5 shadow-lg shadow-purple-500/20"
            >
              <UserPlus className="w-4 h-4" /> Add New Staff Member
            </button>
          </div>

          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-4">Name & Email</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/50 transition">
                    <td className="p-4">
                      <div className="font-bold text-white">{u.full_name}</div>
                      <div className="text-[11px] text-slate-500">{u.email || 'No email'}</div>
                    </td>
                    <td className="p-4 font-mono">{u.phone}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.role === 'admin' ? 'bg-purple-500/20 text-purple-300' :
                        u.role === 'doctor' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-teal-500/20 text-teal-300'
                      }`}>
                        {u.role}
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

      {/* TAB 3: ESP32 Device Fleet */}
      {activeTab === 'devices' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">ESP32 Hardware Fleet</h3>
              <p className="text-xs text-slate-400">Authorized medical IoT machines streaming telemetry.</p>
            </div>
            <button
              onClick={() => setShowCreateDeviceModal(true)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Register ESP32 Device
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {devices.length === 0 ? (
              <div className="md:col-span-3 p-12 text-center rounded-3xl glass-panel border border-slate-800 text-slate-400 text-xs">
                No ESP32 hardware registered yet. Click 'Register ESP32 Device' to authorize a new node.
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

      {/* TAB 4: Patient Registry */}
      {activeTab === 'patients' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Registered Patient Population</h3>
            <div className="relative w-72">
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => {
                  setPatientSearch(e.target.value);
                  fetchPatients(e.target.value);
                }}
                placeholder="Search patient name or phone..."
                className="w-full px-3 py-2 pl-9 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
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
                  <th className="p-4">Registered On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/50 transition">
                    <td className="p-4 font-bold text-white">{p.full_name}</td>
                    <td className="p-4 font-mono">{p.phone}</td>
                    <td className="p-4 font-mono text-purple-300">{p.aadhaar_masked}</td>
                    <td className="p-4">{p.age || '--'} yrs • {p.gender || '--'}</td>
                    <td className="p-4 font-mono text-slate-400">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Security Audit Logs */}
      {activeTab === 'audits' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Full HIPAA & Security Audit Log</h3>
              <p className="text-xs text-slate-400">Immutable record of all patient data accesses and logins.</p>
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

      {/* Modal: Create Staff User */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create Staff Member</h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  required
                  placeholder="e.g. Dr. Robert Chen"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. robert@healthcare.local"
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Role *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                >
                  <option value="doctor">Doctor</option>
                  <option value="collector">Data Collector</option>
                  <option value="admin">Admin</option>
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
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Register Device */}
      {showCreateDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Register ESP32 Hardware Node</h3>
            <form onSubmit={handleCreateDevice} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Device Name *</label>
                <input
                  type="text"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  required
                  placeholder="e.g. Field Kit Alpha (ESP32-WROOM-32)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">BLE MAC / UUID *</label>
                <input
                  type="text"
                  value={newDeviceMAC}
                  onChange={(e) => setNewDeviceMAC(e.target.value)}
                  required
                  placeholder="e.g. 24:6F:28:AB:CD:EF"
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
