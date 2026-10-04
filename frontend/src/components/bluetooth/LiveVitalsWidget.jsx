import React from 'react';

const LiveVitalsWidget = ({ vitals, isConnected, onApplyToForm, onOpenModal }) => {
  if (!isConnected || !vitals) {
    return null;
  }

  // Calculate BP Category
  const getBPCategory = (sys, dia) => {
    if (!sys || !dia) return { label: 'Unknown', color: 'text-slate-600' };
    if (sys < 120 && dia < 80) return { label: 'Normal', color: 'text-emerald-700' };
    if (sys <= 129 && dia < 80) return { label: 'Elevated', color: 'text-amber-700' };
    if (sys <= 139 || dia <= 89) return { label: 'Stage 1 High BP', color: 'text-orange-700' };
    return { label: 'Stage 2 High BP', color: 'text-rose-700' };
  };

  const bpCat = getBPCategory(vitals.systolic_bp, vitals.diastolic_bp);

  return (
    <div className="p-4 rounded bg-white border border-teal-200 space-y-3 shadow-sm">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Live Health Device Readings
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
            Device: {vitals.device_id || 'Connected Device'}
          </span>
          <button
            onClick={onOpenModal}
            className="text-xs text-teal-800 hover:underline font-medium"
          >
            Change Device
          </button>
        </div>
      </div>

      {/* Vitals Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* Blood Pressure */}
        <div className="p-3 rounded bg-slate-50 border border-slate-200">
          <span className="text-xs font-medium text-slate-600 block">Blood Pressure</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-bold text-slate-900">
              {vitals.systolic_bp ?? '--'} / {vitals.diastolic_bp ?? '--'}
            </span>
            <span className="text-xs text-slate-500">mmHg</span>
          </div>
          <div className={`mt-0.5 text-xs font-semibold ${bpCat.color}`}>
            {bpCat.label}
          </div>
        </div>

        {/* Heart Rate */}
        <div className="p-3 rounded bg-slate-50 border border-slate-200">
          <span className="text-xs font-medium text-slate-600 block">Pulse Rate</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-bold text-slate-900">{vitals.heart_rate ?? '--'}</span>
            <span className="text-xs text-slate-500">BPM</span>
          </div>
          <div className="mt-0.5 text-xs font-semibold text-slate-700">
            {vitals.heart_rate ? (vitals.heart_rate > 100 ? 'High Pulse' : vitals.heart_rate < 60 ? 'Low Pulse' : 'Normal') : 'Reading...'}
          </div>
        </div>

        {/* SpO2 */}
        <div className="p-3 rounded bg-slate-50 border border-slate-200">
          <span className="text-xs font-medium text-slate-600 block">Oxygen (SpO2)</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-bold text-slate-900">{vitals.spo2 ?? '--'}</span>
            <span className="text-xs text-slate-500">%</span>
          </div>
          <div className="mt-0.5 text-xs font-semibold">
            {vitals.spo2 ? (
              vitals.spo2 >= 95 ? (
                <span className="text-emerald-700">Normal</span>
              ) : (
                <span className="text-rose-700">Low Oxygen</span>
              )
            ) : (
              <span className="text-slate-500">--</span>
            )}
          </div>
        </div>

        {/* Temperature */}
        <div className="p-3 rounded bg-slate-50 border border-slate-200">
          <span className="text-xs font-medium text-slate-600 block">Body Temperature</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-bold text-slate-900">{vitals.temperature ?? '36.6'}</span>
            <span className="text-xs text-slate-500">°C</span>
          </div>
          <div className="mt-0.5 text-xs font-semibold text-slate-700">
            {vitals.blood_glucose ? `Glucose: ${vitals.blood_glucose} mg/dL` : 'Normal Range'}
          </div>
        </div>

      </div>

      {/* Transfer to Form Button */}
      <button
        onClick={() => onApplyToForm(vitals)}
        className="w-full py-2 px-3 rounded bg-teal-800 hover:bg-teal-900 text-white font-semibold text-xs flex items-center justify-center gap-2 transition"
      >
        Transfer Live Readings Into Screening Form
      </button>

    </div>
  );
};

export default LiveVitalsWidget;
