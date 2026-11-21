#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>
#include <BLEClient.h>
#include <BLEServer.h>
#include <BLE2902.h>

// Shared Service & Characteristic UUID for Slaves and Phone Communication
#define SERVICE_UUID "12345678-1234-1234-1234-1234567890AB"
#define CHAR_UUID    "ABCD1234-1234-1234-1234-1234567890AB"

// Device Name for Phone Web Bluetooth discovery
#define MASTER_DEVICE_NAME "HEALTH_MASTER"

// -------------------------------------------------------------
// BLE Scanner & Client pointers (Master connecting to Slaves)
// -------------------------------------------------------------
BLEScan *pBLEScan = nullptr;

BLEClient *hrClient = nullptr;
BLEClient *tempClient = nullptr;
BLEClient *heightClient = nullptr;

BLERemoteCharacteristic *hrChar = nullptr;
BLERemoteCharacteristic *tempChar = nullptr;
BLERemoteCharacteristic *heightChar = nullptr;

// -------------------------------------------------------------
// BLE Server pointers (Master advertising to Phone)
// -------------------------------------------------------------
BLEServer *pServer = nullptr;
BLECharacteristic *pPhoneCharacteristic = nullptr;
bool phoneConnected = false;
bool oldPhoneConnected = false;

// Server connection callbacks
class MasterServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    phoneConnected = true;
    Serial.println("[BLE SERVER] Phone connected via Bluetooth!");
  }

  void onDisconnect(BLEServer* pServer) override {
    phoneConnected = false;
    Serial.println("[BLE SERVER] Phone disconnected.");
  }
};

// -------------------------------------------------------------
// Connect to a particular slave
// -------------------------------------------------------------
bool connectSlave(
  const char *deviceName,
  BLEClient *&client,
  BLERemoteCharacteristic *&characteristic
) {
  if (client != nullptr && client->isConnected()) {
    return true;
  }

  Serial.print("Searching for ");
  Serial.println(deviceName);

  // Scan for 2 seconds (non-blocking for too long)
  BLEScanResults *results = pBLEScan->start(2, false);
  bool connected = false;

  for (int i = 0; i < results->getCount(); i++) {
    BLEAdvertisedDevice device = results->getDevice(i);

    if (device.haveName() && device.getName() == String(deviceName)) {
      Serial.print("Found: ");
      Serial.println(deviceName);

      if (client == nullptr) {
        client = BLEDevice::createClient();
      }

      if (client->connect(&device)) {
        BLERemoteService *service = client->getService(BLEUUID(SERVICE_UUID));

        if (service != nullptr) {
          characteristic = service->getCharacteristic(BLEUUID(CHAR_UUID));

          if (characteristic != nullptr) {
            Serial.print("Connected: ");
            Serial.println(deviceName);
            connected = true;
          }
        }

        if (!connected) {
          client->disconnect();
          Serial.println("BLE service/characteristic missing");
        }
      }
      break;
    }
  }

  pBLEScan->clearResults();

  if (!connected) {
    Serial.print("Connection failed: ");
    Serial.println(deviceName);
  }

  return connected;
}

// Read sensor value from slave
String readData(
  BLEClient *client,
  BLERemoteCharacteristic *characteristic
) {
  if (client == nullptr || !client->isConnected() || characteristic == nullptr) {
    return "Disconnected";
  }

  String value = characteristic->readValue();
  return value;
}

// -------------------------------------------------------------
// Helper: Parse numerical values from slave strings
// Handles "74,98", "HR: 74, SpO2: 98%", "36.6 C", "168 cm", etc.
// -------------------------------------------------------------
void parseHeartAndSpO2(const String& raw, int& hr, float& spo2) {
  hr = 0;
  spo2 = 0.0;
  if (raw == "Disconnected" || raw.length() == 0) return;

  // Check if comma or space separated: "74,98"
  int commaIdx = raw.indexOf(',');
  if (commaIdx > 0) {
    hr = raw.substring(0, commaIdx).toInt();
    spo2 = raw.substring(commaIdx + 1).toFloat();
    return;
  }

  // Scan digits
  int firstNum = -1;
  int secondNum = -1;
  String current = "";
  for (unsigned int i = 0; i < raw.length(); i++) {
    char c = raw[i];
    if (isDigit(c) || c == '.') {
      current += c;
    } else if (current.length() > 0) {
      if (firstNum == -1) firstNum = current.toInt();
      else if (secondNum == -1) secondNum = current.toFloat();
      current = "";
    }
  }
  if (current.length() > 0) {
    if (firstNum == -1) firstNum = current.toInt();
    else if (secondNum == -1) secondNum = current.toFloat();
  }

  if (firstNum > 0) hr = firstNum;
  if (secondNum > 0) spo2 = secondNum;
  // If only one number found and it's 50-130, assume heart rate
  if (hr > 0 && spo2 == 0.0 && hr <= 100 && hr >= 88) {
    // If number looks like SpO2 (e.g. 98)
    spo2 = (float)hr;
    hr = 0;
  }
}

float parseSingleFloat(const String& raw) {
  if (raw == "Disconnected" || raw.length() == 0) return 0.0;
  String numStr = "";
  for (unsigned int i = 0; i < raw.length(); i++) {
    char c = raw[i];
    if (isDigit(c) || c == '.') {
      numStr += c;
    } else if (numStr.length() > 0) {
      break;
    }
  }
  return numStr.toFloat();
}

