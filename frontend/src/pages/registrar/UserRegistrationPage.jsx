import React, { useState } from 'react';
import api, { extractErrorMessage } from '../../services/api';

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
      setNotification({ type: 'error', message: 'Aadhaar number must be exactly 12 digits.' });
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
        message: `Patient ${fullName} has been successfully registered. The medical questionnaire has been saved.`
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setNotification({
        type: 'error',
        message: extractErrorMessage(err, 'Failed to register patient. Please check the information and try again.')
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
            SwastGrama - Patient Registration
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            New Patient Registration & Health History
          </h1>
          <p className="text-xs text-slate-600">
            Complete the form below to register a resident and record their detailed medical history.
          </p>
        </div>

        {createdPatient && (
          <button
            onClick={resetForm}
            className="px-3 py-1.5 text-xs font-semibold rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
          >
            Register Another Patient
          </button>
        )}
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`mb-6 p-4 rounded text-sm font-medium border ${
          notification.type === 'success'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Success Confirmation Card */}
      {createdPatient && (
        <div className="mb-6 p-5 rounded bg-emerald-50 border border-emerald-200">
          <div className="flex items-center justify-between border-b border-emerald-200 pb-3 mb-3">
            <div>
              <h2 className="text-base font-bold text-emerald-950">Patient Record Created Successfully</h2>
              <p className="text-xs text-emerald-800">Patient Number: {createdPatient.id}</p>
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-emerald-200 text-emerald-900">
              Active Record
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded bg-white border border-emerald-100">
              <span className="text-slate-500 block">Full Name</span>
              <span className="font-semibold text-slate-900 text-sm">{createdPatient.full_name}</span>
            </div>
            <div className="p-2.5 rounded bg-white border border-emerald-100">
              <span className="text-slate-500 block">Mobile Number</span>
              <span className="font-semibold text-slate-900 text-sm">+91 {createdPatient.phone}</span>
            </div>
            <div className="p-2.5 rounded bg-white border border-emerald-100">
              <span className="text-slate-500 block">Aadhaar (Masked)</span>
              <span className="font-semibold text-slate-900 text-sm font-mono">{createdPatient.aadhaar_masked}</span>
            </div>
            <div className="p-2.5 rounded bg-white border border-emerald-100">
              <span className="text-slate-500 block">Age / Gender</span>
              <span className="font-semibold text-slate-900 text-sm">{createdPatient.age || 'N/A'} yrs / {createdPatient.gender || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleRegisterPatient} className="space-y-6">
        
        {/* SECTION 1: Personal Details */}
        <div className="bg-white p-5 sm:p-6 rounded border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 pb-2 border-b border-slate-100">
            Section 1: Personal & Identification Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter patient full name"
                required
                className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                required
                className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Aadhaar Number (12 Digits) *
              </label>
              <input
                type="text"
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value)}
                placeholder="12-digit Aadhaar number"
                maxLength={12}
                required
                className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 font-mono text-sm focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Age (in years)
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 45"
                min="1"
                max="125"
                className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Blood Group
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
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

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Village / Residential Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House / Street / Village, District"
                className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase text-slate-600 mb-3">
              Emergency Contact & Family Member
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Contact Person Name</label>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="Family contact name"
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-teal-700"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Relationship</label>
                <select
                  value={emergencyRelation}
                  onChange={(e) => setEmergencyRelation(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-teal-700"
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent (Father / Mother)</option>
                  <option value="Child">Child (Son / Daughter)</option>
                  <option value="Sibling">Sibling (Brother / Sister)</option>
                  <option value="Guardian">Guardian / Relative</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Emergency Mobile Number</label>
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-teal-700"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Medical History Questionnaire */}
        <div className="bg-white p-5 sm:p-6 rounded border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 pb-2 border-b border-slate-100">
            Section 2: Medical History Questionnaire
          </h2>

          <div className="space-y-5">
            
            {/* 2.1 Past Conditions */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                A. Past Medical Issues & Chronic Illnesses (Click to select options)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {CHRONIC_CONDITIONS.map((cond) => {
                  const isSelected = selectedConditions.includes(cond);
                  return (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => toggleSelection(cond, selectedConditions, setSelectedConditions)}
                      className={`px-3 py-2 rounded text-left text-xs font-medium transition border flex items-center justify-between ${
                        isSelected
                          ? 'bg-teal-50 border-teal-600 text-teal-900 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{cond}</span>
                      {isSelected && <span className="text-teal-700 font-bold ml-1">[Selected]</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2.2 Family Medical History */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                B. Family Medical History (Hereditary Health Conditions)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {FAMILY_HISTORY_OPTIONS.map((hist) => {
                  const isSelected = selectedFamilyHistory.includes(hist);
                  return (
                    <button
                      key={hist}
                      type="button"
                      onClick={() => toggleSelection(hist, selectedFamilyHistory, setSelectedFamilyHistory)}
                      className={`px-3 py-2 rounded text-left text-xs font-medium transition border flex items-center justify-between ${
                        isSelected
                          ? 'bg-teal-50 border-teal-600 text-teal-900 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{hist}</span>
                      {isSelected && <span className="text-teal-700 font-bold ml-1">[Selected]</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2.3 Role of Family */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                C. Role of Family & Living Support
              </label>
              <select
                value={familyRole}
                onChange={(e) => setFamilyRole(e.target.value)}
                className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
              >
                {FAMILY_ROLE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* 2.4 Past Surgeries */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                D. Past Surgeries & Major Medical Treatments
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {SURGERIES_OPTIONS.map((surg) => {
                  const isSelected = selectedSurgeries.includes(surg);
                  return (
                    <button
                      key={surg}
                      type="button"
                      onClick={() => toggleSelection(surg, selectedSurgeries, setSelectedSurgeries)}
                      className={`px-3 py-2 rounded text-left text-xs font-medium transition border flex items-center justify-between ${
                        isSelected
                          ? 'bg-teal-50 border-teal-600 text-teal-900 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{surg}</span>
                      {isSelected && <span className="text-teal-700 font-bold ml-1">[Selected]</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2.5 Allergies */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                E. Known Drug, Medicine & Food Allergies
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {ALLERGIES_OPTIONS.map((allg) => {
                  const isSelected = selectedAllergies.includes(allg);
                  return (
                    <button
                      key={allg}
                      type="button"
                      onClick={() => toggleSelection(allg, selectedAllergies, setSelectedAllergies)}
                      className={`px-3 py-2 rounded text-left text-xs font-medium transition border flex items-center justify-between ${
                        isSelected
                          ? 'bg-teal-50 border-teal-600 text-teal-900 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{allg}</span>
                      {isSelected && <span className="text-teal-700 font-bold ml-1">[Selected]</span>}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 3: Lifestyle & Current Medications */}
        <div className="bg-white p-5 sm:p-6 rounded border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 pb-2 border-b border-slate-100">
            Section 3: Lifestyle Habits & Current Medications
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tobacco / Smoking</label>
              <select
                value={smokingStatus}
                onChange={(e) => setSmokingStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-teal-700"
              >
                <option value="Non-Smoker">Non-Smoker</option>
                <option value="Former Smoker">Former Smoker (Quit)</option>
                <option value="Occasional / Social">Occasional / Social</option>
                <option value="Daily Smoker (1-10/day)">Daily Smoker (1-10/day)</option>
                <option value="Heavy Smoker (>10/day)">Heavy Smoker (&gt;10/day)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alcohol Consumption</label>
              <select
                value={alcoholStatus}
                onChange={(e) => setAlcoholStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-teal-700"
              >
                <option value="Non-Drinker">Non-Drinker</option>
                <option value="Occasional / Social">Occasional / Social</option>
                <option value="Moderate (1-2 drinks/wk)">Moderate (1-2 drinks/wk)</option>
                <option value="Regular / Daily">Regular / Daily</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Activity</label>
              <select
                value={physicalActivity}
                onChange={(e) => setPhysicalActivity(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-teal-700"
              >
                <option value="Sedentary (No regular exercise)">Sedentary</option>
                <option value="Light (Walking 1-2x/wk)">Light Walking</option>
                <option value="Moderate (3-4 times/week)">Moderate (3-4x/week)</option>
                <option value="Active / Athletic">Active / Athletic</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dietary Pattern</label>
              <select
                value={dietaryPreference}
                onChange={(e) => setDietaryPreference(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-teal-700"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Daily Medications (Name & Dosage)
              </label>
              <textarea
                value={currentMedications}
                onChange={(e) => setCurrentMedications(e.target.value)}
                rows={3}
                placeholder="e.g. Metformin 500mg, Telmisartan 40mg..."
                className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registration / Intake Notes
              </label>
              <textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                rows={3}
                placeholder="Any special remarks or chief complaints..."
                className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-teal-700"
              />
            </div>
          </div>
        </div>

        {/* Submit Button & Responsive State */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={resetForm}
            className="w-full sm:w-auto px-5 py-2.5 rounded bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
          >
            Clear Form
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-2.5 rounded bg-teal-800 hover:bg-teal-900 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <span className="spinner-white"></span>
                <span>Saving Patient Record...</span>
              </>
            ) : (
              'Submit Patient Registration & Health History'
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

export default UserRegistrationPage;
