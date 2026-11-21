import React from 'react';
import { Activity, Heart, Thermometer, Ruler, ArrowDownToLine, RefreshCw } from 'lucide-react';

const LiveVitalsWidget = ({ vitals, isConnected, onApplyToForm, onOpenModal }) => {
  if (!isConnected || !vitals) {
    return null;
  }

  // Calculate BP Category
  const getBPCategory = (sys, dia) => {
    if (!sys || !dia) return { label: 'Manual BP Required', color: 'text-slate-500' };
    if (sys < 120 && dia < 80) return { label: 'Normal BP', color: 'text-emerald-700 font-semibold' };
    if (sys <= 129 && dia < 80) return { label: 'Elevated BP', color: 'text-amber-700 font-semibold' };
    if (sys <= 139 || dia <= 89) return { label: 'Stage 1 High BP', color: 'text-orange-700 font-semibold' };
    return { label: 'Stage 2 High BP', color: 'text-rose-700 font-bold' };
  };

  const bpCat = getBPCategory(vitals.systolic_bp, vitals.diastolic_bp);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-teal-200 shadow-sm space-y-3.5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Live Telemetry from ESP32 Master & Slaves
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-700 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 font-mono">
            {vitals.device_id || 'HEALTH_MASTER'}
          </span>
          <button
            type="button"
            onClick={onOpenModal}
            className="text-xs text-teal-800 hover:underline font-semibold"
          >
            Change Device
          </button>
        </div>
      </div>

      {/* Vitals Grid (Includes Height from HEIGHT_SLAVE) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        
        {/* Pulse Rate (from HR_SLAVE) */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span>Pulse (HR)</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-slate-900">{vitals.heart_rate ?? '--'}</span>
            <span className="text-xs text-slate-400">BPM</span>
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-slate-500">
            {vitals.heart_rate ? (vitals.heart_rate > 100 ? 'High Pulse' : vitals.heart_rate < 60 ? 'Low Pulse' : 'Normal') : 'Polling...'}
          </div>
        </div>

        {/* SpO2 Oxygen (from HR_SLAVE) */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Activity className="w-3.5 h-3.5 text-teal-600" />
            <span>Oxygen (SpO2)</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-slate-900">{vitals.spo2 ?? '--'}</span>
            <span className="text-xs text-slate-400">%</span>
          </div>
          <div className="mt-0.5 text-[11px] font-medium">
            {vitals.spo2 ? (
              vitals.spo2 >= 95 ? (
                <span className="text-emerald-700 font-semibold">Normal</span>
              ) : (
                <span className="text-rose-700 font-bold">Low Oxygen</span>
              )
            ) : (
              <span className="text-slate-400">Polling...</span>
            )}
          </div>
        </div>

        {/* Temperature (from TEMP_SLAVE) */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Thermometer className="w-3.5 h-3.5 text-amber-600" />
            <span>Temperature</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-slate-900">{vitals.temperature ?? '36.6'}</span>
            <span className="text-xs text-slate-400">°C</span>
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-slate-500">
            {vitals.temperature ? (vitals.temperature > 37.5 ? 'Fever Warning' : 'Normal') : 'Reading...'}
          </div>
        </div>

        {/* Height (from HEIGHT_SLAVE) */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Ruler className="w-3.5 h-3.5 text-indigo-600" />
            <span>Height</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-slate-900">{vitals.height_cm ?? '--'}</span>
            <span className="text-xs text-slate-400">cm</span>
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-slate-500">
            {vitals.height_cm ? `${(vitals.height_cm / 100).toFixed(2)} m` : 'From Height Slave'}
          </div>
        </div>

        {/* Blood Pressure (Manual or Aux BP Monitor) */}
        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-xs font-semibold text-slate-600 block">Blood Pressure</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-slate-900">
              {vitals.systolic_bp ? `${vitals.systolic_bp}/${vitals.diastolic_bp}` : '--/--'}
            </span>
            <span className="text-xs text-slate-400">mmHg</span>
          </div>
          <div className={`mt-0.5 text-[11px] ${bpCat.color}`}>
            {bpCat.label}
          </div>
        </div>

      </div>

      {/* Transfer to Form Button */}
      <button
        type="button"
        onClick={() => onApplyToForm(vitals)}
        className="w-full py-2.5 px-4 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-2"
      >
        <ArrowDownToLine className="w-4 h-4" />
        <span>Transfer Live Readings (HR, SpO2, Temp, Height) Into Form</span>
      </button>

    </div>
  );
};

export default LiveVitalsWidget;
