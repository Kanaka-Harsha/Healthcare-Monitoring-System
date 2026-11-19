import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api, { extractErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { RotateCcw, Filter, MapPin, Users, HeartPulse, Activity } from 'lucide-react';

const AP = 'Andhra Pradesh';
const fmt = (value) => (value == null ? 'Hidden (<5)' : Number(value || 0).toLocaleString('en-IN'));

const Panel = ({ title, note, children, className = '' }) => (
  <section className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-3 ${className}`}>
    <div>
      <h3 className="text-sm sm:text-base font-bold text-slate-900">{title}</h3>
      {note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}
    </div>
    {children}
  </section>
);

const Metric = ({ label, value, note, tone = 'teal' }) => {
  const tones = {
    teal: 'border-teal-200 bg-teal-50/70 text-teal-950',
    pink: 'border-pink-200 bg-pink-50/70 text-pink-950',
    blue: 'border-blue-200 bg-blue-50/70 text-blue-950',
    slate: 'border-slate-200 bg-slate-50 text-slate-900',
    emerald: 'border-emerald-200 bg-emerald-50/70 text-emerald-950',
    amber: 'border-amber-200 bg-amber-50/70 text-amber-950',
    rose: 'border-rose-200 bg-rose-50/70 text-rose-950',
  };
  return (
    <div className={`min-w-0 rounded-2xl border p-4 shadow-sm flex flex-col justify-between ${tones[tone] || tones.teal}`}>
      <div className="text-xs font-semibold opacity-80">{label}</div>
      <div className="my-2 break-words text-2xl sm:text-3xl font-extrabold tracking-tight">
        {fmt(value)}
      </div>
      {note && <div className="text-[11px] opacity-75">{note}</div>}
    </div>
  );
};

const SimpleBars = ({ data, color = '#0f766e' }) => {
  if (!data?.length) return <p className="py-8 text-center text-xs text-slate-500">No records found for this period.</p>;
  const hasHidden = data.some((row) => row.count == null);
  return (
    <div className="space-y-2">
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" interval={0} angle={-18} textAnchor="end" height={50} tick={{ fontSize: 10, fill: '#64748b' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
            <Tooltip
              formatter={(value) => (value == null ? 'Hidden for privacy' : Number(value).toLocaleString('en-IN'))}
              contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
            <Bar dataKey="count" fill={color} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {hasHidden && <p className="text-center text-[10px] text-slate-500">Counts below 5 are hidden for privacy.</p>}
    </div>
  );
};

const IssueList = ({ issues, assessed }) => {
  if (!issues?.length) return <p className="py-6 text-center text-xs text-slate-500">No health concerns recorded.</p>;
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600">
        People assessed: <strong className="text-slate-900">{fmt(assessed)}</strong>
      </p>
      <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
        {issues.map((issue) => (
          <div key={issue.name} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-xs">
            <span className="font-medium text-slate-800">{issue.name}</span>
            <span className="font-bold text-slate-900 whitespace-nowrap">
              {fmt(issue.count)}
              {issue.percent_of_assessed != null && (
                <span className="ml-1 text-[11px] font-normal text-slate-500">({issue.percent_of_assessed}%)</span>
              )}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400">Recorded complaints, not confirmed diagnoses. A person may report multiple concerns.</p>
    </div>
  );
};

const AnalyticsPage = () => {
  const { user } = useAuth();
  const level = (user?.jurisdictionLevel || '').toLowerCase();
  const isPHC = ['phc', 'primary_health_center', 'primary_health_centre'].includes(level);
  const isMandal = ['mandal', 'block', 'town', 'city'].includes(level);
  const isDistrict = ['district', 'collector', 'dhmo'].includes(level);
  const isState = ['state', 'national', 'country'].includes(level);

  const [days, setDays] = useState(30);
  const [district, setDistrict] = useState(user?.district || 'All');
  const [mandal, setMandal] = useState(user?.mandal || 'All');
  const [village, setVillage] = useState(user?.village || 'All');
  const [phc, setPhc] = useState(user?.phc || 'All');
  const [issue, setIssue] = useState('All');
  const [gender, setGender] = useState('All');
  const [issueGroup, setIssueGroup] = useState('All people');
  const [locations, setLocations] = useState({ districts: [], mandals: [], villages: [], phcs: [], problems: [] });
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const params = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - Number(days) + 1);
    const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
      time_range: 'custom',
      start_date: localDate(start),
      end_date: localDate(end),
      state: AP,
      district: district !== 'All' ? district : undefined,
      mandal: mandal !== 'All' ? mandal : undefined,
      village: village !== 'All' ? village : undefined,
      phc: phc !== 'All' ? phc : undefined,
      primary_issue: issue !== 'All' ? issue : undefined,
      gender: gender !== 'All' ? gender : undefined,
    };
  }, [days, district, mandal, village, phc, issue, gender]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/analytics/dashboard', { params });
      setAnalytics(response.data);
    } catch (e) {
      setError(extractErrorMessage(e, 'Unable to load health summary.'));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    const timer = setTimeout(loadAnalytics, 200);
    return () => clearTimeout(timer);
  }, [loadAnalytics]);

  useEffect(() => {
    api.get('/analytics/locations', { params: { state: AP, district: district !== 'All' ? district : undefined, city: 'All' } })
      .then(({ data }) => setLocations({
        districts: data.districts || [],
        mandals: data.mandals || [],
        villages: data.villages || [],
        phcs: data.phcs || [],
        problems: data.problems || [],
      }))
      .catch(() => {});
  }, [district, mandal]);

  const reset = () => {
    setDays(30);
    setDistrict(user?.district || 'All');
    setMandal(user?.mandal || 'All');
    setVillage(user?.village || 'All');
    setPhc(user?.phc || 'All');
    setIssue('All');
    setGender('All');
    setIssueGroup('All people');
  };

  const people = analytics?.people || {};
  const problems = analytics?.problems || {};
  const group = problems.groups?.find((item) => item.name === issueGroup);
  const ageData = Object.entries(people.age_counts || {}).map(([name, count]) => ({ name, count }));
  const vaccineLabels = {
    up_to_date: 'All vaccines given',
    some_missed: 'Some doses missed',
    overdue: 'Overdue',
    dose_recorded: 'Dose record saved',
    not_recorded: 'Not recorded',
  };
  const vaccineData = Object.entries(people.vaccination || {}).map(([key, count]) => ({ name: vaccineLabels[key] || key, count }));
  const vaccineDoseRows = people.vaccination_by_dose || [];
  const pregnancyData = Object.entries(people.pregnancy_month_ranges || {}).map(([name, count]) => ({ name: name === 'Not recorded' ? name : `Month ${name}`, count }));
  const careLabels = {
    blood_pressure: 'Blood pressure',
    haemoglobin: 'Haemoglobin',
    blood_sugar: 'Blood sugar',
    urine_test: 'Urine test',
    td_vaccine: 'Td vaccine',
    iron_calcium: 'Iron / calcium',
  };
  const pregnancyCareData = Object.entries(problems.antenatal_care || {}).map(([key, value]) => ({ name: careLabels[key] || key, count: value.done }));
  const newbornCare = problems.newborn_care || {};

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">
              Government Public Health Portal
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
              Andhra Pradesh
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">Village Health Analytics & Disease Surveillance</h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Real-time aggregate telemetry of screenings, high-risk patients, maternal care, and immunization across AP districts.
          </p>
          {user?.district && (
            <p className="mt-1 text-xs text-teal-800 font-medium">
              📍 Your Jurisdiction: {[user?.state, user?.district, user?.mandal, user?.phc].filter(Boolean).join(' • ')}
            </p>
          )}
        </div>

        <button
          onClick={loadAnalytics}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold shadow-sm transition flex-shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Filter Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-teal-800" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900">Geographic & Demographic Filters</h2>
          </div>
          <button onClick={reset} className="text-xs font-semibold text-teal-800 hover:underline">
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex flex-col justify-center rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-900">
            <span className="text-[10px] text-teal-700 uppercase font-semibold">State Jurisdiction</span>
            <span>{AP}</span>
          </div>

          {!isState && !isPHC && !isMandal && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">District</label>
              <select
                value={district}
                onChange={(e) => { setDistrict(e.target.value); setMandal('All'); setVillage('All'); setPhc('All'); }}
                className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium text-slate-800"
              >
                <option>All</option>
                {locations.districts.map((value) => <option key={value}>{value}</option>)}
              </select>
            </div>
          )}

          {!isPHC && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Mandal</label>
              <select
                value={mandal}
                onChange={(e) => { setMandal(e.target.value); setVillage('All'); setPhc('All'); }}
                className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium text-slate-800"
              >
                <option>All</option>
                {locations.mandals.map((value) => <option key={value}>{value}</option>)}
              </select>
            </div>
          )}

          {!isPHC && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Village / Town</label>
              <select
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium text-slate-800"
              >
                <option>All</option>
                {locations.villages.map((value) => <option key={value}>{value}</option>)}
              </select>
            </div>
          )}

          {!isMandal && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Primary Health Centre</label>
              <select
                value={phc}
                onChange={(e) => setPhc(e.target.value)}
                className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium text-slate-800"
              >
                <option>All</option>
                {locations.phcs.map((value) => <option key={value}>{value}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Primary Concern</label>
            <select
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium text-slate-800"
            >
              <option>All</option>
              {locations.problems.map((value) => <option key={value}>{value}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium text-slate-800"
            >
              <option>All</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
              <span>Time Horizon</span>
              <span className="text-teal-800 font-mono">Last {days} Days</span>
            </div>
            <input
              type="range"
              min="7"
              max="365"
              step="1"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full accent-teal-800 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>7 days</span>
              <span>30 days</span>
              <span>90 days</span>
              <span>1 year</span>
            </div>
          </div>
        </div>
      </div>

      {/* Errors & Loading */}
      {error && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs font-medium text-rose-900 shadow-sm">
          {error}
        </div>
      )}

      {loading && !analytics ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 text-xs shadow-sm space-y-2">
          <span className="spinner"></span>
          <p>Compiling village screening metrics...</p>
        </div>
      ) : analytics && (
        <>
          {/* SECTION 1: Summary KPIs */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-800" />
              <span>Screening Demographics</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <Metric label="Citizens Screened" value={people.screened} note="Unique patients in period" tone="teal" />
              <Metric label="Total Screening Visits" value={people.screening_visits} note="Repeat visits included" tone="slate" />
              <Metric label="Men (18+)" value={people.men_18_plus} tone="slate" />
              <Metric label="Women (18+)" value={people.women_18_plus} tone="pink" />
              <Metric label="Children (6–17)" value={people.children_6_17} tone="blue" />
              <Metric label="Children (Under 6)" value={people.children_under_6} tone="blue" />
              <Metric label="Newborns (0–28 Days)" value={people.newborns} tone="blue" />
              <Metric label="Pregnant Mothers" value={people.pregnant} tone="pink" />
            </div>
          </section>

          {/* SECTION 2: Demographic Breakdown Charts */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <Panel title="Citizens by Age Group" note="Age distribution across village healthcamps.">
              <SimpleBars data={ageData} color="#0f766e" />
            </Panel>

            <Panel title="Children Under 6: Vaccination" note={`Summary of ${fmt(people.children_in_vaccine_summary)} children.`}>
              <SimpleBars data={vaccineData} color="#2563eb" />
              {vaccineDoseRows.length > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-3 space-y-1.5 max-h-36 overflow-y-auto">
                  <span className="text-[11px] font-bold text-slate-700 block">Dose Breakdown</span>
                  {vaccineDoseRows.map((row) => (
                    <div key={row.name} className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-slate-50">
                      <span className="font-semibold text-slate-800">{row.name}</span>
                      <span className="text-slate-600">Given {fmt(row.given)} • Missed {fmt(row.missed)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Pregnancy Month Distribution" note="Mothers screened by month of gestation.">
              <SimpleBars data={pregnancyData} color="#db2777" />
            </Panel>
          </section>

          {/* SECTION 3: Clinical Health Complaints */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-teal-800" />
              <span>Reported Health Complaints & Disease Patterns</span>
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Panel title="Most Reported Health Conditions" note={`Assessed population: ${fmt(problems.overall_assessed)} citizens.`}>
                <IssueList issues={problems.overall} assessed={problems.overall_assessed} />
              </Panel>

              <Panel title="Condition Breakdown by Category" note="Filter by demographic cohort.">
                <div className="mb-3">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Cohort</label>
                  <select
                    value={issueGroup}
                    onChange={(e) => setIssueGroup(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none"
                  >
                    <option>All people</option>
                    {(problems.groups || []).map((item) => (
                      <option key={item.name}>{item.name}</option>
                    ))}
                  </select>
                </div>
                {group ? (
                  group.suppressed ? (
                    <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600">Cohort has fewer than 5 people. Details hidden for privacy.</p>
                  ) : (
                    <IssueList issues={group.issues} assessed={group.assessed} />
                  )
                ) : (
                  <IssueList issues={problems.overall} assessed={problems.overall_assessed} />
                )}
              </Panel>
            </div>
          </section>

          {/* SECTION 4: Screening Vitals Risk Triaging */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-800" />
              <span>Screening Telemetry & Risk Triaging</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric label="Normal Readings" value={analytics.summary?.green_count} note="Low risk (Green)" tone="emerald" />
              <Metric label="Borderline / Follow-up" value={analytics.summary?.orange_count} note="Moderate risk (Orange)" tone="amber" />
              <Metric label="Critical / Urgent Review" value={analytics.summary?.red_count} note="High risk (Red)" tone="rose" />
              <Metric label="Total Screened" value={analytics.summary?.total_screened} tone="teal" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-2">
              <Panel title="Screening Activity Timeline" note="Daily/Monthly volume of vitals checks." className="lg:col-span-2">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.time_series || []} margin={{ left: -18, right: 10, top: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip
                        formatter={(val, label) => [val == null ? 'Hidden' : fmt(val), label === 'unique_people' ? 'Unique Citizens' : 'Total Screenings']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                      />
                      <Line type="monotone" dataKey="total" name="Screenings" stroke="#0f766e" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="unique_people" name="Unique Citizens" stroke="#2563eb" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="Blood Pressure Results" note="Categorized readings from camps.">
                <SimpleBars
                  data={Object.entries(analytics.vitals_breakdown?.blood_pressure || {}).map(([name, count]) => ({ name, count }))}
                  color="#7c3aed"
                />
              </Panel>
            </div>
          </section>
        </>
      )}

    </div>
  );
};

export default AnalyticsPage;
