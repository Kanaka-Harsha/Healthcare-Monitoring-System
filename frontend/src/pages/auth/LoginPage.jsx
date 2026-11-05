import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import InstallAppButton from '../../components/common/InstallButton';

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'patient'
  const { login, loginPatient, loading } = useAuth();
  const navigate = useNavigate();

  // Staff Form State
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffError, setStaffError] = useState('');

  // Patient Form State
  const [patientPhone, setPatientPhone] = useState('');
  const [patientPin, setPatientPin] = useState('');
  const [patientError, setPatientError] = useState('');

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setStaffError('');
    if (!staffUsername.trim() || !staffPassword) {
      setStaffError('Please enter your username and password.');
      return;
    }

    const res = await login(staffUsername, staffPassword);
    if (res.success) {
      if (res.role === 'admin') navigate('/admin');
      else if (res.role === 'higher_authority') navigate('/analytics');
      else if (res.role === 'doctor') navigate('/doctor');
      else if (res.role === 'camp_assistant' || res.role === 'collector') navigate('/collector');
      else if (res.role === 'volunteer' || res.role === 'registrar') navigate('/registration');
      else navigate('/patient');
    } else {
      setStaffError(res.error);
    }
  };

  const handlePatientLogin = async (e) => {
    e.preventDefault();
    setPatientError('');
    const clean = patientPhone.replace(/\D/g, '').slice(-10);
    if (clean.length < 10) {
      setPatientError('Please enter your 10-digit mobile number.');
      return;
    }
    if (!patientPin) {
      setPatientError('Please enter your login PIN or password.');
      return;
    }

    const res = await loginPatient(clean, patientPin);
    if (res.success) {
      navigate('/patient');
    } else {
      setPatientError(res.error);
    }
  };

  // Quick-Fill Demo Logins for Fast Review
  const autofillUser = (role) => {
    if (role === 'admin') {
      setStaffUsername('admin');
      setStaffPassword('Admin@Healthcare2026');
    } else if (role === 'doctor') {
      setStaffUsername('dr_sarah');
      setStaffPassword('Doctor@123');
    } else if (role === 'camp_assistant') {
      setStaffUsername('assistant_alex');
      setStaffPassword('Assistant@123');
    } else if (role === 'volunteer') {
      setStaffUsername('volunteer_maya');
      setStaffPassword('Volunteer@123');
    } else if (role === 'higher_authority') {
      setStaffUsername('collector_rao');
      setStaffPassword('Authority@123');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 text-teal-800 font-bold text-xl mb-1 shadow-sm">
            SG
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome to SwasthGrama</h2>
          <p className="text-xs text-slate-500">
            Sign in to record health checks, access medical advice, or view public health analytics.
          </p>
        </div>

        {/* Tab Toggle: Staff / Higher Authority vs Citizen Patient */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => { setActiveTab('staff'); setStaffError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'staff'
                ? 'bg-white text-teal-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Staff & Authorities
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('patient'); setPatientError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'patient'
                ? 'bg-white text-teal-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Village Citizens / Patients
          </button>
        </div>

        {/* TAB 1: Staff & Authorities (Username & Password) */}
        {activeTab === 'staff' && (
          <form onSubmit={handleStaffLogin} className="space-y-4">
            {staffError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium">
                {staffError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
              <input
                type="text"
                required
                value={staffUsername}
                onChange={(e) => setStaffUsername(e.target.value)}
                placeholder="e.g. admin or dr_sarah"
                className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={staffPassword}
                onChange={(e) => setStaffPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Checking credentials...' : 'Sign In'}
            </button>

            {/* Quick Demo Fill Buttons */}
            <div className="pt-2 border-t border-slate-100">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2">
                Quick Test Credentials
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => autofillUser('admin')}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 font-semibold text-slate-800 text-center"
                >
                  App Admin
                </button>
                <button
                  type="button"
                  onClick={() => autofillUser('higher_authority')}
                  className="px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 font-semibold text-purple-900 border border-purple-200 text-center"
                >
                  Higher Authority
                </button>
                <button
                  type="button"
                  onClick={() => autofillUser('doctor')}
                  className="px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 font-semibold text-teal-900 border border-teal-200 text-center"
                >
                  Doctor
                </button>
                <button
                  type="button"
                  onClick={() => autofillUser('camp_assistant')}
                  className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 font-semibold text-blue-900 border border-blue-200 text-center"
                >
                  Assistant/Camp
                </button>
                <button
                  type="button"
                  onClick={() => autofillUser('volunteer')}
                  className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 font-semibold text-emerald-900 border border-emerald-200 text-center"
                >
                  Volunteer
                </button>
              </div>
            </div>

            <div className="text-center pt-2">
              <p className="text-[11px] text-slate-500">
                Are you a Doctor or Assistant/Camp without an account?{' '}
                <Link to="/signup" className="font-bold text-teal-800 hover:underline">
                  Sign Up Here
                </Link>
              </p>
            </div>
          </form>
        )}

        {/* TAB 2: Citizens / Patients (Phone Number + PIN) */}
        {activeTab === 'patient' && (
          <form onSubmit={handlePatientLogin} className="space-y-4">
            
            {/* Scanned in Village Notice */}
            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-teal-900 text-xs space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                Village Healthcamp Notice
              </span>
              <p className="text-[11px] text-teal-800 leading-relaxed">
                You can sign in after being scanned by our health worker in your village. Your 10-digit mobile number is your username.
              </p>
            </div>

            {patientError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium">
                {patientError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Registered Mobile Number</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 text-xs bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-slate-600 font-semibold">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  required
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Account PIN / Password
              </label>
              <input
                type="password"
                required
                value={patientPin}
                onChange={(e) => setPatientPin(e.target.value)}
                placeholder="PIN given at camp (or last 4 digits of phone)"
                className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Default PIN is usually the last 4 digits of your phone number unless you changed it.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Finding your records...' : 'View My Health Numbers'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default LoginPage;
