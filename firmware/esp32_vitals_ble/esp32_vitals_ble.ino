/*
 * Healthcare Monitoring System - ESP32 BLE Telemetry Firmware
 *
 * This sketch configures the ESP32 as a Bluetooth Low Energy (BLE) server
 * matching the Web Bluetooth service in the Healthcare Monitoring System.
 *
 * Service UUID:         6e400001-b5a3-f393-e0a9-e50e24dcca9e
 * Characteristic UUID:  6e400003-b5a3-f393-e0a9-e50e24dcca9e (NOTIFY)
 *
 * Payload Format (JSON):
 * {
 *   "systolic_bp": 120,
 *   "diastolic_bp": 80,
 *   "heart_rate": 74,
 *   "spo2": 98.6,
 *   "temperature": 36.7,
 *   "blood_glucose": 105.0
 * }
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// Device Name advertised over BLE
#define DEVICE_NAME "ESP32-HealthPulse"

// BLE UUIDs configured in frontend bluetoothService.js
#define SERVICE_UUID           "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_TX_UUID "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

BLEServer* pServer = NULL;
BLECharacteristic* pTxCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// Interval between data transmissions (in milliseconds)
const unsigned long SEND_INTERVAL_MS = 2000;
unsigned long lastSendTime = 0;

// Base baseline vitals for smooth, realistic drift
int baseSystolic = 120;
int baseDiastolic = 80;
int baseHeartRate = 72;
float baseSpO2 = 98.4;
float baseTemp = 36.6;
float baseGlucose = 104.0;

class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    deviceConnected = true;
    Serial.println("[BLE] Client phone/browser connected!");
  }

  void onDisconnect(BLEServer* pServer) override {
    deviceConnected = false;
    Serial.println("[BLE] Client disconnected.");
  }
};

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("=========================================");
  Serial.println(" Healthcare Monitoring ESP32 BLE Server  ");
  Serial.println("=========================================");

  // Initialize BLE Device
  BLEDevice::init(DEVICE_NAME);

  // Create BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create BLE Service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Create BLE TX Characteristic with NOTIFY property
  pTxCharacteristic = pService->createCharacteristic(
                        CHARACTERISTIC_TX_UUID,
                        BLECharacteristic::PROPERTY_NOTIFY |
                        BLECharacteristic::PROPERTY_READ
                      );

  // Add 2902 Descriptor for enabling client notifications
  pTxCharacteristic->addDescriptor(new BLE2902());

  // Start the service
  pService->start();

  // Start advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06); // functions that help with iPhone connections issue
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("[BLE] Advertising started. Ready to pair with app!");
  Serial.println("Device Name: " DEVICE_NAME);
}

void loop() {
  unsigned long currentMillis = millis();

  // Send telemetry data periodically when connected
  if (deviceConnected && (currentMillis - lastSendTime >= SEND_INTERVAL_MS)) {
    lastSendTime = currentMillis;

    // Generate natural random fluctuations
    int sysDrift = random(-3, 4);       // -3 to +3 mmHg
    int diaDrift = random(-2, 3);       // -2 to +2 mmHg
    int hrDrift = random(-4, 5);        // -4 to +4 BPM
    float spo2Drift = ((float)random(-3, 4)) / 10.0; // -0.3 to +0.3 %
    float tempDrift = ((float)random(-1, 2)) / 10.0; // -0.1 to +0.1 °C
    float gluDrift = ((float)random(-2, 3));         // -2 to +2 mg/dL

    // Bound values within realistic ranges
    int systolic = constrain(baseSystolic + sysDrift, 95, 150);
    int diastolic = constrain(baseDiastolic + diaDrift, 60, 95);
    int heartRate = constrain(baseHeartRate + hrDrift, 58, 115);
    float spo2 = constrain(baseSpO2 + spo2Drift, 93.0, 99.8);
    float temp = constrain(baseTemp + tempDrift, 36.2, 37.5);
    float glucose = constrain(baseGlucose + gluDrift, 85.0, 135.0);

    // Build JSON payload matching frontend bluetoothService expectations
    char jsonBuffer[256];
    snprintf(jsonBuffer, sizeof(jsonBuffer),
             "{\"systolic_bp\":%d,\"diastolic_bp\":%d,\"heart_rate\":%d,\"spo2\":%.1f,\"temperature\":%.1f,\"blood_glucose\":%.1f}",
             systolic, diastolic, heartRate, spo2, temp, glucose);

    // Send payload over BLE Notify
    pTxCharacteristic->setValue((uint8_t*)jsonBuffer, strlen(jsonBuffer));
    pTxCharacteristic->notify();

    Serial.print("[BLE SENT] ");
    Serial.println(jsonBuffer);
  }

  // Handle reconnect advertising when client disconnects
  if (!deviceConnected && oldDeviceConnected) {
    delay(500); // give the bluetooth stack the chance to get things ready
    pServer->startAdvertising(); // restart advertising
    Serial.println("[BLE] Restarting advertising...");
    oldDeviceConnected = deviceConnected;
  }

  // Connecting transition
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }

  delay(20);
}
