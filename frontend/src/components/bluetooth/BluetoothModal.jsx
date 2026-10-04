import React, { useState, useEffect } from 'react';
import bluetoothService from '../../services/bluetoothService';
import { Bluetooth, Radio, Cpu, CheckCircle2, AlertCircle, Play, Square, X, Activity } from 'lucide-react';

const BluetoothModal = ({ isOpen, onClose, onVitalsReceived }) => {
  const [status, setStatus] = useState(bluetoothService.isConnected ? 'connected' : 'disconnected');
  const [deviceName, setDeviceName] = useState(bluetoothService.device?.name || (bluetoothService.isSimulating ? 'ESP32-HEALTH-SIMULATOR' : ''));
  const [isSimulating, setIsSimulating] = useState(bluetoothService.isSimulating);
  const [errorMsg, setErrorMsg] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const unsubscribe = bluetoothService.subscribe((event) => {
      if (event.status === 'connected') {
        setStatus('connected');
        setDeviceName(event.deviceName);
        setIsScanning(false);
        setErrorMsg('');
      } else if (event.status === 'disconnected') {
        setStatus('disconnected');
        setIsSimulating(false);
      } else if (event.status === 'data') {
        if (onVitalsReceived) {
          onVitalsReceived(event.vitals);
        }
      }
    });

    return () => unsubscribe();
  }, [onVitalsReceived]);

  if (!isOpen) return null;

  const handleConnectRealBLE = async () => {
    setErrorMsg('');
    setIsScanning(true);
    try {
      await bluetoothService.connectRealDevice();
    } catch (err) {
      setIsScanning(false);
      setErrorMsg(err.message || 'Failed to connect to ESP32 device.');
    }
  };

  const handleToggleSimulator = () => {
    if (isSimulating) {
      bluetoothService.stopSimulator();
      setIsSimulating(false);
      setStatus('disconnected');
    } else {
      bluetoothService.startSimulator();
      setIsSimulating(true);
      setStatus('connected');
      setDeviceName('ESP32-HEALTH-SIMULATOR (Virtual)');
    }
  };

  const handleDisconnect = () => {
    bluetoothService.disconnect();
    setStatus('disconnected');
    setIsSimulating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg glass-panel rounded-2xl border border-slate-800 shadow-2xl p-6 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Bluetooth className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Medical Device Connection</h3>
              <p className="text-xs text-slate-400">Wireless Health Device Hub</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Display */}
        <div className="mt-5 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${status === 'connected' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                <Radio className={`w-5 h-5 ${status === 'connected' ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Device Status</p>
                <p className="text-sm font-bold text-white">
                  {status === 'connected' ? deviceName : 'No Device Connected'}
                </p>
              </div>
            </div>
            <div>
              {status === 'connected' ? (
                <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected & Streaming
                </span>
              ) : (
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  Disconnected
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Options */}
        <div className="mt-6 space-y-3">
          
          {/* Option 1: Real Bluetooth Device Connection */}
          <div className="p-4 rounded-xl glass-card hover:border-teal-500/40 transition">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Bluetooth className="w-4 h-4 text-teal-400" /> Bluetooth Medical Device
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pairs with nearby wireless health monitor or sensor
                </p>
              </div>
              <button
                onClick={handleConnectRealBLE}
                disabled={isScanning || (status === 'connected' && !isSimulating)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isScanning ? (
                  <>
                    <Activity className="w-3.5 h-3.5 animate-spin" /> Scanning...
                  </>
                ) : status === 'connected' && !isSimulating ? (
                  'Connected'
                ) : (
                  'Scan & Connect'
                )}
              </button>
            </div>
          </div>

          {/* Option 2: Virtual Device Simulator */}
          <div className="p-4 rounded-xl glass-card hover:border-cyan-500/40 transition">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" /> Virtual Medical Device (Demo Mode)
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Streams live sample patient readings (BP, Heart Rate, Oxygen)
                </p>
              </div>
              <button
                onClick={handleToggleSimulator}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                  isSimulating
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                }`}
              >
                {isSimulating ? (
                  <>
                    <Square className="w-3.5 h-3.5" /> Stop Device
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" /> Start Device
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          {status === 'connected' && (
            <button
              onClick={handleDisconnect}
              className="text-xs text-rose-400 hover:text-rose-300 transition underline font-medium"
            >
              Disconnect Current Device
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

export default BluetoothModal;