// -------------------------------------------------------------
// Setup
// -------------------------------------------------------------
void setup() {
  Serial.begin(115200);

  Serial.println();
  Serial.println("================================================");
  Serial.println(" HEALTH MONITORING MASTER + PHONE BLE SERVER");
  Serial.println("================================================");

  // 1. Initialize BLE Controller in Dual Mode (Client + Server)
  BLEDevice::init(MASTER_DEVICE_NAME);

  // 2. Set up BLE Scanner to find Slaves
  pBLEScan = BLEDevice::getScan();
  pBLEScan->setActiveScan(true);
  pBLEScan->setInterval(100);
  pBLEScan->setWindow(99);

  // 3. Set up BLE Server for the Phone to connect and poll
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MasterServerCallbacks());

  BLEService *pMasterService = pServer->createService(SERVICE_UUID);
  pPhoneCharacteristic = pMasterService->createCharacteristic(
                           CHAR_UUID,
                           BLECharacteristic::PROPERTY_READ |
                           BLECharacteristic::PROPERTY_NOTIFY |
                           BLECharacteristic::PROPERTY_INDICATE
                         );

  // Add 2902 descriptor for enabling phone notifications
  pPhoneCharacteristic->addDescriptor(new BLE2902());
  pPhoneCharacteristic->setValue("{\"status\":\"initializing\"}");
  pMasterService->start();

  // 4. Start Advertising to allow Phone connection
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06); // iPhone connection optimization
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("[BLE] Master Bluetooth initialized.");
  Serial.println("[BLE] Advertising as: " MASTER_DEVICE_NAME);
  Serial.println("[BLE] Phone can scan and poll via Service: " SERVICE_UUID);

  // 5. Connect initial slave nodes
  connectSlave("HR_SLAVE", hrClient, hrChar);
  delay(300);

  connectSlave("TEMP_SLAVE", tempClient, tempChar);
  delay(300);

  connectSlave("HEIGHT_SLAVE", heightClient, heightChar);
  delay(300);

  Serial.println();
  Serial.println("Initial connection process finished. Starting loop...");
}

// -------------------------------------------------------------
// Main Loop: Polls Slaves, Updates Characteristic for Phone
// -------------------------------------------------------------
void loop() {
  // 1. Reconnect if any slave disconnected
  if (hrClient == nullptr || !hrClient->isConnected()) {
    connectSlave("HR_SLAVE", hrClient, hrChar);
  }

  if (tempClient == nullptr || !tempClient->isConnected()) {
    connectSlave("TEMP_SLAVE", tempClient, tempChar);
  }

  if (heightClient == nullptr || !heightClient->isConnected()) {
    connectSlave("HEIGHT_SLAVE", heightClient, heightChar);
  }

  // 2. Read sensor values from all three slaves
  String rawHeartRate = readData(hrClient, hrChar);
  String rawTemperature = readData(tempClient, tempChar);
  String rawHeight = readData(heightClient, heightChar);

  // 3. Parse numbers for JSON payload
  int hrVal = 0;
  float spo2Val = 0.0;
  parseHeartAndSpO2(rawHeartRate, hrVal, spo2Val);

  float tempVal = parseSingleFloat(rawTemperature);
  float heightVal = parseSingleFloat(rawHeight);

  // 4. Construct JSON payload for Phone Web Bluetooth
  // Phone polls this exact characteristic or receives notifications
  String jsonPayload = "{";
  jsonPayload += "\"device_id\":\"" MASTER_DEVICE_NAME "\",";
  jsonPayload += "\"heart_rate\":" + String(hrVal) + ",";
  jsonPayload += "\"spo2\":" + String(spo2Val, 1) + ",";
  jsonPayload += "\"temperature\":" + String(tempVal, 1) + ",";
  jsonPayload += "\"height_cm\":" + String(heightVal, 1) + ",";
  jsonPayload += "\"raw_hr\":\"" + rawHeartRate + "\",";
  jsonPayload += "\"raw_temp\":\"" + rawTemperature + "\",";
  jsonPayload += "\"raw_height\":\"" + rawHeight + "\"";
  jsonPayload += "}";

  // 5. Update Characteristic Value so Phone gets it when polling (readValue)
  if (pPhoneCharacteristic != nullptr) {
    pPhoneCharacteristic->setValue(jsonPayload.c_str());
    if (phoneConnected) {
      pPhoneCharacteristic->notify();
    }
  }

  // 6. Handle reconnect advertising if phone disconnected
  if (!phoneConnected && oldPhoneConnected) {
    delay(300);
    pServer->startAdvertising();
    Serial.println("[BLE SERVER] Restarted advertising for phone...");
    oldPhoneConnected = phoneConnected;
  }
  if (phoneConnected && !oldPhoneConnected) {
    oldPhoneConnected = phoneConnected;
  }

  // 7. Serial Debug Output
  Serial.println();
  Serial.println("================================");
  Serial.println("       HEALTH MONITORING        ");
  Serial.println("================================");
  Serial.print("Heart Rate & SpO2 : ");
  Serial.println(rawHeartRate);
  Serial.print("Temperature       : ");
  Serial.println(rawTemperature);
  Serial.print("Height            : ");
  Serial.println(rawHeight);
  Serial.print("Phone Payload     : ");
  Serial.println(jsonPayload);
  Serial.println("================================");

  delay(1000);
}
