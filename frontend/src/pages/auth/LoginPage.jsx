import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Activity, Shield, User, Stethoscope, Smartphone, Lock, Phone, KeyRound, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'patient'
  const { loginStaff, loginPatientWithOTP, loading } = useAuth();
  const navigate = useNavigate();

  // Staff Form State
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffError, setStaffError] = useState('');

  // Patient OTP Form State
  const [patientPhone, setPatientPhone] = useState('');
  const [patientOtp, setPatientOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState('');
  const [patientError, setPatientError] = useState('');
  const [patientSuccessMsg, setPatientSuccessMsg] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setStaffError('');
    if (!staffUsername || !staffPassword) {
      setStaffError('Please provide both username/phone and password.');
      return;
    }

    const res = await loginStaff(staffUsername, staffPassword);
    if (res.success) {
      if (res.role === 'admin') navigate('/admin');
      else if (res.role === 'doctor') navigate('/doctor');
      else if (res.role === 'collector') navigate('/collector');
      else if (res.role === 'registrar') navigate('/registration');
      else navigate('/patient');
    } else {
      setStaffError(res.error);
    }
  };

  const handleRequestPatientOtp = async (e) => {
    e.preventDefault();
    setPatientError('');
    setPatientSuccessMsg('');
    const clean = patientPhone.replace(/\D/g, '').slice(-10);
    if (clean.length < 10) {
      setPatientError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setOtpLoading(true);
    try {
      const res = await api.post('/auth/patient/request-otp', { phone: clean });
      if (res.data.success) {
        setOtpSent(true);
        setPatientSuccessMsg(`OTP sent to +91 ${clean}`);
        if (res.data.dev_otp) {
          setDevOtpHint(res.data.dev_otp);
          setPatientOtp(res.data.dev_otp); // Auto-fill for convenience in dev
        }
      }
    } catch (err) {
      setPatientError(err.response?.data?.detail || 'Failed to request OTP. Make sure you are registered.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handlePatientVerifyOtp = async (e) => {
    e.preventDefault();
    setPatientError('');
    if (!patientOtp) {
      setPatientError('Please enter the 6-digit OTP code.');
      return;
    }

    const res = await loginPatientWithOTP(patientPhone, patientOtp);
    if (res.success) {
      navigate('/patient');
    } else {
      setPatientError(res.error);
    }
  };

  // Demo Credentials Autofill
  const autofillStaff = (role) => {
    if (role === 'admin') {
      setStaffUsername('admin@healthcare.local');
      setStaffPassword('Admin@Healthcare2026');
    } else if (role === 'doctor') {
      setStaffUsername('doctor@healthcare.local');
      setStaffPassword('Doctor@123');
    } else if (role === 'collector') {
      setStaffUsername('collector@healthcare.local');
      setStaffPassword('Collector@123');
    } else if (role === 'registrar') {
      setStaffUsername('registrar@healthcare.local');
      setStaffPassword('Registrar@123');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 shadow-xl shadow-teal-500/20 mb-4">
            <Activity className="w-8 h-8 text-slate-950 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            HealthPulse Access
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Secure Healthcare Telemetry & Monitoring System
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="p-1 rounded-2xl glass-card flex items-center mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'staff'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" /> Medical & Staff Login
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('patient')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'patient'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" /> Patient Portal (OTP)
          </button>
        </div>

        {/* Tab 1: Staff Login */}
        {activeTab === 'staff' && (
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl">
            <form onSubmit={handleStaffLogin} className="space-y-4">
              
              {staffError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-400" />
                  <span>{staffError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email or Phone Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={staffUsername}
                    onChange={(e) => setStaffUsername(e.target.value)}
                    placeholder="doctor@healthcare.local or 9876543210"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                  />
                  <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In to Portal'}
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </form>

            {/* Quick Demo Credentials for all 4 Logins */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <p className="text-[11px] text-slate-400 uppercase font-semibold text-center mb-2.5">
                Quick 4-Role Auto-Fill:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => autofillStaff('registrar')}
                  className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-[11px] text-emerald-400 font-medium transition text-center"
                >
                  1. Registration
                </button>
                <button
                  type="button"
                  onClick={() => autofillStaff('collector')}
                  className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-teal-500/40 text-[11px] text-teal-400 font-medium transition text-center"
                >
                  2. Healthcamp
                </button>
                <button
                  type="button"
                  onClick={() => autofillStaff('doctor')}
                  className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 text-[11px] text-blue-400 font-medium transition text-center"
                >
                  3. Doctor
                </button>
                <button
                  type="button"
                  onClick={() => autofillStaff('admin')}
                  className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 text-[11px] text-purple-400 font-medium transition text-center"
                >
                  4. Admin
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Patient OTP Login */}
        {activeTab === 'patient' && (
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl">
            {!otpSent ? (
              <form onSubmit={handleRequestPatientOtp} className="space-y-4">
                
                {patientError && (
                  <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-400" />
                    <span>{patientError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Registered Mobile Number
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                    />
                    <Phone className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    We will send a 6-digit verification code to view your vitals and medical file.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={otpLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                >
                  {otpLoading ? 'Sending OTP...' : 'Send Verification OTP'}
                  <KeyRound className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>
            ) : (
              <form onSubmit={handlePatientVerifyOtp} className="space-y-4">
                
                {patientSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-start gap-2.5 text-emerald-300 text-xs">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" />
                    <div>
                      <span>{patientSuccessMsg}</span>
                      {devOtpHint && (
                        <p className="mt-1 font-mono text-[11px] text-emerald-200">
                          Dev Code: <strong>{devOtpHint}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {patientError && (
                  <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-400" />
                    <span>{patientError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Enter 6-Digit OTP
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={patientOtp}
                      onChange={(e) => setPatientOtp(e.target.value)}
                      placeholder="123456"
                      maxLength={6}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-center tracking-[0.4em] font-mono text-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                    />
                    <KeyRound className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Access My Health Records'}
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>

                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="w-full text-center text-xs text-slate-400 hover:text-white transition pt-2"
                >
                  Change mobile number
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default LoginPage;
