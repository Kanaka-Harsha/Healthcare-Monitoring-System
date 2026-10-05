import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import InstallAppButton from '../../components/common/InstallButton';

const CHRONIC_CONDITIONS = [
  'Hypertension',
  'Type 2 Diabetes',
  'Asthma / Respiratory',
  'Heart Disease',
  'Thyroid Disorder',
  'None / Healthy'
];

const SignupPage = () => {
  const [signupType, setSignupType] = useState('staff'); // 'staff' | 'patient'
  const { signupStaff, signupPatient, loading } = useAuth();
  const navigate = useNavigate();

  // Error & Status Feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Staff Form State
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffRole, setStaffRole] = useState('doctor'); // 'doctor' | 'registrar' | 'collector'
  const [staffPassword, setStaffPassword] = useState('');
  const [staffConfirmPassword, setStaffConfirmPassword] = useState('');

  // Patient Form State
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientAadhaar, setPatientAadhaar] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('Male');
  const [patientBloodGroup, setPatientBloodGroup] = useState('O+');
  const [patientAddress, setPatientAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [selectedConditions, setSelectedConditions] = useState([]);

  const toggleCondition = (cond) => {
    if (cond.startsWith('None')) {
      setSelectedConditions([cond]);
      return;
    }
    const filtered = selectedConditions.filter(c => !c.startsWith('None'));
    if (filtered.includes(cond)) {
      setSelectedConditions(filtered.filter(c => c !== cond));
    } else {
      setSelectedConditions([...filtered, cond]);
    }
  };

  const handleStaffSignup = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanPhone = staffPhone.replace(/\D/g, '').slice(-10);
    if (!staffName.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (staffPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (staffPassword !== staffConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const res = await signupStaff({
      full_name: staffName.trim(),
      email: staffEmail.trim() ? staffEmail.trim().toLowerCase() : null,
      phone: cleanPhone,
      role: staffRole,
      password: staffPassword,
      is_active: true
    });

    if (res.success) {
      setSuccessMsg('Account registered successfully! Redirecting to dashboard...');
      setTimeout(() => {
        if (res.role === 'admin') navigate('/admin');
        else if (res.role === 'doctor') navigate('/doctor');
        else if (res.role === 'collector') navigate('/collector');
        else if (res.role === 'registrar') navigate('/registration');
        else navigate('/patient');
      }, 800);
    } else {
      setErrorMsg(res.error);
    }
  };

  const handlePatientSignup = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanPhone = patientPhone.replace(/\D/g, '').slice(-10);
    const cleanAadhaar = patientAadhaar.replace(/\D/g, '');

    if (!patientName.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (cleanAadhaar.length !== 12) {
      setErrorMsg('Aadhaar number must be exactly 12 digits.');
      return;
    }

    const payload = {
      full_name: patientName.trim(),
      phone: cleanPhone,
      aadhaar_number: cleanAadhaar,
      age: patientAge ? parseInt(patientAge) : null,
      gender: patientGender,
      address: patientAddress.trim() || null,
      emergency_contact: {
        name: emergencyName.trim() || null,
        phone: emergencyPhone.replace(/\D/g, '').slice(-10) || null,
        blood_group: patientBloodGroup
      },
      medical_history: {
        past_medical_issues: selectedConditions.length > 0 ? selectedConditions : ['None Reported'],
        intake_notes: 'Self-registered patient via online portal.'
      }
    };

    const res = await signupPatient(payload);
    if (res.success) {
      setSuccessMsg('Patient account created! Redirecting to health records portal...');
      setTimeout(() => {
        navigate('/patient');
      }, 800);
    } else {
      setErrorMsg(res.error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      
      {/* Top Header Bar */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <img 
            src="/icon-192.png" 
            alt="SwasthGrama Logo" 
            className="w-9 h-9 rounded-lg object-contain shadow-sm border border-teal-100"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">SwasthGrama</span>
            <span className="block text-[10px] text-teal-800 font-medium">Healthcare Registration</span>
          </div>
        </div>
        <InstallAppButton />
      </div>

      {/* Main Container */}
      <div className="max-w-xl w-full mx-auto my-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Card Header & Tab Toggle */}
          <div className="p-5 sm:p-6 bg-slate-900 text-white">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Create an Account</h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Join SwasthGrama to manage village medical camps or view health records.
            </p>

            {/* Segmented Tab Switcher */}
            <div className="grid grid-cols-2 gap-2 mt-5 p-1 bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => { setSignupType('staff'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`py-2 px-3 rounded-md text-xs sm:text-sm font-semibold transition-all touch-target flex items-center justify-center gap-1.5 ${
                  signupType === 'staff'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>Medical Staff</span>
              </button>
              <button
                type="button"
                onClick={() => { setSignupType('patient'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`py-2 px-3 rounded-md text-xs sm:text-sm font-semibold transition-all touch-target flex items-center justify-center gap-1.5 ${
                  signupType === 'patient'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>Resident Patient</span>
              </button>
            </div>
          </div>

          {/* Alert Messages */}
          {errorMsg && (
            <div className="mx-5 sm:mx-6 mt-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mx-5 sm:mx-6 mt-5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
              {successMsg}
            </div>
          )}

          {/* Form Content */}
          <div className="p-5 sm:p-6">
            
            {/* 1. MEDICAL STAFF SIGNUP */}
            {signupType === 'staff' ? (
              <form onSubmit={handleStaffSignup} className="space-y-4">
                
                {/* Role Selector Cards */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Select Your Role *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      { role: 'doctor', title: 'Doctor', desc: 'Consultations, Clinical notes & Rx' },
                      { role: 'registrar', title: 'Registrar', desc: 'Patient onboarding & medical histories' },
                      { role: 'collector', title: 'Assistant', desc: 'Camp screenings & Bluetooth vitals' }
                    ].map((item) => (
                      <div
                        key={item.role}
                        onClick={() => setStaffRole(item.role)}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                          staffRole === item.role
                            ? 'bg-teal-50/80 border-teal-700 ring-1 ring-teal-700'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">{item.title}</span>
                          <span className={`w-3 h-3 rounded-full border ${
                            staffRole === item.role ? 'bg-teal-700 border-teal-700' : 'border-slate-300'
                          }`}></span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    placeholder="Dr. Rajesh Kumar / Anjali Sharma"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile Number (10 Digits) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={staffPhone}
                      onChange={(e) => setStaffPhone(e.target.value)}
                      placeholder="9876543210"
                      maxLength={10}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={staffEmail}
                      onChange={(e) => setStaffEmail(e.target.value)}
                      placeholder="doctor@hospital.org"
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Create Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={staffConfirmPassword}
                      onChange={(e) => setStaffConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 rounded-lg bg-teal-800 hover:bg-teal-900 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2 touch-target disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="spinner-white"></span>
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Register as {staffRole.charAt(0).toUpperCase() + staffRole.slice(1)}</span>
                  )}
                </button>
              </form>
            ) : (
              
              /* 2. PATIENT SELF SIGNUP */
              <form onSubmit={handlePatientSignup} className="space-y-4">
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Patient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile Number (10 Digits) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="10-digit mobile"
                      maxLength={10}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Aadhaar Number (12 Digits) *
                    </label>
                    <input
                      type="text"
                      required
                      value={patientAadhaar}
                      onChange={(e) => setPatientAadhaar(e.target.value)}
                      placeholder="12-digit Aadhaar number"
                      maxLength={12}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-slate-900 font-mono text-sm focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Age</label>
                    <input
                      type="number"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      placeholder="e.g. 35"
                      min="1"
                      max="120"
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
                    <select
                      value={patientBloodGroup}
                      onChange={(e) => setPatientBloodGroup(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Village / Town Address
                  </label>
                  <input
                    type="text"
                    value={patientAddress}
                    onChange={(e) => setPatientAddress(e.target.value)}
                    placeholder="Village name, District"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Emergency Contact Name
                    </label>
                    <input
                      type="text"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="Spouse / Parent / Child name"
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Emergency Phone Number
                    </label>
                    <input
                      type="tel"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="10-digit mobile"
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700"
                    />
                  </div>
                </div>

                {/* Known Conditions Quick Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Known Medical Issues (Tap to select)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {CHRONIC_CONDITIONS.map((c) => {
                      const isSel = selectedConditions.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleCondition(c)}
                          className={`px-2.5 py-1.5 rounded text-xs font-medium text-left border transition ${
                            isSel
                              ? 'bg-teal-50 border-teal-600 text-teal-900 font-semibold'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {c} {isSel && '✓'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 rounded-lg bg-teal-800 hover:bg-teal-900 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2 touch-target disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="spinner-white"></span>
                      <span>Creating Patient Profile...</span>
                    </>
                  ) : (
                    <span>Register Patient Profile</span>
                  )}
                </button>
              </form>
            )}

            {/* Bottom Nav / Back to Login */}
            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-600">
                Already registered?{' '}
                <Link to="/login" className="font-semibold text-teal-700 hover:text-teal-800 hover:underline">
                  Sign in here
                </Link>
              </p>
            </div>

          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500 mt-4">
          SwasthGrama Rural Telehealth &copy; {new Date().getFullYear()}. All health data encrypted and audit logged.
        </p>
      </div>

    </div>
  );
};

export default SignupPage;
