import React from 'react';
import { Heart, Activity, Wind, Thermometer, Droplet, Bluetooth, ArrowDownRight, Check } from 'lucide-react';

const LiveVitalsWidget = ({ vitals, isConnected, onApplyToForm, onOpenModal }) => {
  if (!isConnected || !vitals) {
    return (
      <div className="p-6 rounded-2xl glass-card border border-dashed border-slate-800 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center mb-3">
          <Bluetooth className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-white">No Medical Device Connected</h4>
        <p className="text-xs text-slate-400 max-w-sm mt-1">
          Connect your wireless medical device or start virtual demo device to stream patient vitals.
        </p>
        <button
          onClick={onOpenModal}
          className="mt-4 px-4 py-2 text-xs font-bold rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 transition flex items-center gap-2 shadow-lg shadow-teal-500/20"
        >
          <Bluetooth className="w-3.5 h-3.5" /> Connect Device
        </button>
      </div>
    );
  }

  // Calculate BP Category
  const getBPCategory = (sys, dia) => {
    if (!sys || !dia) return { label: 'Unknown', color: 'text-slate-400' };
    if (sys < 120 && dia < 80) return { label: 'Optimal', color: 'text-emerald-400' };
    if (sys <= 129 && dia < 80) return { label: 'Elevated', color: 'text-amber-400' };
    if (sys <= 139 || dia <= 89) return { label: 'Stage 1 Hypertension', color: 'text-orange-400' };
    return { label: 'Stage 2 Hypertension', color: 'text-rose-400' };
  };

  const bpCat = getBPCategory(vitals.systolic_bp, vitals.diastolic_bp);

  return (
    <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
          </span>
          <h4 className="text-sm font-bold text-white tracking-wide uppercase">Live Patient Vitals Stream</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
            {vitals.device_id || 'Medical Device'}
          </span>
          <button
            onClick={onOpenModal}
            className="p-1 text-xs text-teal-400 hover:text-teal-300 transition underline font-medium"
          >
            Change
          </button>
        </div>
      </div>

      {/* Vitals Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* Blood Pressure */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Blood Pressure</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-white">
              {vitals.systolic_bp ?? '--'} / {vitals.diastolic_bp ?? '--'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">mmHg</span>
          </div>
          <div className="mt-1 text-[10px] font-bold">
            <span className={bpCat.color}>{bpCat.label}</span>
          </div>
        </div>

        {/* Heart Rate */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Heart Rate</span>
            <Heart className="w-4 h-4 text-rose-400 animate-heartbeat" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-white">{vitals.heart_rate ?? '--'}</span>
            <span className="text-[10px] text-slate-400 font-medium">BPM</span>
          </div>
          <div className="mt-1 text-[10px] font-bold text-emerald-400">
            {vitals.heart_rate ? (vitals.heart_rate > 100 ? 'Tachycardia' : vitals.heart_rate < 60 ? 'Bradycardia' : 'Normal Sinus') : 'Waiting...'}
          </div>
        </div>

        {/* SpO2 */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Oxygen SpO2</span>
            <Wind className="w-4 h-4 text-teal-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-white">{vitals.spo2 ?? '--'}</span>
            <span className="text-[10px] text-slate-400 font-medium">%</span>
          </div>
          <div className="mt-1 text-[10px] font-bold">
            {vitals.spo2 ? (
              vitals.spo2 >= 95 ? (
                <span className="text-emerald-400">Optimal</span>
              ) : (
                <span className="text-rose-400">Hypoxemia Alert</span>
              )
            ) : (
              <span className="text-slate-400">--</span>
            )}
          </div>
        </div>

        {/* Temperature & Glucose */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Temp / Glucose</span>
            <Thermometer className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-white">{vitals.temperature ?? '36.6'}</span>
            <span className="text-[10px] text-slate-400 font-medium">°C</span>
          </div>
          <div className="mt-1 text-[10px] font-bold text-slate-400">
            {vitals.blood_glucose ? `${vitals.blood_glucose} mg/dL` : 'Normal'}
          </div>
        </div>

      </div>

      {/* Transfer to Form Button */}
      <button
        onClick={() => onApplyToForm(vitals)}
        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-teal-500/10"
      >
        <ArrowDownRight className="w-4 h-4 stroke-[2.5]" /> Capture Live Readings Into Intake Form
      </button>

    </div>
  );
};

export default LiveVitalsWidget;
