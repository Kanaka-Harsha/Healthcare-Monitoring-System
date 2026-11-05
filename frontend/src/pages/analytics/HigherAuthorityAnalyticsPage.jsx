import React, { useState, useEffect } from 'react';
import api, { extractErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

// Strict Semantic Color Palette
const COLOR_GREEN = '#10b981';  // Normal / Healthy
const COLOR_ORANGE = '#f59e0b'; // Attention / Moderate Risk
const COLOR_RED = '#ef4444';    // High Risk / Urgent Alert
const COLOR_TEAL = '#0f766e';   // Primary Brand
const COLOR_BLUE = '#2563eb';   // Volume / General

const INDIA_STATES_AND_UTS = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
  'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const HigherAuthorityAnalyticsPage = () => {
  const { user } = useAuth();

  // Geographic filters cover all Indian states and union territories.
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedState, setSelectedState] = useState(user?.state || 'All');
  const [selectedDistrict, setSelectedDistrict] = useState(user?.district || 'All');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedVillage, setSelectedVillage] = useState('All');
  const [selectedIssue, setSelectedIssue] = useState('All');

  // Filter Dropdown Options
  const [availableLocations, setAvailableLocations] = useState({
    states: INDIA_STATES_AND_UTS,
    districts: [],
    cities: [],
    villages: [],
    problems: []
  });

  // Analytics Data State
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, selectedState, selectedDistrict, selectedCity, selectedVillage, selectedIssue]);

  useEffect(() => {
    fetchLocations();
  }, [selectedState, selectedDistrict, selectedCity]);

  const fetchLocations = async () => {
    try {
      const res = await api.get('/analytics/locations', {
        params: {
          state: selectedState !== 'All' ? selectedState : undefined,
          district: selectedDistrict !== 'All' ? selectedDistrict : undefined,
          city: selectedCity !== 'All' ? selectedCity : undefined,
        }
      });
      if (res.data) {
        setAvailableLocations({
          states: res.data.states?.length ? res.data.states : INDIA_STATES_AND_UTS,
          districts: res.data.districts || [],
          cities: res.data.cities || [],
          villages: res.data.villages || [],
          problems: res.data.problems || []
        });
      }
    } catch (err) {
      console.error('Failed to load filter locations:', err);
    }
  };

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = {
        time_range: timeRange,
        state: selectedState !== 'All' ? selectedState : undefined,
        district: selectedDistrict !== 'All' ? selectedDistrict : undefined,
        city: selectedCity !== 'All' ? selectedCity : undefined,
        village: selectedVillage !== 'All' ? selectedVillage : undefined,
        primary_issue: selectedIssue !== 'All' ? selectedIssue : undefined,
      };

      const res = await api.get('/analytics/dashboard', { params });
      setAnalytics(res.data);
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, 'Unable to load analytics data at this time.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedState(user?.state || 'All');
    setSelectedDistrict(user?.district || 'All');
    setSelectedCity('All');
    setSelectedVillage('All');
    setSelectedIssue('All');
    setTimeRange('30d');
  };

  const pieData = analytics ? [
    { name: 'Healthy (Green)', value: analytics.summary.green_count, color: COLOR_GREEN },
    { name: 'Moderate (Orange)', value: analytics.summary.orange_count, color: COLOR_ORANGE },
    { name: 'High Risk (Red)', value: analytics.summary.red_count, color: COLOR_RED },
  ] : [];

  return (
    <div className="analytics-grid max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* ── Top Header Card ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 uppercase tracking-wide">
              India Public Health Surveillance
            </span>
            {user?.district && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Jurisdiction: {user.district} District
              </span>
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Community Health Analytics Portal
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Health screening trends, risk scorecards, and community health monitoring across India.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={fetchAnalyticsData}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-teal-800 hover:bg-teal-900 text-white shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>{loading ? 'Refreshing...' : '↻ Refresh Data'}</span>
          </button>
        </div>
      </div>

      {/* ── Filter Controls Panel (CSS Grid Layout) ─────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Geographic & Demographic Filter Controls
            </span>
            <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              State: {selectedState === 'All' ? 'All India' : selectedState}
            </span>
          </div>

          {(selectedDistrict !== 'All' || selectedCity !== 'All' || selectedVillage !== 'All' || selectedIssue !== 'All' || timeRange !== '30d') && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-teal-700 hover:text-teal-900 font-bold transition hover:underline"
            >
              Reset All Filters ✕
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">

          {/* 1. Time Period */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">Time Horizon</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
            >
              <option value="today">Today (24h)</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Available Records</option>
            </select>
          </div>

          {/* 2. State */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">State / Union Territory</label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict('All');
                setSelectedCity('All');
                setSelectedVillage('All');
              }}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
            >
              <option value="All">All States / UTs</option>
              {availableLocations.states.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          {/* 3. District */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">District</label>
            <select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setSelectedCity('All');
                setSelectedVillage('All');
              }}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
            >
              <option value="All">All Districts</option>
              {availableLocations.districts.map((dst) => (
                <option key={dst} value={dst}>{dst}</option>
              ))}
            </select>
          </div>

          {/* 4. City / Mandal / Taluka */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">City / Town / Mandal</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
            >
              <option value="All">All Cities / Mandals</option>
              {availableLocations.cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* 5. Village / Ward */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">Village / Locality</label>
            <select
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
            >
              <option value="All">All Villages / Wards</option>
              {availableLocations.villages.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* 6. Primary Health Issue */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">Primary Health Complaint</label>
            <select
              value={selectedIssue}
              onChange={(e) => setSelectedIssue(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
            >
              <option value="All">All Complaints / Symptoms</option>
              {availableLocations.problems.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────────────────── */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl text-xs font-semibold shadow-sm">
          {errorMsg}
        </div>
      )}

      {/* ── Loading Spinner ─────────────────────────────────────────────────── */}
      {loading && !analytics ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3 bg-white rounded-2xl border border-slate-200">
          <div className="w-9 h-9 border-4 border-teal-700 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-600 font-semibold">Aggregating epidemiological analytics for the selected geography...</p>
        </div>
      ) : analytics && (
        <>
          {/* ══════════════════════════════════════════════════════════════════════
              GRID SECTION 1: 4 Executive KPI Scorecard Boxes
             ══════════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Total Evaluated */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Citizens Screened</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">Evaluated</span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900 tracking-tight">{analytics.summary.total_screened}</span>
                  <span className="text-xs text-slate-500 font-medium">citizens</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-100">
                Screened by village volunteers and camp assistants across AP.
              </p>
            </div>

            {/* Green — Normal / Healthy */}
            <div className="bg-gradient-to-b from-white to-emerald-50/40 p-5 rounded-2xl border-2 border-emerald-300 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-emerald-800">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    Normal / Healthy
                  </span>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {analytics.summary.green_pct}%
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-emerald-800 tracking-tight">{analytics.summary.green_count}</span>
                  <span className="text-xs text-emerald-700 font-semibold">citizens</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-emerald-200/80">
                <div className="w-full bg-emerald-100 h-1.5 rounded-full overflow-hidden mb-1.5">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${analytics.summary.green_pct}%` }}></div>
                </div>
                <p className="text-[11px] text-emerald-800 font-medium">BP &lt;120/80, SpO₂ ≥95%, Sugar &lt;140 mg/dL</p>
              </div>
            </div>

            {/* Orange — Attention Needed */}
            <div className="bg-gradient-to-b from-white to-amber-50/40 p-5 rounded-2xl border-2 border-amber-300 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-amber-900">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    Needs Attention
                  </span>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                    {analytics.summary.orange_pct}%
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-amber-800 tracking-tight">{analytics.summary.orange_count}</span>
                  <span className="text-xs text-amber-700 font-semibold">citizens</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-amber-200/80">
                <div className="w-full bg-amber-100 h-1.5 rounded-full overflow-hidden mb-1.5">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${analytics.summary.orange_pct}%` }}></div>
                </div>
                <p className="text-[11px] text-amber-800 font-medium">Prehypertension, mild hypoxia (92-94%), borderline sugar</p>
              </div>
            </div>

            {/* Red — Critical / High Risk */}
            <div className="bg-gradient-to-b from-white to-rose-50/50 p-5 rounded-2xl border-2 border-rose-300 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-rose-900">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
                    Critical / High Risk
                  </span>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-200">
                    {analytics.summary.red_pct}%
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-rose-800 tracking-tight">{analytics.summary.red_count}</span>
                  <span className="text-xs text-rose-700 font-semibold">urgent cases</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-rose-200/80">
                <div className="w-full bg-rose-100 h-1.5 rounded-full overflow-hidden mb-1.5">
                  <div className="bg-rose-600 h-full rounded-full transition-all duration-500" style={{ width: `${analytics.summary.red_pct}%` }}></div>
                </div>
                <p className="text-[11px] text-rose-800 font-bold">BP ≥140/90, SpO₂ &lt;92%, or Sugar ≥200 mg/dL</p>
              </div>
            </div>

          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              GRID SECTION 2: Visual Chart Row (Donut 5 cols + Time Series 7 cols)
             ══════════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* Left Box: Population Health Risk Donut */}
            <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Population Risk Classification Ratio</h3>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">All AP Camps</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Triaged clinical risk categorization based on vital thresholds</p>
              </div>

              <div className="h-64 my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={50}
                      paddingAngle={4}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [`${val} citizens`, name]}
                      contentStyle={{ borderRadius: '8px', fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
                <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">Normal</span>
                  <span className="text-sm font-black text-emerald-800">{analytics.summary.green_pct}%</span>
                </div>
                <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-200">
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">Attention</span>
                  <span className="text-sm font-black text-amber-800">{analytics.summary.orange_pct}%</span>
                </div>
                <div className="p-2 rounded-xl bg-rose-50/70 border border-rose-200">
                  <span className="text-[10px] uppercase font-bold text-rose-800 block">High Risk</span>
                  <span className="text-sm font-black text-rose-800">{analytics.summary.red_pct}%</span>
                </div>
              </div>
            </div>

            {/* Right Box: Screening Volume & Risk Trend Line Chart */}
            <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Screening & Risk Trajectory Over Time</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Chronological detection curves across Normal, Moderate, and High Risk</p>
                </div>
                <span className="text-[11px] text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {timeRange.toUpperCase()}
                </span>
              </div>

              <div className="h-72 my-1">
                {analytics.time_series.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No time-series screenings found for this date filter.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.time_series}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                      <Line type="monotone" dataKey="Green" stroke={COLOR_GREEN} strokeWidth={2.5} name="Healthy" dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Orange" stroke={COLOR_ORANGE} strokeWidth={2.5} name="Attention" dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Red" stroke={COLOR_RED} strokeWidth={2.5} name="High Risk Alert" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span>Green line = normal metrics</span>
                <span className="font-semibold text-rose-700">Red line spikes = potential localized epidemic / crisis</span>
              </div>
            </div>

          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              GRID SECTION 3: Clinical Health Metric Deep Dive (4 Cards)
             ══════════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Blood Pressure Status */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Blood Pressure</span>
                <span className="text-[10px] text-slate-400 font-mono">mmHg</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-1.5 rounded-lg bg-slate-50">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Normal (&lt;120/80)
                  </span>
                  <span className="font-bold text-slate-900">{analytics.vitals_breakdown.blood_pressure.Normal}</span>
                </div>
                <div className="flex justify-between items-center p-1.5 rounded-lg bg-amber-50/50">
                  <span className="text-amber-900 flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Prehypertension
                  </span>
                  <span className="font-bold text-amber-900">{analytics.vitals_breakdown.blood_pressure.Prehypertension}</span>
                </div>
                <div className="flex justify-between items-center p-1.5 rounded-lg bg-rose-50/50">
                  <span className="text-rose-900 flex items-center gap-1.5 font-bold">
                    <span className="w-2 h-2 rounded-full bg-rose-600"></span> High (≥140/90)
                  </span>
                  <span className="font-black text-rose-700">{analytics.vitals_breakdown.blood_pressure.Hypertension}</span>
                </div>
              </div>
            </div>

            {/* Oxygen SpO2 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Oxygen Saturation</span>
                <span className="text-[10px] text-slate-400 font-mono">SpO₂ %</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-1.5 rounded-lg bg-slate-50">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Healthy (≥95%)
                  </span>
                  <span className="font-bold text-slate-900">{analytics.vitals_breakdown.spo2.Healthy}</span>
                </div>
                <div className="flex justify-between items-center p-1.5 rounded-lg bg-amber-50/50">
                  <span className="text-amber-900 flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Mild Hypoxia (92-94%)
                  </span>
                  <span className="font-bold text-amber-900">{analytics.vitals_breakdown.spo2['Mild Hypoxia']}</span>
                </div>
                <div className="flex justify-between items-center p-1.5 rounded-lg bg-rose-50/50">
                  <span className="text-rose-900 flex items-center gap-1.5 font-bold">
                    <span className="w-2 h-2 rounded-full bg-rose-600"></span> Critical Hypoxia (&lt;92%)
                  </span>
                  <span className="font-black text-rose-700">{analytics.vitals_breakdown.spo2.Critical}</span>
                </div>
              </div>
            </div>

            {/* Blood Glucose */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Blood Glucose Range</span>
                <span className="text-[10px] text-slate-400 font-mono">mg/dL</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-1.5 rounded-lg bg-slate-50">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Normal (&lt;140)
                  </span>
                  <span className="font-bold text-slate-900">{analytics.vitals_breakdown.blood_glucose.Normal}</span>
                </div>
                <div className="flex justify-between items-center p-1.5 rounded-lg bg-amber-50/50">
                  <span className="text-amber-900 flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Impaired (140-199)
                  </span>
                  <span className="font-bold text-amber-900">{analytics.vitals_breakdown.blood_glucose['Pre-diabetic']}</span>
                </div>
                <div className="flex justify-between items-center p-1.5 rounded-lg bg-rose-50/50">
                  <span className="text-rose-900 flex items-center gap-1.5 font-bold">
                    <span className="w-2 h-2 rounded-full bg-rose-600"></span> Diabetic (≥200)
                  </span>
                  <span className="font-black text-rose-700">{analytics.vitals_breakdown.blood_glucose['High / Diabetic']}</span>
                </div>
              </div>
            </div>

            {/* Pulse Rate */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Pulse / Heart Rate</span>
                <span className="text-[10px] text-slate-400 font-mono">BPM</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-1.5 rounded-lg bg-slate-50">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Normal (60-100)
                  </span>
                  <span className="font-bold text-slate-900">{analytics.vitals_breakdown.heart_rate.Normal}</span>
                </div>
                <div className="flex justify-between items-center p-1.5 rounded-lg bg-amber-50/50">
                  <span className="text-amber-900 flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Bradycardia (&lt;60)
                  </span>
                  <span className="font-bold text-amber-900">{analytics.vitals_breakdown.heart_rate['Slow (Bradycardia)']}</span>
                </div>
                <div className="flex justify-between items-center p-1.5 rounded-lg bg-rose-50/50">
                  <span className="text-rose-900 flex items-center gap-1.5 font-bold">
                    <span className="w-2 h-2 rounded-full bg-rose-600"></span> Tachycardia (&gt;100)
                  </span>
                  <span className="font-black text-rose-700">{analytics.vitals_breakdown.heart_rate['Rapid (Tachycardia)']}</span>
                </div>
              </div>
            </div>

          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              GRID SECTION 4: Locality Health Surveillance Table
             ══════════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Village & Locality Risk Scorecard</h3>
                <p className="text-xs text-slate-500 mt-0.5">Ranked by proportion of critical and borderline health cases detected</p>
              </div>
              <span className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                {analytics.localities.length} {analytics.localities.length === 1 ? 'Locality' : 'Localities'} Monitored
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-5">Locality / Village</th>
                    <th className="py-3 px-4 text-center">Screened</th>
                    <th className="py-3 px-4 text-center">Healthy (Green)</th>
                    <th className="py-3 px-4 text-center">Attention (Orange)</th>
                    <th className="py-3 px-4 text-center">Critical (Red)</th>
                    <th className="py-3 px-4 text-center">Alert Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {analytics.localities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No healthcamp records found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    analytics.localities.map((loc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-5 font-bold text-slate-900">{loc.locality}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800">{loc.total}</td>
                        <td className="py-3.5 px-4 text-center font-semibold text-emerald-700">
                          {loc.green} <span className="text-[11px] font-normal text-slate-400">({loc.green_pct}%)</span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-amber-700">
                          {loc.orange} <span className="text-[11px] font-normal text-slate-400">({loc.orange_pct}%)</span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-rose-700">
                          {loc.red} <span className="text-[11px] font-bold text-rose-500">({loc.red_pct}%)</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold border ${
                            loc.alert_level === 'High Risk'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : loc.alert_level === 'Medium Alert'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}>
                            {loc.alert_level === 'High Risk' ? '🔴 High Risk' : loc.alert_level === 'Medium Alert' ? '🟠 Medium Alert' : '🟢 Normal'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              GRID SECTION 5: Complaints (6 cols) & Age Vulnerability (6 cols)
             ══════════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Complaints Breakdown */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Common Symptoms & Complaints Reported</h3>
                <p className="text-xs text-slate-500 mt-0.5">Primary reason for citizen healthcamp checkups</p>
              </div>

              <div className="h-64">
                {analytics.complaints.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No complaint data recorded.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.complaints} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="issue" type="category" width={120} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="count" fill={COLOR_BLUE} radius={[0, 6, 6, 0]} name="Cases" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Age Vulnerability Breakdown */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Health Vulnerability by Age Cohort</h3>
                <p className="text-xs text-slate-500 mt-0.5">Risk distribution across youth, adults, and seniors</p>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.age_risk}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="age_bracket" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                    <Bar dataKey="Green" fill={COLOR_GREEN} stackId="a" name="Healthy" />
                    <Bar dataKey="Orange" fill={COLOR_ORANGE} stackId="a" name="Attention" />
                    <Bar dataKey="Red" fill={COLOR_RED} stackId="a" name="High Risk" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
};

export default HigherAuthorityAnalyticsPage;
