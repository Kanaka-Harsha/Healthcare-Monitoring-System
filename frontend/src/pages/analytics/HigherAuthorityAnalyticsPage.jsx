import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api, { extractErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const STATES = ['Andhra Pradesh'];
const COLORS = ['#0f766e','#2563eb','#f59e0b','#e11d48','#7c3aed','#0891b2'];
const fmt = n => Number(n || 0).toLocaleString('en-IN');
const Panel = ({ title, children, className = '' }) => <section className={`bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm min-w-0 ${className}`}><h3 className="text-base font-bold text-slate-900 mb-4">{title}</h3>{children}</section>;
const Metric = ({ label, value, note }) => <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-sm text-slate-600">{label}</div><div className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900">{fmt(value)}</div>{note && <div className="mt-1 text-xs text-slate-500">{note}</div>}</div>;
const SimpleBars = ({ data, nameKey = 'name', color = '#0f766e' }) => data?.length ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 25 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey={nameKey} interval={0} angle={-18} textAnchor="end" height={55} tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" fill={color} radius={[5,5,0,0]} /></BarChart></ResponsiveContainer></div> : <p className="text-sm text-slate-500 py-8 text-center">No details recorded for this period.</p>;
const AnalyticsPage = () => {
  const { user } = useAuth();
  const level = (user?.jurisdictionLevel || '').toLowerCase();
  const isPHC = ['phc','primary_health_center','primary_health_centre'].includes(level);
  const isMandal = ['mandal','block','town','city'].includes(level);
  const isDistrict = ['district','collector','dhmo'].includes(level);
  const isState = ['state','national','country'].includes(level);
  const [days, setDays] = useState(30);
  const [state] = useState('Andhra Pradesh');
  const [district, setDistrict] = useState(user?.district || 'All');
  const [mandal, setMandal] = useState(user?.mandal || 'All');
  const [village, setVillage] = useState(user?.village || 'All');
  const [phc, setPhc] = useState(user?.phc || 'All');
  const [issue, setIssue] = useState('All');
  const [locations, setLocations] = useState({ states: STATES, districts: [], mandals: [], villages: [], phcs: [], problems: [] });
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const params = useMemo(() => {
    const end = new Date(); const start = new Date(); start.setDate(end.getDate() - Number(days) + 1);
    const localDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return { time_range: 'custom', start_date: localDate(start), end_date: localDate(end), state: state !== 'All' ? state : undefined, district: district !== 'All' ? district : undefined, mandal: mandal !== 'All' ? mandal : undefined, village: village !== 'All' ? village : undefined, phc: phc !== 'All' ? phc : undefined, primary_issue: issue !== 'All' ? issue : undefined };
  }, [days,state,district,mandal,village,phc,issue]);
  const loadAnalytics = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await api.get('/analytics/dashboard', { params }); setAnalytics(response.data); }
    catch (e) { setError(extractErrorMessage(e, 'Unable to load the health summary.')); }
    finally { setLoading(false); }
  }, [params]);
  useEffect(() => { const timer = setTimeout(loadAnalytics, 250); return () => clearTimeout(timer); }, [loadAnalytics]);
  useEffect(() => {
    api.get('/analytics/locations', { params: { state: state !== 'All' ? state : undefined, district: district !== 'All' ? district : undefined, city: 'All' } }).then(({data}) => setLocations({ states: data.states?.length ? data.states : STATES, districts: data.districts || [], mandals: data.mandals || [], villages: data.villages || [], phcs: data.phcs || [], problems: data.problems || [] })).catch(() => {});
  }, [state,district,mandal]);
  const reset = () => { setDays(30); setDistrict(user?.district || 'All'); setMandal(user?.mandal || 'All'); setVillage(user?.village || 'All'); setPhc(user?.phc || 'All'); setIssue('All'); };
  const p = analytics?.people || {}; const problems = analytics?.problems || {};
  const ageData = Object.entries(p.age_counts || {}).map(([name,count]) => ({ name: name === '0-2' ? 'Babies 0–2' : name === '3-17' ? 'Children 3–17' : name === '18-59' ? 'Adults 18–59' : name === '60+' ? 'Older 60+' : 'Age unknown', count }));
  const pregnancyData = Object.entries(p.pregnancy_month_ranges || {}).map(([name,count]) => ({ name: name === 'Not recorded' ? name : `Month ${name}`, count }));
  const babyMonthData = Object.entries(p.baby_month_ranges || {}).map(([name,count]) => ({ name: name === 'Not recorded' ? name : `${name} months`, count }));
  const vaccineData = Object.entries(p.vaccination || {}).map(([key,count]) => ({ name: ({up_to_date:'All due vaccines given',some_missed:'Some missed',overdue:'Overdue',not_recorded:'Not recorded'})[key] || key, count }));
  return <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-slate-900">Community health</h1><p className="mt-1 text-sm text-slate-600">A simple view of people, health problems and screening visits.</p>{user?.district && <p className="mt-1 text-xs text-teal-800">Your area: {[user?.state,user?.district,user?.mandal,user?.phc].filter(Boolean).join(' · ')}</p>}</div><button onClick={loadAnalytics} className="rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900">Refresh</button></header>
    <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><h2 className="font-bold text-slate-900">Choose an area and time</h2><button onClick={reset} className="text-sm text-teal-800 underline">Clear filters</button></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
      <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2.5 text-sm font-semibold text-teal-900">State: Andhra Pradesh</div>
      {!isState && !isPHC && !isMandal && <label className="text-xs font-semibold text-slate-600">District<select value={district} onChange={e=>{setDistrict(e.target.value);setMandal('All');setVillage('All');setPhc('All')}} className="mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm"><option>All</option>{locations.districts.map(x=><option key={x}>{x}</option>)}</select></label>}
      {!isPHC && <label className="text-xs font-semibold text-slate-600">Mandal<select value={mandal} onChange={e=>{setMandal(e.target.value);setVillage('All');setPhc('All')}} className="mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm"><option>All</option>{locations.mandals.map(x=><option key={x}>{x}</option>)}</select></label>}
      {!isPHC && <label className="text-xs font-semibold text-slate-600">Village / town<select value={village} onChange={e=>setVillage(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm"><option>All</option>{locations.villages.map(x=><option key={x}>{x}</option>)}</select></label>}
      {!isMandal && <label className="text-xs font-semibold text-slate-600">Health centre<select value={phc} onChange={e=>setPhc(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm"><option>All</option>{locations.phcs.map(x=><option key={x}>{x}</option>)}</select></label>}
      <label className="text-xs font-semibold text-slate-600">Health problem<select value={issue} onChange={e=>setIssue(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm"><option>All</option>{locations.problems.map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="sm:col-span-2 text-xs font-semibold text-slate-600">Time period: last {days} days<input type="range" min="7" max="365" step="1" value={days} onChange={e=>setDays(Number(e.target.value))} className="mt-3 block w-full accent-teal-800"/><span className="flex justify-between text-[11px] font-normal"><span>7 days</span><span>1 year</span></span></label>
    </div></section>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
    {loading && !analytics ? <div className="rounded-xl border bg-white p-12 text-center text-slate-600">Loading health information…</div> : analytics && <div className="space-y-6">
      <section><div className="mb-3"><h2 className="text-lg font-bold text-slate-900">People and care</h2><p className="text-sm text-slate-600">People registered in this area and period. Screening visits are counted separately.</p></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Metric label="People screened" value={p.screened}/><Metric label="Women" value={p.women}/><Metric label="Children" value={p.children}/><Metric label="Babies" value={p.babies}/><Metric label="Pregnant women" value={p.pregnant}/><Metric label="All people registered" value={p.total}/><Panel title="Vaccines for children"><SimpleBars data={vaccineData} color="#2563eb"/></Panel></div><div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3"><Panel title="People by age"><SimpleBars data={ageData}/></Panel><Panel title="Babies by age in months"><SimpleBars data={babyMonthData} color="#2563eb"/></Panel><Panel title="Pregnant women by month range"><SimpleBars data={pregnancyData} color="#db2777"/></Panel></div></section>
      <section><div className="mb-3"><h2 className="text-lg font-bold text-slate-900">Health problems</h2><p className="text-sm text-slate-600">Recorded problems by age, pregnancy, babies and health area.</p></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-3"><Panel title="Common health problems"><SimpleBars data={(problems.overall || []).map(x=>({name:x.name,count:x.count}))}/></Panel><Panel title="Pregnancy problems"><SimpleBars data={(problems.pregnancy || []).map(x=>({name:x.name,count:x.count}))} color="#db2777"/></Panel><Panel title="Baby health and growth problems"><SimpleBars data={(problems.babies || []).map(x=>({name:x.name,count:x.count}))} color="#2563eb"/></Panel><Panel title="Problems by age"><div className="space-y-3">{(problems.by_age || []).length ? problems.by_age.map(row=><div key={row.age_group}><h4 className="text-sm font-bold text-slate-700">{row.age_group} years</h4><div className="mt-1 flex flex-wrap gap-2">{row.issues.map(item=><span key={item.name} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{item.name}: {fmt(item.count)}</span>)}</div></div>) : <p className="text-sm text-slate-500 py-8 text-center">No details recorded for this period.</p>}</div></Panel></div></section>
      <section><div className="mb-3"><h2 className="text-lg font-bold text-slate-900">Screening visits</h2><p className="text-sm text-slate-600">Number of visits and results during the selected time.</p></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Metric label="Screening visits" value={analytics.summary?.total_screened}/><Metric label="Normal results" value={analytics.summary?.green_count}/><Metric label="Needs attention" value={analytics.summary?.orange_count}/><Metric label="Needs urgent care" value={analytics.summary?.red_count}/></div><div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3"><Panel title="Screenings over time"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={analytics.time_series || []} margin={{left:-18,right:10,top:10,bottom:5}}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" interval={days > 180 ? 30 : days > 60 ? 10 : days > 30 ? 4 : 0} tick={{fontSize:10}}/><YAxis allowDecimals={false} tick={{fontSize:11}}/><Tooltip/><Line type="monotone" dataKey="total" stroke="#0f766e" strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer></div></Panel><Panel title="Screening summary"><div className="space-y-4">{[['Normal',analytics.summary?.green_count,'bg-emerald-500'],['Needs attention',analytics.summary?.orange_count,'bg-amber-500'],['Needs urgent care',analytics.summary?.red_count,'bg-rose-500']].map(([label,count,color])=><div key={label}><div className="flex justify-between text-sm"><span>{label}</span><strong>{fmt(count)}</strong></div><div className="mt-1 h-2 rounded bg-slate-100"><div className={`h-2 rounded ${color}`} style={{width:`${analytics.summary?.total_screened ? count / analytics.summary.total_screened * 100 : 0}%`}}/></div></div>)}</div></Panel></div></section>
    </div>}
  </main>;
};
export default AnalyticsPage;
