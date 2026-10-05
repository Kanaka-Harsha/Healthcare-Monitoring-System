import React, { useState, useEffect } from 'react';
import api, { extractErrorMessage } from '../../services/api';

const CHRONIC_CONDITIONS_LIST = [
  'Hypertension (High Blood Pressure)',
  'Type 2 Diabetes Mellitus',
  'Asthma / Respiratory Illness',
  'Coronary Artery Disease',
  'Thyroid Disorder',
  'Chronic Kidney Disease',
  'None / No Known Chronic Illness'
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'patients' | 'vitalsLogs' | 'devices' | 'audits'
  
  // Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Users Management State
  const [users, setUsers] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  // User Form State (Create / Edit)
  const [userFullName, setUserFullName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userRole, setUserRole] = useState('doctor');
  const [userPassword, setUserPassword] = useState('');
  const [userActionMsg, setUserActionMsg] = useState(null);
  const [userSubmitting, setUserSubmitting] = useState(false);

  // Device Management State
  const [devices, setDevices] = useState([]);
  const [showCreateDeviceModal, setShowCreateDeviceModal] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceMAC, setNewDeviceMAC] = useState('');
  const [newDeviceCollector, setNewDeviceCollector] = useState('');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);

  // Patients Management State
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientForModal, setSelectedPatientForModal] = useState(null);
  const [showCreatePatientModal, setShowCreatePatientModal] = useState(false);
  const [deletingPatient, setDeletingPatient] = useState(null);
  const [patientActionMsg, setPatientActionMsg] = useState(null);
  const [patientSubmitting, setPatientSubmitting] = useState(false);

  // Admin New Patient Form State
  const [newPatName, setNewPatName] = useState('');
  const [newPatPhone, setNewPatPhone] = useState('');
  const [newPatAadhaar, setNewPatAadhaar] = useState('');
  const [newPatAge, setNewPatAge] = useState('');
  const [newPatGender, setNewPatGender] = useState('Male');
  const [newPatBloodGroup, setNewPatBloodGroup] = useState('O+');
  const [newPatAddress, setNewPatAddress] = useState('');
  const [newPatEmergName, setNewPatEmergName] = useState('');
  const [newPatEmergPhone, setNewPatEmergPhone] = useState('');
  const [newPatConditions, setNewPatConditions] = useState([]);

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
      const res = await api.get(`/admin/patients${query ? `?search=${encodeURIComponent(query)}` : ''}`);
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

  // User Management Handlers
  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setUserFullName('');
    setUserEmail('');
    setUserPhone('');
    setUserRole('doctor');
    setUserPassword('');
    setShowCreateUserModal(true);
  };

  const handleOpenEditUser = (user) => {
    setEditingUser(user);
    setUserFullName(user.full_name);
    setUserEmail(user.email || '');
    setUserPhone(user.phone);
    setUserRole(user.role);
    setUserPassword('');
    setShowCreateUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setUserActionMsg(null);
    setUserSubmitting(true);

    const cleanPhone = userPhone.replace(/\D/g, '').slice(-10);
    if (!userFullName.trim()) {
      setUserActionMsg({ type: 'error', text: 'Full Name is required.' });
      setUserSubmitting(false);
      return;
    }
    if (cleanPhone.length < 10) {
      setUserActionMsg({ type: 'error', text: 'Please enter a valid 10-digit mobile number.' });
      setUserSubmitting(false);
      return;
    }

    try {
      if (editingUser) {
        // Update user & allocate password if provided
        const payload = {
          full_name: userFullName.trim(),
          email: userEmail.trim() ? userEmail.trim().toLowerCase() : null,
          phone: cleanPhone,
          role: userRole,
        };
        if (userPassword.trim()) {
          payload.password = userPassword.trim();
        }
        await api.put(`/admin/users/${editingUser.id}`, payload);
        setUserActionMsg({ type: 'success', text: `Account for ${userFullName} updated successfully.` });
      } else {
        // Create new user & allocate credentials
        if (!userPassword.trim() || userPassword.length < 6) {
          setUserActionMsg({ type: 'error', text: 'Initial password must be at least 6 characters.' });
          setUserSubmitting(false);
          return;
        }
        await api.post('/admin/users', {
          full_name: userFullName.trim(),
          email: userEmail.trim() ? userEmail.trim().toLowerCase() : null,
          phone: cleanPhone,
          role: userRole,
          password: userPassword.trim(),
          is_active: true
        });
        setUserActionMsg({ type: 'success', text: `Staff account for ${userFullName} (${userRole}) created with allocated password.` });
      }

      setShowCreateUserModal(false);
      fetchUsers();
    } catch (err) {
      setUserActionMsg({
        type: 'error',
        text: extractErrorMessage(err, 'Failed to save user account. Please check data.')
      });
    } finally {
      setUserSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setUserSubmitting(true);
    try {
      await api.delete(`/admin/users/${deletingUser.id}`);
      setUserActionMsg({ type: 'success', text: `User ${deletingUser.full_name} was deleted successfully.` });
      setDeletingUser(null);
      fetchUsers();
    } catch (err) {
      setUserActionMsg({
        type: 'error',
        text: extractErrorMessage(err, 'Could not delete user.')
      });
    } finally {
      setUserSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      await api.put(`/admin/users/${userId}/status?is_active=${!currentStatus}`);
      fetchUsers();
    } catch (err) {
      setUserActionMsg({
        type: 'error',
        text: extractErrorMessage(err, 'Could not update user status.')
      });
    }
  };

  // Patient Management Handlers
  const handleAdminCreatePatient = async (e) => {
    e.preventDefault();
    setPatientActionMsg(null);
    setPatientSubmitting(true);

    const cleanPhone = newPatPhone.replace(/\D/g, '').slice(-10);
    const cleanAadhaar = newPatAadhaar.replace(/\D/g, '');

    if (!newPatName.trim()) {
      setPatientActionMsg({ type: 'error', text: 'Patient full name is required.' });
      setPatientSubmitting(false);
      return;
    }
    if (cleanPhone.length < 10) {
      setPatientActionMsg({ type: 'error', text: 'Valid 10-digit mobile is required.' });
      setPatientSubmitting(false);
      return;
    }
    if (cleanAadhaar.length !== 12) {
      setPatientActionMsg({ type: 'error', text: 'Aadhaar must be exactly 12 digits.' });
      setPatientSubmitting(false);
      return;
    }

    const payload = {
      full_name: newPatName.trim(),
      phone: cleanPhone,
      aadhaar_number: cleanAadhaar,
      age: newPatAge ? parseInt(newPatAge) : null,
      gender: newPatGender,
      address: newPatAddress.trim() || null,
      emergency_contact: {
        name: newPatEmergName.trim() || null,
        phone: newPatEmergPhone.replace(/\D/g, '').slice(-10) || null,
        blood_group: newPatBloodGroup
      },
      medical_history: {
        past_medical_issues: newPatConditions.length > 0 ? newPatConditions : ['None Reported'],
        intake_notes: 'Created directly via Admin Management Console.'
      }
    };

    try {
      await api.post('/admin/patients', payload);
      setPatientActionMsg({ type: 'success', text: `Patient ${newPatName} registered successfully.` });
      setShowCreatePatientModal(false);
      setNewPatName('');
      setNewPatPhone('');
      setNewPatAadhaar('');
      setNewPatAge('');
      setNewPatAddress('');
      setNewPatEmergName('');
      setNewPatEmergPhone('');
      setNewPatConditions([]);
      fetchPatients();
    } catch (err) {
      setPatientActionMsg({
        type: 'error',
        text: extractErrorMessage(err, 'Failed to create patient record.')
      });
    } finally {
      setPatientSubmitting(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!deletingPatient) return;
    setPatientSubmitting(true);
    try {
      await api.delete(`/admin/patients/${deletingPatient.id}`);
      setPatientActionMsg({ type: 'success', text: `Patient ${deletingPatient.full_name} and history were deleted.` });
      setDeletingPatient(null);
      fetchPatients();
    } catch (err) {
      setPatientActionMsg({
        type: 'error',
        text: extractErrorMessage(err, 'Could not delete patient record.')
      });
    } finally {
      setPatientSubmitting(false);
    }
  };

  const togglePatientCondition = (c) => {
    if (c.startsWith('None')) {
      setNewPatConditions([c]);
      return;
    }
    const filtered = newPatConditions.filter(item => !item.startsWith('None'));
    if (filtered.includes(c)) {
      setNewPatConditions(filtered.filter(item => item !== c));
    } else {
      setNewPatConditions([...filtered, c]);
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

  // Filtered lists
  const filteredUsers = users.filter((u) => {
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesSearch = !userSearch || 
      u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.phone.includes(userSearch) ||
      (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  const filteredVitals = vitalsLogs.filter((v) => {
    if (!vitalsSearch) return true;
    const s = vitalsSearch.toLowerCase();
    return (
      (v.patient_name && v.patient_name.toLowerCase().includes(s)) ||
      (v.patient_phone && v.patient_phone.includes(s)) ||
      (v.device_id && v.device_id.toLowerCase().includes(s))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
            SwasthGrama Admin Portal
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            System Administration & User Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Provision staff accounts, allocate credentials, manage patient registries, and monitor healthcamps.
          </p>
        </div>
      </div>

      {/* Responsive Horizontal Tabs */}
      <div className="horizontal-scroll-touch pb-1">
        <div className="flex space-x-1.5 border-b border-slate-200 min-w-max">
          {[
            { id: 'overview', label: '📊 System Analytics' },
            { id: 'users', label: `👥 Staff & Doctors (${users.length})` },
            { id: 'patients', label: `🧑‍⚕️ Patients (${patients.length})` },
            { id: 'vitalsLogs', label: '💓 Live Camp Telemetry' },
            { id: 'devices', label: '📡 BLE Monitors' },
            { id: 'audits', label: '🔒 Security Audits' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 px-3.5 text-xs sm:text-sm font-semibold rounded-t-lg transition whitespace-nowrap touch-target ${
                activeTab === tab.id
                  ? 'bg-white border-t-2 border-l border-r border-slate-200 border-t-teal-700 text-teal-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Global Alerts */}
      {userActionMsg && (
        <div className={`p-3.5 rounded-lg text-xs font-medium border flex items-center justify-between ${
          userActionMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          <span>{userActionMsg.text}</span>
          <button onClick={() => setUserActionMsg(null)} className="font-bold text-sm px-2">✕</button>
        </div>
      )}
      {patientActionMsg && (
        <div className={`p-3.5 rounded-lg text-xs font-medium border flex items-center justify-between ${
          patientActionMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          <span>{patientActionMsg.text}</span>
          <button onClick={() => setPatientActionMsg(null)} className="font-bold text-sm px-2">✕</button>
        </div>
      )}

      {/* TAB 1: System Analytics Overview */}
      {activeTab === 'overview' && analytics && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold block">Total Screenings</span>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{analytics.total_screenings}</div>
              <p className="text-[11px] text-teal-700 mt-0.5">{analytics.recent_screenings_count_24h} in past 24 hrs</p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold block">Registered Patients</span>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{analytics.total_patients}</div>
              <p className="text-[11px] text-slate-600 mt-0.5">Medical Profiles Saved</p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold block">Vitals Flags</span>
              <div className="text-2xl sm:text-3xl font-bold text-rose-800 mt-1">{analytics.vitals_anomalies_count}</div>
              <p className="text-[11px] text-rose-700 mt-0.5">High BP / SpO2 Alert</p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold block">Authorized Staff</span>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                {analytics.total_doctors + analytics.total_collectors}
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {analytics.total_doctors} Doctors • {analytics.total_collectors} Field Staff
              </p>
            </div>
          </div>

          {/* Quick Audits List */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Recent Security & Login Audits</h3>
              <button
                onClick={() => setActiveTab('audits')}
                className="text-xs text-teal-800 hover:underline font-semibold"
              >
                View Full Logs &rarr;
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {analytics.recent_audit_logs.map((log) => (
                <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold uppercase">
                      {log.action}
                    </span>
                    <span className="text-slate-800 font-medium">{log.details}</span>
                  </div>
                  <span className="text-slate-500 font-mono text-[11px]">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Staff & Doctor Management */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          
          {/* Controls Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Staff Account Management</h3>
              <p className="text-xs text-slate-500">Allocate User IDs, passwords, and manage Doctor/Registrar roles.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search staff..."
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-700 w-full sm:w-48"
              />

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
              >
                <option value="all">All Roles</option>
                <option value="doctor">Doctors</option>
                <option value="registrar">Registrars</option>
                <option value="collector">Assistants</option>
                <option value="admin">Administrators</option>
              </select>

              <button
                onClick={handleOpenCreateUser}
                className="px-3.5 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 touch-target"
              >
                <span>+ Add Staff / Doctor</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="horizontal-scroll-touch">
              <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Staff Name</th>
                    <th className="p-3">Mobile Phone</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Role Assigned</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Created</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No staff accounts matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{u.full_name}</td>
                        <td className="p-3 font-mono font-medium">+91 {u.phone}</td>
                        <td className="p-3 text-slate-600">{u.email || '--'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            u.role === 'doctor' ? 'bg-indigo-50 text-indigo-900 border-indigo-200' :
                            u.role === 'registrar' ? 'bg-teal-50 text-teal-900 border-teal-200' :
                            u.role === 'collector' ? 'bg-amber-50 text-amber-900 border-amber-200' :
                            'bg-purple-50 text-purple-900 border-purple-200'
                          }`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3">
                          {u.is_active ? (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Active
                            </span>
                          ) : (
                            <span className="text-rose-700 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Deactivated
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold transition"
                            title="Edit details and allocate new password"
                          >
                            Edit / Password
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                            className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                              u.is_active
                                ? 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {u.is_active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => setDeletingUser(u)}
                            className="px-2 py-1 rounded bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 text-[11px] font-semibold transition"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Patients Management */}
      {activeTab === 'patients' && (
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Registered Patient Records</h3>
              <p className="text-xs text-slate-500">Search, create, view health questionnaires, or delete patient profiles.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => {
                  setPatientSearch(e.target.value);
                  fetchPatients(e.target.value);
                }}
                placeholder="Search by name, phone, Aadhaar..."
                className="w-full sm:w-64 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
              />
              <button
                onClick={() => setShowCreatePatientModal(true)}
                className="px-3.5 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 touch-target"
              >
                <span>+ Add New Patient</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="horizontal-scroll-touch">
              <table className="w-full text-left text-xs text-slate-700 min-w-[750px]">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Full Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Aadhaar (Masked)</th>
                    <th className="p-3">Age / Gender</th>
                    <th className="p-3">Health Questionnaire</th>
                    <th className="p-3">Registered On</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No patient records found. Click '+ Add New Patient' to register one.
                      </td>
                    </tr>
                  ) : (
                    patients.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{p.full_name}</td>
                        <td className="p-3 font-mono">+91 {p.phone}</td>
                        <td className="p-3 font-mono text-slate-700">{p.aadhaar_masked}</td>
                        <td className="p-3">{p.age || '--'} yrs • {p.gender || '--'}</td>
                        <td className="p-3">
                          {p.medical_history ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[11px] font-semibold">
                              Recorded
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px]">
                              Basic
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {new Date(p.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedPatientForModal(p)}
                            className="px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-semibold transition"
                          >
                            Health File
                          </button>
                          <button
                            onClick={() => setDeletingPatient(p)}
                            className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold transition"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Live Healthcamp Telemetry Logs */}
      {activeTab === 'vitalsLogs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Healthcamp Live Telemetry Logs</h3>
              <p className="text-xs text-slate-500">All screenings performed across village medical camps.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={vitalsSearch}
                onChange={(e) => setVitalsSearch(e.target.value)}
                placeholder="Filter patient, device..."
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 w-full sm:w-56"
              />
              <button
                onClick={fetchVitalsLogs}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="horizontal-scroll-touch">
              <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Recorded At</th>
                    <th className="p-3">Patient</th>
                    <th className="p-3">Blood Pressure</th>
                    <th className="p-3">Heart Rate</th>
                    <th className="p-3">SpO2</th>
                    <th className="p-3">Temp</th>
                    <th className="p-3">Device / Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVitals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        {loadingVitals ? 'Loading screening records...' : 'No screening records found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredVitals.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono text-slate-500">
                          {new Date(v.recorded_at).toLocaleDateString()} {new Date(v.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-900">{v.patient_name || 'Patient'}</span>
                          <span className="text-[11px] text-slate-500 block font-mono">+91 {v.patient_phone}</span>
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {v.systolic_bp ?? '--'} / {v.diastolic_bp ?? '--'} mmHg
                        </td>
                        <td className="p-3 font-semibold text-slate-800">
                          {v.heart_rate ? `${v.heart_rate} BPM` : '--'}
                        </td>
                        <td className="p-3">
                          <span className={`font-bold ${v.spo2 && v.spo2 < 92 ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {v.spo2 ? `${v.spo2}%` : '--'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700">
                          {v.temperature ? `${v.temperature}°C` : '--'}
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">
                          {v.device_id || 'Manual Entry'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Devices Registry */}
      {activeTab === 'devices' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Medical Devices & BLE Telemetry Fleet</h3>
              <p className="text-xs text-slate-500">Authorized medical monitors and Bluetooth ESP32 devices.</p>
            </div>
            <button
              onClick={() => setShowCreateDeviceModal(true)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-teal-800 hover:bg-teal-900 text-white transition touch-target"
            >
              + Register Device
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {devices.length === 0 ? (
              <div className="sm:col-span-3 p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                No medical devices registered yet. Click '+ Register Device' to add one.
              </div>
            ) : (
              devices.map((d) => (
                <div key={d.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{d.device_name}</span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Authorized
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-500">{d.device_mac}</p>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                    Assigned Staff: <strong>{d.assigned_collector_name || 'Field Camp Pool'}</strong>
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
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Security & Access Audit Logs</h3>
              <p className="text-xs text-slate-500">Immutable record of logins, patient data views, and doctor consultations.</p>
            </div>
            <button
              onClick={fetchAuditLogs}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Refresh
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="horizontal-scroll-touch">
              <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Actor / Staff</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Resource</th>
                    <th className="p-3">Event Details</th>
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
        </div>
      )}

      {/* ============================================================ */}
      {/* MODALS */}
      {/* ============================================================ */}

      {/* MODAL 1: Create / Edit Staff & Doctor User */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingUser ? `Edit Staff Account: ${editingUser.full_name}` : 'Provision Staff Account'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingUser ? 'Update role or allocate a new password' : 'Create new authorized staff and assign password credentials'}
                </p>
              </div>
              <button
                onClick={() => setShowCreateUserModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={userFullName}
                  onChange={(e) => setUserFullName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone (10 Digits) *</label>
                  <input
                    type="tel"
                    required
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="9876543210"
                    maxLength={10}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="doctor@hospital.org"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">System Role *</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700"
                >
                  <option value="doctor">Doctor (Consultations, Prescriptions & Notes)</option>
                  <option value="registrar">Registrar (Patient Onboarding & Health History)</option>
                  <option value="collector">Healthcamp Assistant (BLE Vitals Screening)</option>
                  <option value="admin">Administrator (System Management & Audits)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {editingUser ? 'Allocate New Password (Leave blank to keep unchanged)' : 'Allocate User Password *'}
                </label>
                <input
                  type="password"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder={editingUser ? 'Enter new password if changing...' : 'Min 6 characters'}
                  required={!editingUser}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="flex-1 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={userSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold shadow-sm transition disabled:opacity-60"
                >
                  {userSubmitting ? 'Saving Account...' : editingUser ? 'Update Credentials' : 'Create & Allocate'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: Delete Staff User Confirmation */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white p-5 rounded-2xl border border-slate-200 shadow-xl space-y-3">
            <h3 className="text-base font-bold text-rose-900">Confirm Account Deletion</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to permanently delete <strong>{deletingUser.full_name}</strong> ({deletingUser.role})? This action cannot be undone.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={userSubmitting}
                className="flex-1 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold transition"
              >
                {userSubmitting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Admin Direct Create Patient */}
      {showCreatePatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Admin Patient Registration</h3>
                <p className="text-xs text-slate-500">Directly add a resident patient with Aadhaar and health history.</p>
              </div>
              <button
                onClick={() => setShowCreatePatientModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdminCreatePatient} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newPatName}
                    onChange={(e) => setNewPatName(e.target.value)}
                    placeholder="Patient full name"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={newPatPhone}
                    onChange={(e) => setNewPatPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    maxLength={10}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Aadhaar (12 Digits) *</label>
                  <input
                    type="text"
                    required
                    value={newPatAadhaar}
                    onChange={(e) => setNewPatAadhaar(e.target.value)}
                    placeholder="12-digit Aadhaar"
                    maxLength={12}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={newPatAge}
                    onChange={(e) => setNewPatAge(e.target.value)}
                    placeholder="e.g. 45"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={newPatGender}
                    onChange={(e) => setNewPatGender(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={newPatBloodGroup}
                    onChange={(e) => setNewPatBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  value={newPatAddress}
                  onChange={(e) => setNewPatAddress(e.target.value)}
                  placeholder="Village / Street name"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={newPatEmergName}
                    onChange={(e) => setNewPatEmergName(e.target.value)}
                    placeholder="Family member"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Mobile</label>
                  <input
                    type="tel"
                    value={newPatEmergPhone}
                    onChange={(e) => setNewPatEmergPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Known Medical Conditions</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {CHRONIC_CONDITIONS_LIST.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => togglePatientCondition(c)}
                      className={`px-2 py-1.5 rounded text-xs text-left border transition ${
                        newPatConditions.includes(c)
                          ? 'bg-teal-50 border-teal-600 text-teal-900 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      {c} {newPatConditions.includes(c) && '✓'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreatePatientModal(false)}
                  className="flex-1 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={patientSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold shadow-sm transition disabled:opacity-60"
                >
                  {patientSubmitting ? 'Registering Patient...' : 'Register Patient'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 4: Delete Patient Confirmation */}
      {deletingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white p-5 rounded-2xl border border-slate-200 shadow-xl space-y-3">
            <h3 className="text-base font-bold text-rose-900">Confirm Patient Record Deletion</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to permanently delete patient <strong>{deletingPatient.full_name}</strong> (+91 {deletingPatient.phone})? This will also remove their screening telemetry and medical history.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPatient(null)}
                className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePatient}
                disabled={patientSubmitting}
                className="flex-1 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold transition"
              >
                {patientSubmitting ? 'Deleting...' : 'Delete Patient Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: View Patient Medical Questionnaire */}
      {selectedPatientForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedPatientForModal.full_name}</h3>
                <p className="text-xs text-slate-600">
                  Phone: +91 {selectedPatientForModal.phone} • Aadhaar: {selectedPatientForModal.aadhaar_masked} • {selectedPatientForModal.age || 'N/A'} yrs ({selectedPatientForModal.gender || 'N/A'})
                </p>
              </div>
              <button
                onClick={() => setSelectedPatientForModal(null)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold p-1"
              >
                ✕
              </button>
            </div>

            {selectedPatientForModal.medical_history ? (
              <div className="space-y-3.5 text-xs">
                
                {/* Chronic conditions */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
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
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
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
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
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

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
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
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
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
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
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
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition"
              >
                Close Medical File
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 6: Register Device */}
      {showCreateDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xl space-y-3">
            <h3 className="text-base font-bold text-slate-900">Register Medical Device</h3>
            <form onSubmit={handleCreateDevice} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Device Name *</label>
                <input
                  type="text"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  required
                  placeholder="e.g. ESP32 Portable Vitals Unit"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm"
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-mono text-sm uppercase"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateDeviceModal(false)}
                  className="flex-1 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold shadow-sm"
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
