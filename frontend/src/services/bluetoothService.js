/**
 * Bluetooth BLE & Hardware Telemetry Service
 * Supports:
 * 1. Web Bluetooth API for ESP32 Master BLE connection (Chrome / Edge on Android & Desktop)
 * 2. Active Polling & GATT Notifications from HEALTH_MASTER
 * 3. Master BLE Service: 12345678-1234-1234-1234-1234567890ab
 *    Characteristic:     abcd1234-1234-1234-1234-1234567890ab
 * 4. Backward-compatible with Nordic UART & standard Health profiles
 * 5. Simulation Mode for development & offline testing
 */

export const BLE_SERVICES = {
  // ESP32 Health Master Service (Matches ESP32_master.ino)
  HEALTH_MASTER: '12345678-1234-1234-1234-1234567890ab',
  HEALTH_MASTER_CHAR: 'abcd1234-1234-1234-1234-1234567890ab',

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
    this.pollInterval = null;
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
   * Scan and connect to real ESP32 BLE hardware (HEALTH_MASTER)
   */
  async connectRealDevice() {
    if (!this.isSupported()) {
      throw new Error('Web Bluetooth is not supported in this browser. Please use Chrome or Edge on Android or Desktop.');
    }

    try {
      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          'generic_access',
          'heart_rate',
          'blood_pressure',
          'pulse_oximeter',
          BLE_SERVICES.HEALTH_MASTER,
          BLE_SERVICES.ESP32_CUSTOM
        ]
      });

      this.device.addEventListener('gattserverdisconnected', () => {
        this.stopPolling();
        this.isConnected = false;
        this.notify({ status: 'disconnected', deviceName: this.device.name });
      });

      this.server = await this.device.gatt.connect();
      this.isConnected = true;

      // 1. First attempt: Look for HEALTH_MASTER service (ESP32_master.ino)
      let boundChar = null;
      try {
        const service = await this.server.getPrimaryService(BLE_SERVICES.HEALTH_MASTER);
        boundChar = await service.getCharacteristic(BLE_SERVICES.HEALTH_MASTER_CHAR);
        console.log('[BLE] Connected to HEALTH_MASTER primary service and characteristic.');
      } catch (e1) {
        console.log('[BLE] HEALTH_MASTER service not found, trying ESP32 UART fallback...', e1);
        try {
          const service = await this.server.getPrimaryService(BLE_SERVICES.ESP32_CUSTOM);
          boundChar = await service.getCharacteristic(BLE_SERVICES.ESP32_RX_CHAR);
        } catch (e2) {
          console.warn('[BLE] Could not bind standard custom characteristic.', e2);
        }
      }

      this.characteristic = boundChar;

      // 2. Set up Notifications (if supported)
      if (this.characteristic && this.characteristic.properties.notify) {
        try {
          await this.characteristic.startNotifications();
          this.characteristic.addEventListener('characteristicvaluechanged', (event) => {
            const value = new TextDecoder().decode(event.target.value);
            this.parseESP32Payload(value);
          });
          console.log('[BLE] Enabled push notifications on ESP32 characteristic.');
        } catch (err) {
          console.warn('[BLE] startNotifications failed, falling back to polling only:', err);
        }
      }

      // 3. Start Active Polling: phone periodically reads latest readings from master
      this.startPolling();

      this.notify({
        status: 'connected',
        deviceName: this.device.name || 'HEALTH_MASTER (ESP32)',
        deviceId: this.device.id
      });

      return {
        success: true,
        name: this.device.name || 'HEALTH_MASTER (ESP32)',
        id: this.device.id
      };
    } catch (err) {
      this.stopPolling();
      this.isConnected = false;
      throw err;
    }
  }

  /**
   * Phone polling loop: keeps polling data from master characteristic
   */
  startPolling(intervalMs = 1200) {
    this.stopPolling();
    this.pollInterval = setInterval(async () => {
      if (!this.isConnected || !this.characteristic) return;
      try {
        const dataView = await this.characteristic.readValue();
        const rawText = new TextDecoder().decode(dataView);
        if (rawText && rawText.trim().length > 0) {
          this.parseESP32Payload(rawText);
        }
      } catch (err) {
        // Suppress transient read errors during scan transitions
      }
    }, intervalMs);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Parses JSON or structured string from ESP32 master:
   * Example: {"device_id":"HEALTH_MASTER","heart_rate":72,"spo2":98.4,"temperature":36.6,"height_cm":165.0}
   */
  parseESP32Payload(rawText) {
    try {
      const cleanText = rawText.trim();
      let data = null;

      // Attempt JSON parsing
      if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
        data = JSON.parse(cleanText);
      } else {
        // Fallback: extract numbers using regex if sent in custom plain text
        data = {};
        const hrMatch = cleanText.match(/(?:hr|pulse|heart rate)[:\s]*([0-9]+)/i);
        if (hrMatch) data.heart_rate = parseInt(hrMatch[1]);

        const o2Match = cleanText.match(/(?:spo2|o2|oxygen)[:\s]*([0-9.]+)/i);
        if (o2Match) data.spo2 = parseFloat(o2Match[1]);

        const tempMatch = cleanText.match(/(?:temp|temperature)[:\s]*([0-9.]+)/i);
        if (tempMatch) data.temperature = parseFloat(tempMatch[1]);

        const heightMatch = cleanText.match(/(?:height|ht)[:\s]*([0-9.]+)/i);
        if (heightMatch) data.height_cm = parseFloat(heightMatch[1]);
      }

      if (data) {
        this.notify({
          status: 'data',
          vitals: {
            heart_rate: data.heart_rate || data.hr || null,
            spo2: data.spo2 != null ? parseFloat(data.spo2) : null,
            temperature: data.temperature != null ? parseFloat(data.temperature) : null,
            height_cm: data.height_cm != null ? parseFloat(data.height_cm) : (data.height != null ? parseFloat(data.height) : null),
            systolic_bp: data.systolic_bp || data.sys || null,
            diastolic_bp: data.diastolic_bp || data.dia || null,
            blood_glucose: data.blood_glucose || data.glucose || null,
            device_id: data.device_id || (this.device ? (this.device.name || this.device.id) : 'HEALTH_MASTER')
          }
        });
      }
    } catch (e) {
      console.warn('[BLE] Could not parse master telemetry payload:', rawText);
    }
  }

  /**
   * Virtual Medical Device Simulator for demo testing (includes Height, HR, SpO2, Temp)
   */
  startSimulator() {
    this.stopSimulator();
    this.isSimulating = true;
    this.isConnected = true;

    this.notify({
      status: 'connected',
      deviceName: 'HEALTH_MASTER (Virtual Simulator)',
      deviceId: 'VIRTUAL-DEV-01'
    });

    let baseSys = 118;
    let baseDia = 78;
    let baseHR = 74;
    let baseSpO2 = 98.4;
    let baseTemp = 36.6;
    let baseHeight = 165.0;

    this.simulatorInterval = setInterval(() => {
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
        height_cm: parseFloat(baseHeight.toFixed(1)),
        blood_glucose: 104.0,
        device_id: 'HEALTH_MASTER (Virtual)'
      };

      this.notify({
        status: 'data',
        vitals
      });
    }, 1500);
  }

  stopSimulator() {
    if (this.simulatorInterval) {
      clearInterval(this.simulatorInterval);
      this.simulatorInterval = null;
    }
    this.isSimulating = false;
  }

  disconnect() {
    this.stopPolling();
    this.stopSimulator();
    if (this.device && this.device.gatt && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.isConnected = false;
    this.device = null;
    this.characteristic = null;
    this.notify({ status: 'disconnected' });
  }
}

export const bluetoothService = new BluetoothService();
export default bluetoothService;
