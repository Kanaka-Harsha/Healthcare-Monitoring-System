import React, { useState, useEffect } from 'react';
import api, { extractErrorMessage } from '../../services/api';

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
      setUserActionMsg('Staff user account created successfully.');
      setShowCreateUserModal(false);
      setNewFullName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
      fetchUsers();
    } catch (err) {
      setUserActionMsg('Error: ' + extractErrorMessage(err, 'Failed to create user. Please verify data.'));
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      await api.put(`/admin/users/${userId}/status?is_active=${!currentStatus}`);
      fetchUsers();
    } catch (err) {
      setUserActionMsg('Error: ' + extractErrorMessage(err, 'Could not update user status.'));
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
      alert(extractErrorMessage(err, 'Failed to register device.'));
    }
  };

  const filteredVitals = vitalsLogs.filter(v => 
    v.patient_name?.toLowerCase().includes(vitalsSearch.toLowerCase()) ||
    v.patient_phone?.includes(vitalsSearch) ||
    v.device_id?.toLowerCase().includes(vitalsSearch.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded bg-white border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
            SwastGrama - System Administration
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Administration & Management Portal</h1>
          <p className="text-xs text-slate-600">
            Manage staff accounts, view patient medical questionnaires, monitor healthcamp scans, and review security logs.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1 p-1 rounded bg-slate-100 border border-slate-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
              activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
              activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Staff (4 Logins)
          </button>
          <button
            onClick={() => setActiveTab('patients')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
              activeTab === 'patients' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Patients & History
          </button>
          <button
            onClick={() => setActiveTab('vitalsLogs')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
              activeTab === 'vitalsLogs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Healthcamp Scans
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
              activeTab === 'devices' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Medical Devices
          </button>
          <button
            onClick={() => setActiveTab('audits')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
              activeTab === 'audits' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Audit Logs
          </button>
        </div>
      </div>

      {/* TAB 1: Analytics Overview */}
      {activeTab === 'overview' && analytics && (
        <div className="space-y-6">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            
            <div className="p-4 rounded bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold block">Total Healthcamp Scans</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{analytics.total_screenings}</div>
              <p className="text-[11px] text-teal-800 font-medium mt-0.5">
                +{analytics.recent_screenings_count_24h} in past 24 hours
              </p>
            </div>

            <div className="p-4 rounded bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold block">Registered Patients</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{analytics.total_patients}</div>
              <p className="text-[11px] text-slate-600 mt-0.5">Medical History Recorded</p>
            </div>

            <div className="p-4 rounded bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold block">Vitals Flags</span>
              <div className="text-2xl font-bold text-rose-800 mt-1">{analytics.vitals_anomalies_count}</div>
              <p className="text-[11px] text-rose-700 mt-0.5">High BP or Low Oxygen</p>
            </div>

            <div className="p-4 rounded bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold block">Active Medical Staff</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {analytics.total_doctors + analytics.total_collectors}
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {analytics.total_doctors} Doctors • {analytics.total_collectors} Healthcamp Staff
              </p>
            </div>

          </div>

          {/* Recent Audit Trails */}
          <div className="bg-white p-5 rounded border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Recent Security & Consent Access Logs</h3>
              <button
                onClick={() => setActiveTab('audits')}
                className="text-xs text-teal-800 hover:underline font-semibold"
              >
                View Full Audit Log &rarr;
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {analytics.recent_audit_logs.map((log) => (
                <div key={log.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold">
                      {log.action}
                    </span>
                    <span className="text-slate-700">{log.details}</span>
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

      {/* TAB 2: Staff User Management */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Staff Account Directory (4 Login Roles)</h3>
              <p className="text-xs text-slate-500">Manage credentials for Registrars, Healthcamp Assistants, Doctors, and Admins.</p>
            </div>
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-teal-800 hover:bg-teal-900 text-white transition"
            >
              + Create Staff Account
            </button>
          </div>

          {userActionMsg && (
            <div className="p-3 rounded bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-medium">
              {userActionMsg}
            </div>
          )}

          <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{u.full_name}</td>
                    <td className="p-3 text-slate-600">{u.email || '--'}</td>
                    <td className="p-3 font-mono">{u.phone}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        {u.role === 'registrar' ? '1. User Registration' :
                         u.role === 'collector' ? '2. Healthcamp Assistant' :
                         u.role === 'doctor' ? '3. Doctor' : '4. Administrator'}
                      </span>
                    </td>
                    <td className="p-3">
                      {u.is_active ? (
                        <span className="text-emerald-700 font-semibold">Active</span>
                      ) : (
                        <span className="text-rose-700 font-semibold">Disabled</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-slate-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                          u.is_active
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
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

      {/* TAB 3: Patients & Medical Questionnaire */}
      {activeTab === 'patients' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Registered Patient Records</h3>
              <p className="text-xs text-slate-500">Search patients and view full medical background questionnaire data.</p>
            </div>
            <div>
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => {
                  setPatientSearch(e.target.value);
                  fetchPatients(e.target.value);
                }}
                placeholder="Search by name, phone, Aadhaar..."
                className="w-full sm:w-64 px-3 py-1.5 rounded bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
              />
            </div>
          </div>

          <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Aadhaar (Masked)</th>
                  <th className="p-3">Age / Gender</th>
                  <th className="p-3">Questionnaire Status</th>
                  <th className="p-3">Registered On</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{p.full_name}</td>
                    <td className="p-3 font-mono">{p.phone}</td>
                    <td className="p-3 font-mono text-slate-700">{p.aadhaar_masked}</td>
                    <td className="p-3">{p.age || '--'} yrs • {p.gender || '--'}</td>
                    <td className="p-3">
                      {p.medical_history ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                          Complete
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px]">
                          Basic Intake
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-slate-500">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedPatientForModal(p)}
                        className="px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-semibold transition"
                      >
                        View Health File
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Healthcamp Vitals Logs */}
      {activeTab === 'vitalsLogs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Healthcamp Vitals Scans Log</h3>
              <p className="text-xs text-slate-500">All vital readings captured during health camps and screenings.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={vitalsSearch}
                onChange={(e) => setVitalsSearch(e.target.value)}
                placeholder="Search by patient name..."
                className="w-full sm:w-64 px-3 py-1.5 rounded bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
              />
              <button
                onClick={fetchVitalsLogs}
                className="px-2.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                {loadingVitals ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Patient Name & Mobile</th>
                  <th className="p-3">Blood Pressure</th>
                  <th className="p-3">Pulse Rate</th>
                  <th className="p-3">SpO2 Oxygen</th>
                  <th className="p-3">Temperature</th>
                  <th className="p-3">Device ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVitals.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-slate-500">
                      {new Date(v.recorded_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="p-3">
                      <strong className="text-slate-900 block">{v.patient_name}</strong>
                      <span className="text-slate-500 font-mono text-[11px]">+91 {v.patient_phone}</span>
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      {v.systolic_bp ?? '--'} / {v.diastolic_bp ?? '--'} mmHg
                    </td>
                    <td className="p-3 text-slate-800">
                      {v.heart_rate ? `${v.heart_rate} BPM` : '--'}
                    </td>
                    <td className="p-3 text-slate-800">
                      {v.spo2 ? `${v.spo2}%` : '--'}
                    </td>
                    <td className="p-3 text-slate-700">
                      {v.temperature ? `${v.temperature}°C` : '--'}
                    </td>
                    <td className="p-3 text-slate-500 font-mono text-[11px]">
                      {v.device_id || 'Medical Device'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Devices Registry */}
      {activeTab === 'devices' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Medical Devices Registry</h3>
              <p className="text-xs text-slate-500">Authorized medical monitors and Bluetooth devices.</p>
            </div>
            <button
              onClick={() => setShowCreateDeviceModal(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-teal-800 hover:bg-teal-900 text-white transition"
            >
              + Register Medical Device
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {devices.length === 0 ? (
              <div className="sm:col-span-3 p-8 text-center bg-white rounded border border-slate-200 text-slate-500 text-xs">
                No medical devices registered yet. Click 'Register Medical Device' to add one.
              </div>
            ) : (
              devices.map((d) => (
                <div key={d.id} className="p-4 rounded bg-white border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{d.device_name}</span>
                    <span className="text-[11px] font-semibold text-emerald-700">Authorized</span>
                  </div>
                  <p className="text-xs font-mono text-slate-500">{d.device_mac}</p>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                    Assigned: <strong>{d.assigned_collector_name || 'Field Pool'}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: Security Audit Logs */}
      {activeTab === 'audits' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Security & Access Audit Logs</h3>
              <p className="text-xs text-slate-500">Record of user logins, OTP consents, and data accesses.</p>
            </div>
            <button
              onClick={fetchAuditLogs}
              className="px-2.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Refresh
            </button>
          </div>

          <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Resource</th>
                  <th className="p-3">Details</th>
                  <th className="p-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <strong className="text-slate-900">{log.user_name}</strong>
                      <span className="text-[10px] text-slate-500 block uppercase font-mono">{log.user_role}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-semibold">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{log.resource_type || '--'}</td>
                    <td className="p-3 text-slate-800">{log.details}</td>
                    <td className="p-3 font-mono text-slate-500">{log.ip_address || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: View Patient Medical Questionnaire */}
      {selectedPatientForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded border border-slate-200 shadow-lg space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedPatientForModal.full_name}</h3>
                <p className="text-xs text-slate-600">
                  Phone: +91 {selectedPatientForModal.phone} • Aadhaar: {selectedPatientForModal.aadhaar_masked} • {selectedPatientForModal.age || 'N/A'} yrs ({selectedPatientForModal.gender || 'N/A'})
                </p>
              </div>
              <button
                onClick={() => setSelectedPatientForModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {selectedPatientForModal.medical_history ? (
              <div className="space-y-4 text-xs">
                
                {/* Chronic conditions */}
                <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="font-bold text-slate-700 uppercase block">Past Chronic Medical Issues</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(selectedPatientForModal.medical_history.past_medical_issues) ? (
                      selectedPatientForModal.medical_history.past_medical_issues.map((c, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200">
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500">None reported</span>
                    )}
                  </div>
                </div>

                {/* Family History */}
                <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="font-bold text-slate-700 uppercase block">Family Medical History & Role</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(selectedPatientForModal.medical_history.family_medical_history) ? (
                      selectedPatientForModal.medical_history.family_medical_history.map((f, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200">
                          {f}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500">None reported</span>
                    )}
                  </div>
                  {selectedPatientForModal.medical_history.family_role && (
                    <p className="text-slate-700 pt-1">
                      <span className="font-semibold">Support Structure: </span>
                      {selectedPatientForModal.medical_history.family_role}
                    </p>
                  )}
                </div>

                {/* Surgeries & Allergies */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-700 uppercase block">Surgeries & Hospitalizations</span>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(selectedPatientForModal.medical_history.surgeries_and_hospitalizations) ? (
                        selectedPatientForModal.medical_history.surgeries_and_hospitalizations.map((s, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200 text-[11px]">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500">None</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-700 uppercase block">Known Allergies</span>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(selectedPatientForModal.medical_history.known_allergies) ? (
                        selectedPatientForModal.medical_history.known_allergies.map((a, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[11px]">
                            {a}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500">None</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lifestyle */}
                {selectedPatientForModal.medical_history.lifestyle && (
                  <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1.5">
                    <span className="font-bold text-slate-700 uppercase block">Lifestyle & Habits</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Smoking</span>
                        <span className="font-semibold text-slate-800">{selectedPatientForModal.medical_history.lifestyle.smoking}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Alcohol</span>
                        <span className="font-semibold text-slate-800">{selectedPatientForModal.medical_history.lifestyle.alcohol}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Activity</span>
                        <span className="font-semibold text-slate-800">{selectedPatientForModal.medical_history.lifestyle.physical_activity}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Diet</span>
                        <span className="font-semibold text-slate-800">{selectedPatientForModal.medical_history.lifestyle.diet}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Medications */}
                <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-700 uppercase block">Current Daily Medications</span>
                  <p className="text-slate-900">{selectedPatientForModal.medical_history.current_medications || 'None'}</p>
                </div>

              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs">
                No detailed medical history questionnaire record found for this patient.
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPatientForModal(null)}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition"
              >
                Close Medical File
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: Create Staff User */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="w-full max-w-md bg-white p-6 rounded border border-slate-200 shadow-lg space-y-3">
            <h3 className="text-base font-bold text-slate-900">Create Staff Member Account</h3>
            <p className="text-xs text-slate-500">Add an authorized staff member for any of the 4 access roles.</p>
            
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  required
                  placeholder="e.g. Ramesh Patel"
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. registrar@healthcare.local"
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  required
                  placeholder="10-digit mobile"
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role (4 Logins) *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-sm"
                >
                  <option value="registrar">1. User Registration (Registrar)</option>
                  <option value="collector">2. Healthcamps / Assistant Scan</option>
                  <option value="doctor">3. Doctor</option>
                  <option value="admin">4. Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="flex-1 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold shadow-sm"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Register Device */}
      {showCreateDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="w-full max-w-md bg-white p-6 rounded border border-slate-200 shadow-lg space-y-3">
            <h3 className="text-base font-bold text-slate-900">Register Medical Device</h3>
            <form onSubmit={handleCreateDevice} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Device Name *</label>
                <input
                  type="text"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  required
                  placeholder="e.g. Portable Vitals Monitor"
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Device ID / Serial Number *</label>
                <input
                  type="text"
                  value={newDeviceMAC}
                  onChange={(e) => setNewDeviceMAC(e.target.value)}
                  required
                  placeholder="e.g. DEV-HEALTH-001"
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 font-mono text-sm uppercase"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateDeviceModal(false)}
                  className="flex-1 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold shadow-sm"
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
