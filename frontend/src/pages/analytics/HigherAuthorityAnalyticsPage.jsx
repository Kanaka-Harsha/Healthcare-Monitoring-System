import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api, { extractErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Home, HeartPulse, Baby, Syringe } from 'lucide-react';

const AP = 'Andhra Pradesh';
const fmt = value => value == null ? 'Hidden (<5)' : Number(value || 0).toLocaleString('en-IN');
const Panel = ({ title, note, children, className = '' }) => <section className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}><div className="mb-3"><h3 className="text-base font-bold text-slate-900">{title}</h3>{note && <p className="mt-1 text-xs text-slate-500">{note}</p>}</div>{children}</section>;
const Metric = ({ label, value, note, tone = 'teal' }) => {
  const tones = { teal: 'border-teal-100 bg-teal-50 text-teal-900', pink: 'border-pink-100 bg-pink-50 text-pink-900', blue: 'border-blue-100 bg-blue-50 text-blue-900', slate: 'border-slate-200 bg-slate-50 text-slate-900' };
  return <div className={`min-w-0 rounded-xl border p-4 ${tones[tone] || tones.teal}`}><div className="text-xs font-semibold opacity-80">{label}</div><div className="mt-1 break-words text-2xl font-bold sm:text-3xl">{fmt(value)}</div>{note && <div className="mt-1 text-[11px] opacity-75">{note}</div>}</div>;
};
const SimpleBars = ({ data, color = '#0f766e' }) => {
  if (!data?.length) return <p className="py-8 text-center text-sm text-slate-500">No details recorded for this period.</p>;
  const hasHidden = data.some(row => row.count == null);
  return <><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 25 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" interval={0} angle={-18} textAnchor="end" height={58} tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip formatter={value => value == null ? 'Hidden for privacy' : Number(value).toLocaleString('en-IN')} /><Bar dataKey="count" fill={color} radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>{hasHidden && <p className="text-center text-[11px] text-slate-500">Counts below 5 are hidden for privacy.</p>}</>;
};
const IssueList = ({ issues, assessed }) => {
  if (!issues?.length) return <p className="py-6 text-center text-sm text-slate-500">No concerns recorded.</p>;
  return <div><p className="mb-3 text-xs text-slate-600">People assessed: <strong>{fmt(assessed)}</strong></p><div className="max-h-80 space-y-2 overflow-y-auto">{issues.map(issue => <div key={issue.name} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"><span className="min-w-0 flex-1 text-sm text-slate-700">{issue.name}</span><span className="text-right text-xs font-semibold text-slate-800">{fmt(issue.count)}{issue.percent_of_assessed != null && <span className="ml-1 font-normal text-slate-500">({issue.percent_of_assessed}% of assessed)</span>}</span></div>)}</div><p className="mt-3 text-[11px] text-slate-500">These are recorded concerns, not confirmed diagnoses. One person may have more than one concern.</p></div>;
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
    const localDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { time_range: 'custom', start_date: localDate(start), end_date: localDate(end), state: AP, district: district !== 'All' ? district : undefined, mandal: mandal !== 'All' ? mandal : undefined, village: village !== 'All' ? village : undefined, phc: phc !== 'All' ? phc : undefined, primary_issue: issue !== 'All' ? issue : undefined, gender: gender !== 'All' ? gender : undefined };
  }, [days, district, mandal, village, phc, issue, gender]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/analytics/dashboard', { params });
      setAnalytics(response.data);
    } catch (e) {
      setError(extractErrorMessage(e, 'Unable to load the health summary.'));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { const timer = setTimeout(loadAnalytics, 200); return () => clearTimeout(timer); }, [loadAnalytics]);
  useEffect(() => {
    api.get('/analytics/locations', { params: { state: AP, district: district !== 'All' ? district : undefined, city: 'All' } })
      .then(({ data }) => setLocations({ districts: data.districts || [], mandals: data.mandals || [], villages: data.villages || [], phcs: data.phcs || [], problems: data.problems || [] }))
      .catch(() => {});
  }, [district, mandal]);

  const reset = () => { setDays(30); setDistrict(user?.district || 'All'); setMandal(user?.mandal || 'All'); setVillage(user?.village || 'All'); setPhc(user?.phc || 'All'); setIssue('All'); setGender('All'); setIssueGroup('All people'); };
  const people = analytics?.people || {};
  const problems = analytics?.problems || {};
  const group = problems.groups?.find(item => item.name === issueGroup);
  const ageData = Object.entries(people.age_counts || {}).map(([name, count]) => ({ name, count }));
  const vaccineLabels = { up_to_date: 'All due vaccines given', some_missed: 'Some doses missed', overdue: 'Overdue', dose_recorded: 'Individual dose record saved', not_recorded: 'Not recorded' };
  const vaccineData = Object.entries(people.vaccination || {}).map(([key, count]) => ({ name: vaccineLabels[key] || key, count }));
  const vaccineDoseRows = people.vaccination_by_dose || [];
  const pregnancyData = Object.entries(people.pregnancy_month_ranges || {}).map(([name, count]) => ({ name: name === 'Not recorded' ? name : `Months ${name}`, count }));
  const careLabels = { blood_pressure: 'Blood pressure', haemoglobin: 'Blood level', blood_sugar: 'Blood sugar', urine_test: 'Urine test', td_vaccine: 'Td vaccine', iron_calcium: 'Iron / calcium' };
  const pregnancyCareData = Object.entries(problems.antenatal_care || {}).map(([key, value]) => ({ name: careLabels[key] || key, count: value.done }));
  const newbornCare = problems.newborn_care || {};

  const jumpTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return <main className="mx-auto max-w-[1440px] space-y-5 px-4 py-6 pb-24 sm:px-6 sm:pb-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-slate-900">Village health summary</h1><p className="mt-1 text-sm text-slate-600">Simple counts of people screened and concerns recorded in Andhra Pradesh.</p>{user?.district && <p className="mt-1 text-xs text-teal-800">Your area: {[user?.state, user?.district, user?.mandal, user?.phc].filter(Boolean).join(' · ')}</p>}</div><button onClick={loadAnalytics} className="rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900">Refresh</button></header>

    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">Choose an area and time</h2><p className="mt-1 text-xs text-slate-500">Your role limits which areas you can view.</p></div><button onClick={reset} className="text-sm font-semibold text-teal-800 underline">Clear filters</button></div><div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2.5 text-sm font-semibold text-teal-900">State: {AP}</div>
      {!isState && !isPHC && !isMandal && <label className="text-xs font-semibold text-slate-600">District<select value={district} onChange={e => { setDistrict(e.target.value); setMandal('All'); setVillage('All'); setPhc('All'); }} className="mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm"><option>All</option>{locations.districts.map(value => <option key={value}>{value}</option>)}</select></label>}
      {!isPHC && <label className="text-xs font-semibold text-slate-600">Mandal<select value={mandal} onChange={e => { setMandal(e.target.value); setVillage('All'); setPhc('All'); }} className="mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm"><option>All</option>{locations.mandals.map(value => <option key={value}>{value}</option>)}</select></label>}
      {!isPHC && <label className="text-xs font-semibold text-slate-600">Village / town<select value={village} onChange={e => setVillage(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm"><option>All</option>{locations.villages.map(value => <option key={value}>{value}</option>)}</select></label>}
      {!isMandal && <label className="text-xs font-semibold text-slate-600">Health centre<select value={phc} onChange={e => setPhc(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm"><option>All</option>{locations.phcs.map(value => <option key={value}>{value}</option>)}</select></label>}
      <label className="text-xs font-semibold text-slate-600">Health concern<select value={issue} onChange={e => setIssue(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm"><option>All</option>{locations.problems.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-600">Gender<select value={gender} onChange={e => setGender(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm"><option>All</option><option value="Male">Men / boys</option><option value="Female">Women / girls</option><option value="Other">Other / not listed</option></select></label>
      <label className="sm:col-span-2 text-xs font-semibold text-slate-600">Time period: last {days} days<input type="range" min="7" max="365" step="1" value={days} onChange={e => setDays(Number(e.target.value))} className="mt-3 block w-full accent-teal-800"/><span className="flex justify-between text-[11px] font-normal"><span>7 days</span><span>1 year</span></span></label>
    </div></section>

    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
    {loading && !analytics ? <div className="rounded-xl border bg-white p-12 text-center text-slate-600">Loading health information…</div> : analytics && <>
      <section id="overview-section" className="scroll-mt-20"><div className="mb-3"><h2 className="text-lg font-bold text-slate-900">People and screening</h2><p className="text-sm text-slate-600">People are counted once. A person can have more than one screening visit.</p></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="People screened" value={people.screened} note="Unique people in this period"/><Metric label="Screening visits" value={people.screening_visits} note="Repeat visits count again" tone="slate"/><Metric label="Men aged 18+" value={people.men_18_plus}/><Metric label="Women aged 18+" value={people.women_18_plus} tone="pink"/><Metric label="Children aged 6–17" value={people.children_6_17} tone="blue"/><Metric label="Children under 6" value={people.children_under_6} tone="blue"/><Metric label="Newborns, 0–28 days" value={people.newborns} tone="blue"/><Metric label="Babies under 1 year" value={people.babies_under_1} tone="blue"/><Metric label="Pregnant women" value={people.pregnant} tone="pink"/>
      </div><div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3"><Panel title="People by age" note="Age groups do not overlap. Counts are hidden below 5."><SimpleBars data={ageData}/></Panel><Panel title="Children under 6: vaccine status" note={`Based on ${fmt(people.children_in_vaccine_summary)} children under 6. A saved dose alone does not mean all due vaccines are complete.`}><div id="children-section" className="scroll-mt-20"><SimpleBars data={vaccineData} color="#2563eb"/></div><div className="mt-3 border-t border-slate-100 pt-3"><h4 className="text-xs font-bold text-slate-700">Recorded vaccine doses</h4><p className="mt-1 text-[11px] text-slate-500">A dose not listed here may not be due or may not be recorded. Check the child’s card for the due schedule.</p>{vaccineDoseRows.length ? <div className="mt-2 space-y-2">{vaccineDoseRows.map(row=><div key={row.name} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"><strong>{row.name}</strong><span>Given {fmt(row.given)} · Missed {fmt(row.missed)} · Late {fmt(row.overdue)}</span></div>)}</div> : <p className="mt-2 text-xs text-slate-500">No vaccine dose details recorded.</p>}</div></Panel><Panel title="Pregnancy month" note="Month ranges are based on saved pregnancy month."><SimpleBars data={pregnancyData} color="#db2777"/></Panel></div></section>

      <section id="problems-section" className="scroll-mt-20"><div className="mb-3"><h2 className="text-lg font-bold text-slate-900">Recorded health concerns</h2><p className="text-sm text-slate-600">These are concerns written in the records. They are not all confirmed diagnoses.</p></div><div className="grid grid-cols-1 gap-3 lg:grid-cols-2"><Panel title="Most recorded concerns" note={`People assessed: ${fmt(problems.overall_assessed)}. Counts are people, not repeat visits.`}><IssueList issues={problems.overall} assessed={problems.overall_assessed}/></Panel><Panel title="Concerns by age and gender" note="Choose a group to see recorded concerns and the share of assessed people."><label className="mb-3 block max-w-md text-xs font-semibold text-slate-600">Show group<select value={issueGroup} onChange={e => setIssueGroup(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm"><option>All people</option>{(problems.groups || []).map(item => <option key={item.name}>{item.name}</option>)}</select></label>{group ? group.suppressed ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">This group has fewer than 5 people. Details are hidden for privacy.</p> : <IssueList issues={group.issues} assessed={group.assessed}/> : <IssueList issues={problems.overall} assessed={problems.overall_assessed}/>}</Panel></div></section>

      <section id="mothers-section" className="scroll-mt-20"><div className="mb-3"><h2 className="text-lg font-bold text-slate-900">Pregnancy and newborn care</h2><p className="text-sm text-slate-600">Only details saved in a record are counted. Missing details stay “Not recorded.”</p></div><div className="grid grid-cols-1 gap-3 lg:grid-cols-2"><Panel title="Pregnancy concerns" note={`Pregnant people assessed: ${fmt(problems.pregnancy_assessed)}.`}><IssueList issues={problems.pregnancy} assessed={problems.pregnancy_assessed}/></Panel><Panel title="Pregnancy checks" note="Shows what was done, not done, or not recorded."><SimpleBars data={pregnancyCareData} color="#db2777"/><div className="mt-3 space-y-2">{Object.entries(problems.antenatal_care || {}).map(([key,value])=><div key={key} className="rounded-lg bg-pink-50/60 px-3 py-2"><div className="text-xs font-semibold text-slate-700">{careLabels[key] || key}</div><div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-slate-600"><span>Done: {fmt(value.done)}</span><span>Not done: {fmt(value.not_done)}</span><span>Not recorded: {fmt(value.not_recorded)}</span></div></div>)}</div><div className="mt-3 rounded-lg bg-pink-50 p-3 text-xs text-slate-700">Check-up visits recorded: <strong>{fmt(people.pregnancy_visit_stats?.people_with_visits_recorded)}</strong> pregnant people · <strong>{fmt(people.pregnancy_visit_stats?.visits_total)}</strong> visits</div></Panel><Panel title="Newborn and baby concerns" note={`Newborns and babies with checks: ${fmt(problems.babies_assessed)}.`}><IssueList issues={problems.babies} assessed={problems.babies_assessed}/></Panel><Panel title="Newborn care records" note="Counts of newborn records with each detail saved."><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{[['Newborns aged 0–6 days',people.newborn_age_ranges?.['0-6 days']],['Newborns aged 7–28 days',people.newborn_age_ranges?.['7-28 days']],['Birth weight',newbornCare.birth_weight_recorded],['Feeding concerns',newbornCare.feeding_concerns_recorded],['Newborn check done',newbornCare.newborn_check_recorded],['Home visits',newbornCare.home_visits_recorded],['Birth vaccines given',newbornCare.birth_vaccines_given],['Birth vaccines missed',newbornCare.birth_vaccines_missed],['Birth vaccines not recorded',newbornCare.birth_vaccines_not_recorded]].map(([label,value])=><div key={label} className="rounded-lg bg-indigo-50 p-3"><div className="text-xs text-slate-600">{label}</div><div className="mt-1 font-bold text-slate-900">{fmt(value)}</div></div>)}</div></Panel></div></section>

      <section id="trends-section" className="scroll-mt-20"><div className="mb-3"><h2 className="text-lg font-bold text-slate-900">Screening results and trends</h2><p className="text-sm text-slate-600">These counts come from screening visits. Test results are not diagnoses.</p></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Normal screening results" value={analytics.summary?.green_count}/><Metric label="Needs follow-up" value={analytics.summary?.orange_count} tone="pink"/><Metric label="Needs urgent review" value={analytics.summary?.red_count} tone="pink"/><Metric label="Unique people screened" value={analytics.summary?.total_screened}/></div><div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3"><Panel title="Screening visits by month" note="Visits and unique people screened are shown separately."><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={analytics.time_series || []} margin={{ left: -18, right: 10, top: 10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" tick={{ fontSize: 10 }}/><YAxis allowDecimals={false} tick={{ fontSize: 11 }}/><Tooltip formatter={(value,label)=>[value == null ? 'Hidden for privacy' : fmt(value),label === 'unique_people' ? 'Unique people' : 'Visits']}/><Line type="monotone" dataKey="total" name="Visits" stroke="#0f766e" strokeWidth={3} dot={false}/><Line type="monotone" dataKey="unique_people" name="Unique people" stroke="#2563eb" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div></Panel><Panel title="People who had each check" note="Each person is counted once per type of check."><div className="space-y-3">{[['Blood pressure',analytics.vitals_breakdown?.people_assessed?.blood_pressure],['Blood sugar',analytics.vitals_breakdown?.people_assessed?.blood_glucose],['Oxygen level',analytics.vitals_breakdown?.people_assessed?.spo2],['Heart rate',analytics.vitals_breakdown?.people_assessed?.heart_rate]].map(([label,value])=><div key={label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span>{label}</span><strong>{fmt(value)}</strong></div>)}</div></Panel><Panel title="Blood pressure results" note="Results recorded at screening visits."><SimpleBars data={Object.entries(analytics.vitals_breakdown?.blood_pressure || {}).map(([name,count])=>({name,count}))} color="#7c3aed"/></Panel></div></section>
    </>}
    <nav aria-label="Analytics sections" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden">{[[Home,'Overview','overview-section'],[HeartPulse,'Problems','problems-section'],[Syringe,'Mothers','mothers-section'],[Baby,'Children','children-section']].map(([Icon,label,target])=><button key={label} type="button" onClick={()=>jumpTo(target)} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-800"><Icon size={19} aria-hidden="true"/><span>{label}</span></button>)}</nav>
  </main>;
};

export default AnalyticsPage;
