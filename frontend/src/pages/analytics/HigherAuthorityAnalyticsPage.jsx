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
const COLOR_BLUE = '#0284c7';   // Volume / General

const HigherAuthorityAnalyticsPage = () => {
  const { user } = useAuth();

  // Filters State
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState(user?.district || 'All');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedVillage, setSelectedVillage] = useState('All');
  const [selectedIssue, setSelectedIssue] = useState('All');

  // Filter Dropdown Options
  const [availableLocations, setAvailableLocations] = useState({
    states: [],
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

  const fetchLocations = async () => {
    try {
      const res = await api.get('/analytics/locations');
      setAvailableLocations(res.data);
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

  const pieData = analytics ? [
    { name: 'Normal / Healthy (Green)', value: analytics.summary.green_count, color: COLOR_GREEN },
    { name: 'Needs Attention (Orange)', value: analytics.summary.orange_count, color: COLOR_ORANGE },
    { name: 'High Risk / Urgent (Red)', value: analytics.summary.red_count, color: COLOR_RED },
  ] : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Community Health Analytics</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
              Surveillance View
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Real-time public health metrics across rural healthcamps. Confidential view with zero personal identifiers.
          </p>
        </div>

        {/* Refresh Action */}
        <button
          onClick={fetchAnalyticsData}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-1.5 text-xs font-semibold rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm transition"
        >
          {loading ? 'Refreshing...' : 'Refresh Numbers'}
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Filter Health Data
          </span>
          {(selectedState !== 'All' || selectedDistrict !== 'All' || selectedVillage !== 'All' || selectedIssue !== 'All') && (
            <button
              onClick={() => {
                setSelectedState('All');
                setSelectedDistrict('All');
                setSelectedCity('All');
                setSelectedVillage('All');
                setSelectedIssue('All');
              }}
              className="text-xs text-teal-700 hover:text-teal-900 font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Time Range */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Time Period</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* State */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">State</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
            >
              <option value="All">All States</option>
              {availableLocations.states.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* District */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">District</label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
            >
              <option value="All">All Districts</option>
              {availableLocations.districts.map((dst) => (
                <option key={dst} value={dst}>{dst}</option>
              ))}
            </select>
          </div>

          {/* City / Block */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">City / Taluka</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
            >
              <option value="All">All Cities</option>
              {availableLocations.cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Village / Town */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Village / Ward</label>
            <select
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
            >
              <option value="All">All Villages</option>
              {availableLocations.villages.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Primary Health Complaint */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Health Complaint</label>
            <select
              value={selectedIssue}
              onChange={(e) => setSelectedIssue(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
            >
              <option value="All">All Complaints</option>
              {availableLocations.problems.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium">
          {errorMsg}
        </div>
      )}

      {loading && !analytics ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-4 border-teal-700 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-600 font-medium">Analyzing health records across healthcamps...</p>
        </div>
      ) : analytics && (
        <>
          {/* 1. Top Executive Scorecards (Traffic Light Semantics) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Screened */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Citizens Screened</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-slate-900">{analytics.summary.total_screened}</span>
                <span className="text-xs font-medium text-slate-500 px-2 py-0.5 rounded bg-slate-100">Evaluated</span>
              </div>
            </div>

            {/* Green - Healthy */}
            <div className="bg-emerald-50/60 p-5 rounded-xl border border-emerald-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Healthy / Normal</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-emerald-800">{analytics.summary.green_count}</span>
                <span className="text-sm font-bold text-emerald-700">{analytics.summary.green_pct}%</span>
              </div>
              <p className="text-[11px] text-emerald-700 mt-1">Normal BP, normal sugar, and stable oxygen</p>
            </div>

            {/* Orange - Moderate Risk */}
            <div className="bg-amber-50/60 p-5 rounded-xl border border-amber-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Needs Attention</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-amber-800">{analytics.summary.orange_count}</span>
                <span className="text-sm font-bold text-amber-700">{analytics.summary.orange_pct}%</span>
              </div>
              <p className="text-[11px] text-amber-700 mt-1">Prehypertension or borderline sugar / oxygen</p>
            </div>

            {/* Red - High Risk */}
            <div className="bg-rose-50/60 p-5 rounded-xl border border-rose-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900 uppercase tracking-wider">High Risk / Urgent</span>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-rose-800">{analytics.summary.red_count}</span>
                <span className="text-sm font-bold text-rose-700">{analytics.summary.red_pct}%</span>
              </div>
              <p className="text-[11px] text-rose-700 mt-1">Stage 2 BP, low oxygen (&lt;92%), or high sugar (&ge;200)</p>
            </div>

          </div>

          {/* 2. Visual Graphs: Population Risk Pie + Time Series Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Pie Chart: Overall Population Distribution */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Population Health Risk Ratio</h3>
                <p className="text-xs text-slate-500 mt-0.5">Distribution based on medical parameters</p>
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
                      outerRadius={80}
                      innerRadius={45}
                      paddingAngle={3}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 text-center text-[11px]">
                <div>
                  <span className="font-bold text-emerald-700 block">{analytics.summary.green_pct}%</span>
                  <span className="text-slate-500">Healthy</span>
                </div>
                <div>
                  <span className="font-bold text-amber-700 block">{analytics.summary.orange_pct}%</span>
                  <span className="text-slate-500">Borderline</span>
                </div>
                <div>
                  <span className="font-bold text-rose-700 block">{analytics.summary.red_pct}%</span>
                  <span className="text-slate-500">Critical</span>
                </div>
              </div>
            </div>

            {/* Line Chart: Screening & Risk Trajectory Over Time */}
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Screening & Risk Trends Over Time</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Daily detection of normal vs critical cases</p>
                </div>
              </div>

              <div className="h-64">
                {analytics.time_series.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No time trend data available for selected filter period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.time_series}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="Green" stroke={COLOR_GREEN} strokeWidth={2.5} name="Healthy" dot={false} />
                      <Line type="monotone" dataKey="Orange" stroke={COLOR_ORANGE} strokeWidth={2.5} name="Borderline" dot={false} />
                      <Line type="monotone" dataKey="Red" stroke={COLOR_RED} strokeWidth={2.5} name="Critical Alert" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

          {/* 3. Clinical Parameters Deep-Dive Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Blood Pressure */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-xs font-bold text-slate-800">Blood Pressure Status</span>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Normal (&lt;120/80)
                  </span>
                  <span className="font-semibold text-slate-900">{analytics.vitals_breakdown.blood_pressure.Normal}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Prehypertension
                  </span>
                  <span className="font-semibold text-slate-900">{analytics.vitals_breakdown.blood_pressure.Prehypertension}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> High (&ge;140/90)
                  </span>
                  <span className="font-bold text-rose-700">{analytics.vitals_breakdown.blood_pressure.Hypertension}</span>
                </div>
              </div>
            </div>

            {/* Blood Oxygen */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-xs font-bold text-slate-800">Oxygen Saturation (SpO2)</span>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Normal (&ge;95%)
                  </span>
                  <span className="font-semibold text-slate-900">{analytics.vitals_breakdown.spo2.Healthy}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Mild Hypoxia (92-94%)
                  </span>
                  <span className="font-semibold text-slate-900">{analytics.vitals_breakdown.spo2['Mild Hypoxia']}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Critical (&lt;92%)
                  </span>
                  <span className="font-bold text-rose-700">{analytics.vitals_breakdown.spo2.Critical}</span>
                </div>
              </div>
            </div>

            {/* Blood Sugar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-xs font-bold text-slate-800">Blood Sugar Range</span>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Normal (&lt;140)
                  </span>
                  <span className="font-semibold text-slate-900">{analytics.vitals_breakdown.blood_glucose.Normal}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Pre-diabetic (140-199)
                  </span>
                  <span className="font-semibold text-slate-900">{analytics.vitals_breakdown.blood_glucose['Pre-diabetic']}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> High (&ge;200)
                  </span>
                  <span className="font-bold text-rose-700">{analytics.vitals_breakdown.blood_glucose['High / Diabetic']}</span>
                </div>
              </div>
            </div>

            {/* Heart Rate */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-xs font-bold text-slate-800">Pulse / Heart Rate</span>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Normal (60-100)
                  </span>
                  <span className="font-semibold text-slate-900">{analytics.vitals_breakdown.heart_rate.Normal}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Slow (&lt;60 BPM)
                  </span>
                  <span className="font-semibold text-slate-900">{analytics.vitals_breakdown.heart_rate['Slow (Bradycardia)']}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Rapid (&gt;100 BPM)
                  </span>
                  <span className="font-bold text-rose-700">{analytics.vitals_breakdown.heart_rate['Rapid (Tachycardia)']}</span>
                </div>
              </div>
            </div>

          </div>

          {/* 4. Geographic Health Hotspot Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Locality & Village Health Surveillance Scorecard</h3>
                <p className="text-xs text-slate-500 mt-0.5">Ranked by proportion of critical and borderline health cases</p>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {analytics.localities.length} {analytics.localities.length === 1 ? 'Locality' : 'Localities'} Reported
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Village / Town / Locality</th>
                    <th className="py-2.5 px-4 text-center">Total Screened</th>
                    <th className="py-2.5 px-4 text-center">Healthy (Green)</th>
                    <th className="py-2.5 px-4 text-center">Attention (Orange)</th>
                    <th className="py-2.5 px-4 text-center">High Risk (Red)</th>
                    <th className="py-2.5 px-4 text-center">Locality Health Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.localities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        No healthcamp records found for the selected location criteria.
                      </td>
                    </tr>
                  ) : (
                    analytics.localities.map((loc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">{loc.locality}</td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-800">{loc.total}</td>
                        <td className="py-3 px-4 text-center font-medium text-emerald-700">
                          {loc.green} <span className="text-[11px] text-slate-400">({loc.green_pct}%)</span>
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-amber-700">
                          {loc.orange} <span className="text-[11px] text-slate-400">({loc.orange_pct}%)</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-rose-700">
                          {loc.red} <span className="text-[11px] text-rose-500">({loc.red_pct}%)</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            loc.alert_level === 'High Risk'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : loc.alert_level === 'Medium Alert'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}>
                            {loc.alert_level}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Health Complaints & Age Vulnerability Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Common Complaints */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Most Common Health Complaints Reported</h3>
              <p className="text-xs text-slate-500 mb-4">Reported during intake across screened population</p>

              <div className="h-60">
                {analytics.complaints.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No complaint data recorded.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.complaints} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="issue" type="category" width={110} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill={COLOR_BLUE} radius={[0, 4, 4, 0]} name="Cases" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Age Risk Breakdown */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Health Vulnerability by Age Group</h3>
              <p className="text-xs text-slate-500 mb-4">Risk levels cross-tabulated across age brackets</p>

              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.age_risk}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="age_bracket" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Green" fill={COLOR_GREEN} stackId="a" name="Healthy" />
                    <Bar dataKey="Orange" fill={COLOR_ORANGE} stackId="a" name="Borderline" />
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

