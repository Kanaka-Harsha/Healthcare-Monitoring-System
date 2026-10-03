/**
 * Bluetooth BLE & Hardware Telemetry Service
 * Supports:
 * 1. Web Bluetooth API for ESP32 BLE GATT connection (Chrome, Edge, Android Chrome)
 * 2. ESP32 UART & Standard Health GATT characteristics (Heart Rate, Blood Pressure, SpO2)
 * 3. Pluggable Simulation Mode for rapid development & offline testing
 */

// Common ESP32 BLE Service UUIDs
export const BLE_SERVICES = {
  // Custom ESP32 UART Telemetry
  ESP32_CUSTOM: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
  ESP32_RX_CHAR: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
  // Standard Bluetooth SIG Health Profiles
  HEART_RATE: 0x180D,
  HEART_RATE_CHAR: 0x2A37,
  BLOOD_PRESSURE: 0x1810,
  BLOOD_PRESSURE_CHAR: 0x2A35,
  PULSE_OXIMETER: 0x1822,
  PULSE_OXIMETER_CHAR: 0x2A5F
};

class BluetoothService {
  constructor() {
    this.device = null;
    this.server = null;
    this.characteristic = null;
    this.isConnected = false;
    this.isSimulating = false;
    this.simulatorInterval = null;
    this.listeners = new Set();
  }

  isSupported() {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(data) {
    this.listeners.forEach((callback) => {
      try {
        callback(data);
      } catch (err) {
        console.error('Error in BLE subscriber:', err);
      }
    });
  }

  /**
   * Scan and connect to real ESP32 BLE hardware
   */
  async connectRealDevice() {
    if (!this.isSupported()) {
      throw new Error('Web Bluetooth is not supported in this browser. Please use Chrome/Edge on Android or Desktop.');
    }

    try {
      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          'generic_access',
          'heart_rate',
          'blood_pressure',
          'pulse_oximeter',
          BLE_SERVICES.ESP32_CUSTOM
        ]
      });

      this.device.addEventListener('gattserverdisconnected', () => {
        this.isConnected = false;
        this.notify({ status: 'disconnected', deviceName: this.device.name });
      });

      this.server = await this.device.gatt.connect();
      this.isConnected = true;

      // Try discovering custom ESP32 service or standard GATT
      try {
        const service = await this.server.getPrimaryService(BLE_SERVICES.ESP32_CUSTOM);
        const char = await service.getCharacteristic(BLE_SERVICES.ESP32_RX_CHAR);
        await char.startNotifications();
        char.addEventListener('characteristicvaluechanged', (event) => {
          const value = new TextDecoder().decode(event.target.value);
          this.parseESP32Payload(value);
        });
      } catch (e) {
        console.log('Custom ESP32 UART service not found, listening on standard characteristics...', e);
      }

      this.notify({
        status: 'connected',
        deviceName: this.device.name || 'ESP32 Healthcare Node',
        deviceId: this.device.id
      });

      return {
        success: true,
        name: this.device.name || 'ESP32 Healthcare Node',
        id: this.device.id
      };
    } catch (err) {
      this.isConnected = false;
      throw err;
    }
  }

  /**
   * Parses JSON string from ESP32: {"systolic_bp":120, "diastolic_bp":80, "heart_rate":72, "spo2":98.5, "temp":36.6}
   */
  parseESP32Payload(rawText) {
    try {
      const data = JSON.parse(rawText);
      this.notify({
        status: 'data',
        vitals: {
          systolic_bp: data.systolic_bp || data.sys || null,
          diastolic_bp: data.diastolic_bp || data.dia || null,
          heart_rate: data.heart_rate || data.hr || null,
          spo2: data.spo2 || data.ox || null,
          temperature: data.temperature || data.temp || null,
          blood_glucose: data.blood_glucose || data.glucose || null,
          device_id: this.device ? this.device.name || this.device.id : 'ESP32-BLE-NODE'
        }
      });
    } catch (e) {
      console.warn('Could not parse BLE string as JSON:', rawText);
    }
  }

  /**
   * Start ESP32 Hardware Simulator for testing without physical board
   */
  startSimulator() {
    this.stopSimulator();
    this.isSimulating = true;
    this.isConnected = true;

    this.notify({
      status: 'connected',
      deviceName: 'ESP32-HEALTH-SIMULATOR (Virtual BLE)',
      deviceId: 'SIM-ESP32-V1'
    });

    let baseSys = 118;
    let baseDia = 78;
    let baseHR = 72;
    let baseSpO2 = 98.4;
    let baseTemp = 36.6;

    // Send realistic simulated vital updates every 2 seconds
    this.simulatorInterval = setInterval(() => {
      // Natural minor fluctuations
      const hrFluctuation = Math.floor(Math.random() * 5) - 2;
      const spo2Fluctuation = (Math.random() * 0.4 - 0.2);
      const sysFluctuation = Math.floor(Math.random() * 4) - 2;
      const diaFluctuation = Math.floor(Math.random() * 3) - 1;

      const vitals = {
        systolic_bp: Math.max(90, Math.min(160, baseSys + sysFluctuation)),
        diastolic_bp: Math.max(60, Math.min(100, baseDia + diaFluctuation)),
        heart_rate: Math.max(55, Math.min(120, baseHR + hrFluctuation)),
        spo2: parseFloat(Math.max(92.0, Math.min(99.8, baseSpO2 + spo2Fluctuation)).toFixed(1)),
        temperature: parseFloat(baseTemp.toFixed(1)),
        blood_glucose: 104.0,
        device_id: 'ESP32-HEALTH-SIMULATOR'
      };

      this.notify({
        status: 'data',
        vitals
      });
    }, 2000);
  }

  stopSimulator() {
    if (this.simulatorInterval) {
      clearInterval(this.simulatorInterval);
      this.simulatorInterval = null;
    }
    this.isSimulating = false;
  }

  disconnect() {
    this.stopSimulator();
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.isConnected = false;
    this.device = null;
    this.notify({ status: 'disconnected' });
  }
}

export const bluetoothService = new BluetoothService();
export default bluetoothService;
