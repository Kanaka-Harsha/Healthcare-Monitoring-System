import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api, { extractErrorMessage } from '../../services/api';

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
  const [patientError, setPatientError] = useState('');
  const [patientSuccessMsg, setPatientSuccessMsg] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setStaffError('');
    if (!staffUsername || !staffPassword) {
      setStaffError('Please enter your username/email and password.');
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
        setPatientSuccessMsg(`Verification code sent to +91 ${clean}`);
      }
    } catch (err) {
      setPatientError(extractErrorMessage(err, 'Failed to send OTP. Make sure your phone number is registered.'));
    } finally {
      setOtpLoading(false);
    }
  };

  const handlePatientVerifyOtp = async (e) => {
    e.preventDefault();
    setPatientError('');
    if (!patientOtp) {
      setPatientError('Please enter the 6-digit code.');
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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md">
        
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-block w-12 h-12 rounded bg-teal-800 text-white font-bold text-lg leading-[48px] text-center mb-3">
            SG
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            SwastGrama
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Rural Healthcare Monitoring & Medical Records Portal
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-200 p-1 rounded flex items-center mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`flex-1 py-2 text-xs font-semibold rounded transition ${
              activeTab === 'staff'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Staff & Doctor Login
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('patient')}
            className={`flex-1 py-2 text-xs font-semibold rounded transition ${
              activeTab === 'patient'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Patient Portal (SMS OTP)
          </button>
        </div>

        {/* Tab 1: Staff Login */}
        {activeTab === 'staff' && (
          <div className="bg-white p-6 sm:p-7 rounded border border-slate-200 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Staff Portal Access
            </h2>

            <form onSubmit={handleStaffLogin} className="space-y-4">
              
              {staffError && (
                <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                  {staffError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email or Username
                </label>
                <input
                  type="text"
                  value={staffUsername}
                  onChange={(e) => setStaffUsername(e.target.value)}
                  placeholder="doctor@healthcare.local"
                  required
                  className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded bg-teal-800 hover:bg-teal-900 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="spinner-white"></span>
                    <span>Signing in, please wait...</span>
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Quick Demo Credentials */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 font-medium text-center mb-2">
                Quick Role Selector (Testing):
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => autofillStaff('registrar')}
                  className="px-2 py-1.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs text-slate-700 font-medium transition text-center"
                >
                  1. User Registration
                </button>
                <button
                  type="button"
                  onClick={() => autofillStaff('collector')}
                  className="px-2 py-1.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs text-slate-700 font-medium transition text-center"
                >
                  2. Healthcamp Assistant
                </button>
                <button
                  type="button"
                  onClick={() => autofillStaff('doctor')}
                  className="px-2 py-1.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs text-slate-700 font-medium transition text-center"
                >
                  3. Doctor
                </button>
                <button
                  type="button"
                  onClick={() => autofillStaff('admin')}
                  className="px-2 py-1.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs text-slate-700 font-medium transition text-center"
                >
                  4. Administrator
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Patient OTP Login */}
        {activeTab === 'patient' && (
          <div className="bg-white p-6 sm:p-7 rounded border border-slate-200 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Patient Portal Access
            </h2>

            {!otpSent ? (
              <form onSubmit={handleRequestPatientOtp} className="space-y-4">
                
                {patientError && (
                  <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                    {patientError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registered Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    required
                    className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    A 6-digit SMS verification code will be sent to your phone.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={otpLoading}
                  className="w-full py-2.5 px-4 rounded bg-teal-800 hover:bg-teal-900 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
                >
                  {otpLoading ? (
                    <>
                      <span className="spinner-white"></span>
                      <span>Sending code via SMS...</span>
                    </>
                  ) : (
                    'Send Verification Code'
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handlePatientVerifyOtp} className="space-y-4">
                
                {patientSuccessMsg && (
                  <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
                    {patientSuccessMsg}
                  </div>
                )}

                {patientError && (
                  <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                    {patientError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    value={patientOtp}
                    onChange={(e) => setPatientOtp(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    required
                    className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-center tracking-widest font-mono text-base focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded bg-teal-800 hover:bg-teal-900 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="spinner-white"></span>
                      <span>Verifying code...</span>
                    </>
                  ) : (
                    'Verify & View Records'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="w-full text-center text-xs text-slate-600 hover:text-slate-900 underline pt-1"
                >
                  Use a different mobile number
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
