import React, { useState } from 'react';
import api, { extractErrorMessage } from '../../services/api';
import { 
  UserPlus, 
  User, 
  Phone, 
  CreditCard, 
  Calendar, 
  HeartPulse, 
  Activity, 
  Users, 
  AlertTriangle, 
  Scissors, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Save, 
  RefreshCw,
  Droplet
} from 'lucide-react';

const CHRONIC_CONDITIONS = [
  'Hypertension (High Blood Pressure)',
  'Type 2 Diabetes Mellitus',
  'Type 1 Diabetes Mellitus',
  'Asthma / Chronic Bronchitis',
  'Coronary Artery Disease',
  'Thyroid Disorder (Hypo/Hyper)',
  'Chronic Kidney Disease',
  'High Cholesterol / Dyslipidemia',
  'Arthritis / Joint Pain',
  'None / No Known Chronic Illness'
];

const FAMILY_HISTORY_OPTIONS = [
  'Father: Diabetes Mellitus',
  'Father: Heart Disease / CAD',
  'Father: Hypertension',
  'Mother: Diabetes Mellitus',
  'Mother: Hypertension',
  'Mother: Thyroid Disorder',
  'Siblings: Early Cardiovascular Disease',
  'Family History: Stroke',
  'Family History: Cancer',
  'No Known Family Medical Issues'
];

const FAMILY_ROLE_OPTIONS = [
  'Primary Breadwinner / Head of Household',
  'Lives with Nuclear Family (Spouse & Children)',
  'Lives with Joint / Extended Family (Active Caregiver Support)',
  'Lives Independently / Self-Managed',
  'Dependent on Family for Daily Medication & Medical Care'
];

const SURGERIES_OPTIONS = [
  'Cardiac Surgery (Bypass / Angioplasty / Stent)',
  'Abdominal Surgery (Appendectomy / Gallbladder / Hernia)',
  'Orthopedic Surgery (Fracture Fixation / Joint Replacement)',
  'Ophthalmic Surgery (Cataract / Eye Laser)',
  'ENT / Minor Surgery',
  'None / No Past Surgeries'
];

const ALLERGIES_OPTIONS = [
  'Penicillin / Amoxicillin',
  'Sulfa Drugs / Sulfonamides',
  'Aspirin / NSAIDs (Ibuprofen / Diclofenac)',
  'Food Allergies (Nuts / Dairy / Shellfish)',
  'Latex / Adhesive Bandages',
  'No Known Drug or Substance Allergies'
];

