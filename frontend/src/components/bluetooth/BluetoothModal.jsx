import React, { useState, useEffect } from 'react';
import bluetoothService from '../../services/bluetoothService';

const BluetoothModal = ({ isOpen, onClose, onVitalsReceived }) => {
  const [status, setStatus] = useState(bluetoothService.isConnected ? 'connected' : 'disconnected');
  const [deviceName, setDeviceName] = useState(bluetoothService.device?.name || (bluetoothService.isSimulating ? 'HEALTH-SIMULATOR' : ''));
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
      setErrorMsg(err.message || 'Failed to connect to medical device.');
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
      setDeviceName('HEALTH-SIMULATOR (Virtual Demo)');
    }
  };

  const handleDisconnect = () => {
    bluetoothService.disconnect();
    setStatus('disconnected');
    setIsSimulating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
      <div className="relative w-full max-w-md bg-white rounded border border-slate-200 shadow-lg p-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">Medical Device Connection</h3>
            <p className="text-xs text-slate-500">Connect a wireless medical sensor or run virtual device</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Status Display */}
        <div className="mt-4 p-3 rounded bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-500 uppercase font-semibold">Device Status</p>
              <p className="text-sm font-bold text-slate-900">
                {status === 'connected' ? deviceName : 'No Device Connected'}
              </p>
            </div>
            <div>
              {status === 'connected' ? (
                <span className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Connected & Streaming
                </span>
              ) : (
                <span className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-200 text-slate-700">
                  Disconnected
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mt-3 p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Action Options */}
        <div className="mt-4 space-y-3">
          
          {/* Option 1: Real Bluetooth Device Connection */}
          <div className="p-3 rounded bg-white border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Wireless Bluetooth Sensor</h4>
                <p className="text-[11px] text-slate-500">Pairs with nearby health monitor</p>
              </div>
              <button
                onClick={handleConnectRealBLE}
                disabled={isScanning || (status === 'connected' && !isSimulating)}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-teal-800 hover:bg-teal-900 text-white transition disabled:opacity-50"
              >
                {isScanning ? 'Scanning...' : status === 'connected' && !isSimulating ? 'Connected' : 'Scan & Pair'}
              </button>
            </div>
          </div>

          {/* Option 2: Virtual Device Simulator */}
          <div className="p-3 rounded bg-white border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Virtual Medical Device (Demo)</h4>
                <p className="text-[11px] text-slate-500">Generates test patient vitals</p>
              </div>
              <button
                onClick={handleToggleSimulator}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
                  isSimulating
                    ? 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                    : 'bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200'
                }`}
              >
                {isSimulating ? 'Stop Device' : 'Start Demo'}
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between">
          {status === 'connected' && (
            <button
              onClick={handleDisconnect}
              className="text-xs text-rose-700 hover:underline font-semibold"
            >
              Disconnect Current Device
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-900 text-white transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default BluetoothModal;