const UserRegistrationPage = () => {
  // Personal Details
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('Spouse');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Medical History Questionnaire
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [selectedFamilyHistory, setSelectedFamilyHistory] = useState([]);
  const [familyRole, setFamilyRole] = useState(FAMILY_ROLE_OPTIONS[0]);
  const [selectedSurgeries, setSelectedSurgeries] = useState([]);
  const [selectedAllergies, setSelectedAllergies] = useState([]);
  
  // Lifestyle
  const [smokingStatus, setSmokingStatus] = useState('Non-Smoker');
  const [alcoholStatus, setAlcoholStatus] = useState('Non-Drinker');
  const [physicalActivity, setPhysicalActivity] = useState('Moderate (3-4 times/week)');
  const [dietaryPreference, setDietaryPreference] = useState('Vegetarian');
  
  // Clinical Notes
  const [currentMedications, setCurrentMedications] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [createdPatient, setCreatedPatient] = useState(null);

  const toggleSelection = (item, list, setList) => {
    if (item.startsWith('None') || item.startsWith('No Known')) {
      setList([item]);
      return;
    }
    const filtered = list.filter(i => !i.startsWith('None') && !i.startsWith('No Known'));
    if (filtered.includes(item)) {
      setList(filtered.filter(i => i !== item));
    } else {
      setList([...filtered, item]);
    }
  };

  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setNotification(null);

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanAadhaar = aadhaar.replace(/\D/g, '');

    if (!fullName.trim()) {
      setNotification({ type: 'error', message: 'Patient full name is required.' });
      return;
    }
    if (cleanPhone.length < 10) {
      setNotification({ type: 'error', message: 'Please enter a valid 10-digit mobile number.' });
      return;
    }
    if (cleanAadhaar.length !== 12) {
      setNotification({ type: 'error', message: 'Aadhaar ID must be exactly 12 digits.' });
      return;
    }

    const payload = {
      full_name: fullName.trim(),
      phone: cleanPhone,
      aadhaar_number: cleanAadhaar,
      age: age ? parseInt(age) : null,
      gender,
      address: address.trim() || null,
      emergency_contact: {
        name: emergencyName.trim() || null,
        relation: emergencyRelation,
        phone: emergencyPhone.replace(/\D/g, '').slice(-10) || null,
        blood_group: bloodGroup
      },
      medical_history: {
        past_medical_issues: selectedConditions.length > 0 ? selectedConditions : ['None Reported'],
        family_medical_history: selectedFamilyHistory.length > 0 ? selectedFamilyHistory : ['None Reported'],
        family_role: familyRole,
        surgeries_and_hospitalizations: selectedSurgeries.length > 0 ? selectedSurgeries : ['None Reported'],
        known_allergies: selectedAllergies.length > 0 ? selectedAllergies : ['None Reported'],
        lifestyle: {
          smoking: smokingStatus,
          alcohol: alcoholStatus,
          physical_activity: physicalActivity,
          diet: dietaryPreference
        },
        current_medications: currentMedications.trim() || 'None',
        intake_notes: clinicalNotes.trim() || 'Intake questionnaire completed at registration desk.'
      }
    };

    setSubmitting(true);
    try {
      const res = await api.post('/collector/patient', payload);
      setCreatedPatient(res.data);
      setNotification({
        type: 'success',
        message: `Patient ${fullName} successfully registered! Medical history uploaded to database.`
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setNotification({
        type: 'error',
        message: extractErrorMessage(err, 'Failed to upload user registration. Please check fields and server connection.')
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setAadhaar('');
    setAge('');
    setGender('Male');
    setBloodGroup('O+');
    setAddress('');
    setEmergencyName('');
    setEmergencyRelation('Spouse');
    setEmergencyPhone('');
    setSelectedConditions([]);
    setSelectedFamilyHistory([]);
    setFamilyRole(FAMILY_ROLE_OPTIONS[0]);
    setSelectedSurgeries([]);
    setSelectedAllergies([]);
    setSmokingStatus('Non-Smoker');
    setAlcoholStatus('Non-Drinker');
    setPhysicalActivity('Moderate (3-4 times/week)');
    setDietaryPreference('Vegetarian');
    setCurrentMedications('');
    setClinicalNotes('');
    setCreatedPatient(null);
    setNotification(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <UserPlus className="w-3.5 h-3.5" /> User Registration Portal (New Patient Intake)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Patient Intake & Medical History
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Register new users, capture detailed medical background questionnaire, and sync directly with the central database.
          </p>
        </div>

        {createdPatient && (
          <button
            onClick={resetForm}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-sm font-semibold transition shadow-md"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            Register Another Patient
          </button>
        )}
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`mb-6 p-4 rounded-2xl flex items-start gap-3 border shadow-xl ${
          notification.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
          )}
          <div>
            <p className="text-sm font-semibold">{notification.message}</p>
          </div>
        </div>
      )}

      {/* Success Receipt Card */}
      {createdPatient && (
        <div className="mb-8 p-6 rounded-3xl glass-panel border border-emerald-500/30 bg-emerald-950/20 shadow-2xl">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Patient Record Created</h3>
                <p className="text-xs text-emerald-400">Database ID: {createdPatient.id}</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              Synced & Active
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block mb-1">Full Name</span>
              <span className="font-semibold text-white text-sm">{createdPatient.full_name}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block mb-1">Mobile</span>
              <span className="font-semibold text-white text-sm">+91 {createdPatient.phone}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block mb-1">Aadhaar (Masked)</span>
              <span className="font-semibold text-white text-sm font-mono">{createdPatient.aadhaar_masked}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block mb-1">Age / Gender</span>
              <span className="font-semibold text-white text-sm">{createdPatient.age || 'N/A'} yrs / {createdPatient.gender || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleRegisterPatient} className="space-y-8">
        
        {/* SECTION 1: Personal Demographics */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800/80">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">1. Personal & Demographic Details</h2>
              <p className="text-xs text-slate-400">Basic identification for Aadhaar verification and contact</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                />
                <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mobile Number <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                />
                <Phone className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Aadhaar Number (12 Digits) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={aadhaar}
                  onChange={(e) => setAadhaar(e.target.value)}
                  placeholder="123456789012"
                  maxLength={12}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                />
                <CreditCard className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Age
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 45"
                  min="1"
                  max="125"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                />
                <Calendar className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Blood Group
              </label>
              <div className="relative">
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
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
                <Droplet className="w-4 h-4 text-rose-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Residential Address / Village
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House No, Street, Village/City, District, State"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Emergency Contact & Family Liaison
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/70 border border-slate-800 text-white text-xs focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Relationship</label>
                <select
                  value={emergencyRelation}
                  onChange={(e) => setEmergencyRelation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/70 border border-slate-800 text-white text-xs focus:outline-none focus:border-teal-500"
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent (Father / Mother)</option>
                  <option value="Child">Child (Son / Daughter)</option>
                  <option value="Sibling">Sibling (Brother / Sister)</option>
                  <option value="Guardian">Guardian / Relative</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Emergency Phone</label>
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/70 border border-slate-800 text-white text-xs focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Doctor-Grade Medical History Questionnaire */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800/80">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">2. Medical History Questionnaire (Dropdown Options)</h2>
              <p className="text-xs text-slate-400">Structured clinical background for accurate doctor diagnosis & risk profiling</p>
            </div>
          </div>

          <div className="space-y-6">
            
            {/* 2.1 Past Medical Issues */}
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-2">
                A. Past Medical Issues & Chronic Illnesses (Select all that apply)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {CHRONIC_CONDITIONS.map((cond) => {
                  const isSelected = selectedConditions.includes(cond);
                  return (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => toggleSelection(cond, selectedConditions, setSelectedConditions)}
                      className={`px-3 py-2.5 rounded-xl text-left text-xs font-medium transition border flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-500/20 border-blue-500/40 text-blue-300 shadow-md shadow-blue-500/10'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                      }`}
                    >
                      <span>{cond}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2.2 Family Medical History */}
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-2">
                B. Family Medical History (Hereditary Risk Profile)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {FAMILY_HISTORY_OPTIONS.map((hist) => {
                  const isSelected = selectedFamilyHistory.includes(hist);
                  return (
                    <button
                      key={hist}
                      type="button"
                      onClick={() => toggleSelection(hist, selectedFamilyHistory, setSelectedFamilyHistory)}
                      className={`px-3 py-2.5 rounded-xl text-left text-xs font-medium transition border flex items-center justify-between ${
                        isSelected
                          ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-md shadow-purple-500/10'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                      }`}
                    >
                      <span>{hist}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2.3 Role of Family */}
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-2">
                C. Role of Family & Social Support Structure
              </label>
              <select
                value={familyRole}
                onChange={(e) => setFamilyRole(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
              >
                {FAMILY_ROLE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* 2.4 Past Surgeries */}
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-2">
                D. Past Surgeries & Major Hospitalizations
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {SURGERIES_OPTIONS.map((surg) => {
                  const isSelected = selectedSurgeries.includes(surg);
                  return (
                    <button
                      key={surg}
                      type="button"
                      onClick={() => toggleSelection(surg, selectedSurgeries, setSelectedSurgeries)}
                      className={`px-3 py-2.5 rounded-xl text-left text-xs font-medium transition border flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-md shadow-amber-500/10'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                      }`}
                    >
                      <span>{surg}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2.5 Drug & Environmental Allergies */}
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-2">
                E. Known Drug, Chemical & Food Allergies
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {ALLERGIES_OPTIONS.map((allg) => {
                  const isSelected = selectedAllergies.includes(allg);
                  return (
                    <button
                      key={allg}
                      type="button"
                      onClick={() => toggleSelection(allg, selectedAllergies, setSelectedAllergies)}
                      className={`px-3 py-2.5 rounded-xl text-left text-xs font-medium transition border flex items-center justify-between ${
                        isSelected
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-md shadow-rose-500/10'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                      }`}
                    >
                      <span>{allg}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 3: Lifestyle & Current Medications */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800/80">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">3. Lifestyle Habits & Ongoing Medications</h2>
              <p className="text-xs text-slate-400">Behavioral risk factors and current prescription regimen</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tobacco / Smoking</label>
              <select
                value={smokingStatus}
                onChange={(e) => setSmokingStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs focus:outline-none focus:border-teal-500"
              >
                <option value="Non-Smoker">Non-Smoker</option>
                <option value="Former Smoker">Former Smoker (Quit)</option>
                <option value="Occasional / Social">Occasional / Social</option>
                <option value="Daily Smoker (1-10/day)">Daily Smoker (1-10/day)</option>
                <option value="Heavy Smoker (>10/day)">Heavy Smoker (&gt;10/day)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Alcohol Consumption</label>
              <select
                value={alcoholStatus}
                onChange={(e) => setAlcoholStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs focus:outline-none focus:border-teal-500"
              >
                <option value="Non-Drinker">Non-Drinker (Teetotaler)</option>
                <option value="Occasional / Social">Occasional / Social</option>
                <option value="Moderate (1-2 drinks/wk)">Moderate (1-2 drinks/wk)</option>
                <option value="Regular / Daily">Regular / Daily</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Physical Activity</label>
              <select
                value={physicalActivity}
                onChange={(e) => setPhysicalActivity(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs focus:outline-none focus:border-teal-500"
              >
                <option value="Sedentary (No regular exercise)">Sedentary</option>
                <option value="Light (Walking 1-2x/wk)">Light Walking</option>
                <option value="Moderate (3-4 times/week)">Moderate (3-4x/week)</option>
                <option value="Active / Athletic">Active / Athletic</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Dietary Pattern</label>
              <select
                value={dietaryPreference}
                onChange={(e) => setDietaryPreference(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs focus:outline-none focus:border-teal-500"
              >
                <option value="Vegetarian">Vegetarian</option>
                <option value="Non-Vegetarian">Non-Vegetarian</option>
                <option value="Eggetarian">Eggetarian</option>
                <option value="Diabetic / Low-Salt Diet">Diabetic / Low-Salt Diet</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Current Daily Medications (Name & Dosage)
              </label>
              <textarea
                value={currentMedications}
                onChange={(e) => setCurrentMedications(e.target.value)}
                rows={3}
                placeholder="e.g. Metformin 500mg (1-0-1), Telmisartan 40mg once daily..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs focus:outline-none focus:border-teal-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Registrar / Clinical Notes
              </label>
              <textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                rows={3}
                placeholder="Any special remarks, chief complaints, or historical notes..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs focus:outline-none focus:border-teal-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={resetForm}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-sm font-semibold transition"
          >
            Clear Form
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm transition shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Uploading to Database...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 stroke-[2.5]" />
                Submit Patient Registration & Medical File
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

export default UserRegistrationPage;
