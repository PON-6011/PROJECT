/*
 * ======================================================================================
 * Project: IoT Medication Reminder Box System Firmware
 * Microcontroller: ESP32 (ESP-WROOM-32)
 * Department of Computer Engineering, Princess of Naradhiwas University (2569)
 * 
 * Hardware Pinout Mapping:
 * - GPIO14: Active Buzzer (Reminder Sound)
 * - GPIO15: Yellow LED (Before Meal Indicator)
 * - GPIO32: Green LED (After Meal Indicator)
 * - GPIO25: Red LED (Alert status, stays on until bottle removal)
 * - GPIO27: Reed Switch Sensor (Detect Bottle Removal)
 * - GPIO19: Push Button Switch (Stop Buzzer Sound)
 * - GPIO21: OLED I2C SDA
 * - GPIO22: OLED I2C SCL
 * - GPIO34: ADC Battery Voltage Measurement
 * ======================================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Preferences.h>
#include <time.h>

// --------------------------------------------------------------------------------------
// Configuration & Credentials
// --------------------------------------------------------------------------------------
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL    = "http://192.168.1.100:3000"; // Replace with Node.js Server IP

// If you want to set the box code manually, put it here.
// Leave empty to generate from ESP32 MAC address automatically.
const char* CUSTOM_DEVICE_CODE = "BOX-ABC111"; // e.g. "BOX-ABC123"

String DEVICE_CODE = ""; // Initialized at runtime

// Pin Definitions
#define PIN_BUZZER        14
#define PIN_LED_YELLOW    15 // Before Meal
#define PIN_LED_GREEN     32 // After Meal
#define PIN_LED_RED       25 // Red alert LED (on until bottle removal)
#define PIN_REED_SWITCH   27 // Magnet sensor
#define PIN_PUSH_BUTTON   19 // Silence button
#define PIN_BATTERY_ADC   34 // Voltage divider ADC

// OLED Display Configuration
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// Persistent Flash Storage for Offline Schedule Preservation
Preferences preferences;

// --------------------------------------------------------------------------------------
// Global State Variables
// --------------------------------------------------------------------------------------
struct ScheduleItem {
  int schedule_id;
  int hour;
  int minute;
  char meal_timing[20]; // "before_meal" or "after_meal"
  int repeat_count;
  int repeat_interval_min;
  bool triggered_today;
};

ScheduleItem localSchedules[4];
int scheduleCount = 0;
int64_t currentScheduleVersion = 0;

int currentBatteryLevel = 85;
bool isAlertActive = false;
bool isAlertVisualActive = false;
bool isBuzzerMuted = false;
int alertRepeatRounds = 0;
unsigned long lastRepeatTimestamp = 0;
unsigned long lastHeartbeatTimestamp = 0;
int activeScheduleIndex = -1;
unsigned long lastHistoryLogMillis = 0;
int lastHistoryScheduleId = -1;
char lastHistoryStatus[32] = "";
int lastHistoryLogDayOfYear = -1;
int lastHistoryLogMinuteOfDay = -1;
int lastReedState = LOW;
unsigned long lastReedEventMillis = 0;
int lastScheduleResetDayOfYear = -1;

// NTP Time Client Settings
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 7 * 3600; // GMT+7 Bangkok/Thailand
const int   daylightOffset_sec = 0;

// --------------------------------------------------------------------------------------
// Function Declarations
// --------------------------------------------------------------------------------------
void setupHardwarePins();
void initOLED();
void updateOLEDDisplay(int batteryPercent);
int readBatteryPercentage();
void connectWiFi();
void syncTimeNTP();
void pollScheduleFromServer();
void sendHeartbeat();
void checkScheduledReminders();
bool isBeforeMealTiming(const char* timing);
void triggerAlert(int scheduleIdx);
void stopAlert();
void uploadIntakeLog(const char* status, int scheduleId);
void checkSensors();

// --------------------------------------------------------------------------------------
// Arduino Setup Function
// --------------------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  Serial.println("\n[System Startup] IoT Medication Box Initializing...");

  setupHardwarePins();
  initOLED();
  // Allow long-press on push button at boot to unbind device (clear stored device_code)
  // Hold the push button (GPIO19) for 5 seconds during boot to clear pairing
  auto checkFactoryResetButton = []() {
    if (digitalRead(PIN_PUSH_BUTTON) == LOW) {
      unsigned long pressedAt = millis();
      while (digitalRead(PIN_PUSH_BUTTON) == LOW) {
        if (millis() - pressedAt > 5000) {
          preferences.begin("medbox", false);
          preferences.remove("device_code");
          preferences.end();
          Serial.println("[FactoryReset] device_code cleared from preferences. Rebooting...");
          display.clearDisplay();
          display.setTextSize(1);
          display.setCursor(0, 0);
          display.println("Device unbound\nRebooting...");
          display.display();
          delay(1000);
          ESP.restart();
        }
        delay(100);
      }
    }
  };

  checkFactoryResetButton();
  initDeviceCode();
  
  // Read battery percentage and render on OLED immediately
  currentBatteryLevel = readBatteryPercentage();
  updateOLEDDisplay(currentBatteryLevel);

  // Initialize WiFi & Sync
  connectWiFi();
  syncTimeNTP();

  // Polling initial schedule
  pollScheduleFromServer();
}

// Initialize or generate unique device code and persist it
void initDeviceCode() {
  preferences.begin("medbox", false);
  String stored = preferences.getString("device_code", "");

  if (strlen(CUSTOM_DEVICE_CODE) > 0) {
    DEVICE_CODE = String(CUSTOM_DEVICE_CODE);
    if (stored != DEVICE_CODE) {
      preferences.putString("device_code", DEVICE_CODE);
    }
  } else if (stored.length() > 0) {
    DEVICE_CODE = stored;
  } else {
    uint64_t mac = ESP.getEfuseMac();
    uint32_t shortmac = (uint32_t)(mac & 0xFFFFFF);
    char buf[16];
    sprintf(buf, "%06X", shortmac);
    DEVICE_CODE = "BOX-" + String(buf);
    preferences.putString("device_code", DEVICE_CODE);
  }

  Serial.printf("[Device] Device code: %s\n", DEVICE_CODE.c_str());
  // Show on OLED briefly
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.printf("Device:\n%s", DEVICE_CODE.c_str());
  display.display();
  delay(2000);
  // Restore battery display
  updateOLEDDisplay(currentBatteryLevel);
}

// --------------------------------------------------------------------------------------
// Main Hardware Event Loop
// --------------------------------------------------------------------------------------
void loop() {
  unsigned long now = millis();

  // 1. Maintain WiFi Reconnection (Seamless Offline / Online Recovery)
  static unsigned long lastWiFiRetry = 0;
  static bool wifiPreviouslyConnected = false;
  if (WiFi.status() != WL_CONNECTED) {
    if (wifiPreviouslyConnected) {
      // lost connection
      wifiPreviouslyConnected = false;
      Serial.println("[WiFi] Disconnected");
    }
    if (now - lastWiFiRetry > 10000) {
      lastWiFiRetry = now;
      WiFi.reconnect();
    }
  } else {
    if (!wifiPreviouslyConnected) {
      // newly connected
      wifiPreviouslyConnected = true;
      Serial.println("[WiFi] Connected (detected in loop). Sending immediate heartbeat and polling schedule.");
      currentBatteryLevel = readBatteryPercentage();
      updateOLEDDisplay(currentBatteryLevel);
      sendHeartbeat();
      pollScheduleFromServer();
    }
  }

  // 2. Telemetry Heartbeat & Polling every 30 seconds
  if (now - lastHeartbeatTimestamp > 30000) {
    lastHeartbeatTimestamp = now;
    currentBatteryLevel = readBatteryPercentage();
    updateOLEDDisplay(currentBatteryLevel);

    if (WiFi.status() == WL_CONNECTED) {
      sendHeartbeat();
      pollScheduleFromServer();
    }
  }

  // 3. Time Check & Local Schedule Execution
  checkScheduledReminders();

  // 4. Sensor Reading (Button & Reed Switch)
  checkSensors();

  // 5. Handle Alert Repetition logic using per-schedule repeat settings
  if (isAlertActive && activeScheduleIndex >= 0) {
    // Determine interval and max rounds from active schedule (fallbacks)
    int repeatIntervalMin = localSchedules[activeScheduleIndex].repeat_interval_min > 0 ? localSchedules[activeScheduleIndex].repeat_interval_min : 5;
    int maxRounds = localSchedules[activeScheduleIndex].repeat_count > 0 ? localSchedules[activeScheduleIndex].repeat_count : 3;
    unsigned long intervalMs = (unsigned long)repeatIntervalMin * 60UL * 1000UL;

    if (now - lastRepeatTimestamp > intervalMs) {
      if (alertRepeatRounds < maxRounds) {
        alertRepeatRounds++;
        // Sound the buzzer again regardless of mute state
        isBuzzerMuted = false;
        digitalWrite(PIN_BUZZER, HIGH);
        lastRepeatTimestamp = now;
        Serial.printf("[Reminder Repeat] Repeat round %d triggered (interval %d min)!\n", alertRepeatRounds, repeatIntervalMin);
      } else {
        // Exceeded allowed repeats -> mark as Missed, but keep the alert LED until bottle removal.
        isAlertActive = false;
        isBuzzerMuted = true;
        isAlertVisualActive = true;
        digitalWrite(PIN_BUZZER, LOW);
        uploadIntakeLog("Missed", activeScheduleIndex >= 0 ? localSchedules[activeScheduleIndex].schedule_id : 0);
        Serial.println("[Reminder] Max repeats exceeded -> Marked as Missed. Alert LED remains until bottle removal.");
      }
    }
  }

  delay(10);
}

// --------------------------------------------------------------------------------------
// Hardware Setup
// --------------------------------------------------------------------------------------
void setupHardwarePins() {
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);

  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_LED_YELLOW, LOW);
  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_RED, LOW);

  pinMode(PIN_REED_SWITCH, INPUT_PULLUP);
  pinMode(PIN_PUSH_BUTTON, INPUT_PULLUP);
  pinMode(PIN_BATTERY_ADC, INPUT);
  analogSetPinAttenuation(PIN_BATTERY_ADC, ADC_11db);

  lastReedState = digitalRead(PIN_REED_SWITCH);
}

void initOLED() {
  Wire.begin(21, 22);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("[OLED Error] SSD1306 allocation failed"));
  } else {
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.display();
  }
}

/**
 * Display Requirement according to SRS: OLED displays ONLY Battery Percentage!
 */
void updateOLEDDisplay(int batteryPercent) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.printf("%s", DEVICE_CODE.c_str());
  display.setCursor(0, 16);
  display.setTextSize(2);
  display.printf("Battery %d%%", batteryPercent);
  display.display();
}

int readBatteryPercentage() {
  const float BATTERY_MIN_V = 3.0f;
  const float BATTERY_MAX_V = 4.2f;
  const float DIVIDER_RATIO = 2.0f;
  const int SAMPLE_COUNT = 20;

  uint32_t sum = 0;
  for (int i = 0; i < SAMPLE_COUNT; i++) {
    sum += analogRead(PIN_BATTERY_ADC);
    delay(5);
  }

  float averageRaw = sum / (float)SAMPLE_COUNT;
  float adcVoltage = (averageRaw / 4095.0f) * 3.3f;
  float batteryVoltage = adcVoltage * DIVIDER_RATIO;

  int percent = (int)(((batteryVoltage - BATTERY_MIN_V) / (BATTERY_MAX_V - BATTERY_MIN_V)) * 100.0f);
  percent = constrain(percent, 0, 100);

  Serial.printf("[Battery] rawADC=%.1f adcVolt=%.2fV batteryVolt=%.2fV percent=%d%%\n",
                averageRaw, adcVoltage, batteryVoltage, percent);

  return percent;
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WiFi] Connecting");
  int timeout = 0;
  while (WiFi.status() != WL_CONNECTED && timeout < 20) {
    delay(500);
    Serial.print(".");
    timeout++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n[WiFi] Offline Mode - Continuing with cached local schedule.");
  }
}

void syncTimeNTP() {
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
}

// --------------------------------------------------------------------------------------
// REST API Server Communication
// --------------------------------------------------------------------------------------
void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  String url = String(SERVER_URL) + "/api/esp32/heartbeat";

  // Debug: URL and host resolution
  Serial.println("[Heartbeat] POST URL: " + url);
  auto getHostFromUrl = [](const String &u)->String{
    String h = u;
    if (h.startsWith("http://")) h = h.substring(7);
    else if (h.startsWith("https://")) h = h.substring(8);
    int s = h.indexOf('/'); if (s>=0) h = h.substring(0,s);
    int c = h.indexOf(':'); if (c>=0) h = h.substring(0,c);
    return h;
  };
  auto getPortFromUrl = [](const String &u)->uint16_t{
    String h = u;
    int p = 80;
    if (h.startsWith("https://")) p = 443;
    int idx = h.indexOf("://");
    if (idx>=0) h = h.substring(idx+3);
    int slash = h.indexOf('/'); if (slash>=0) h = h.substring(0, slash);
    int colon = h.indexOf(':'); if (colon>=0) p = h.substring(colon+1).toInt();
    return p;
  };
  String host = getHostFromUrl(url);
  uint16_t port = getPortFromUrl(url);
  IPAddress serverIp;
  if (WiFi.hostByName(host.c_str(), serverIp)) {
    Serial.println("[Heartbeat] Resolved host '" + host + "' -> " + serverIp.toString());
  } else {
    Serial.println("[Heartbeat] DNS lookup failed for host: " + host);
  }

  // TCP connect test
  WiFiClient testClient;
  Serial.printf("[Heartbeat] Testing TCP connect to %s:%u\n", host.c_str(), port);
  if (!testClient.connect(host.c_str(), port)) {
    Serial.println("[Heartbeat] TCP connect failed (network/server unreachable)");
  } else {
    Serial.println("[Heartbeat] TCP connect OK");
    testClient.stop();
  }

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-code", DEVICE_CODE);

  StaticJsonDocument<200> doc;
  doc["device_code"] = DEVICE_CODE;
  doc["battery_level"] = currentBatteryLevel;
  doc["firmware_version"] = "v1.0.0";

  String jsonBody;
  serializeJson(doc, jsonBody);

  int httpCode = http.POST(jsonBody);
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    Serial.println("[Heartbeat] Response length: " + String(payload.length()));
    DynamicJsonDocument resp(512);
    DeserializationError err = deserializeJson(resp, payload);
    if (!err) {
      // If server returns schedule_version, react to it
      int64_t srvVer = resp["schedule_version"] | 0LL;
      Serial.printf("[Heartbeat] Parsed schedule_version=%lld\n", srvVer);
      if (srvVer != 0 && srvVer != currentScheduleVersion) {
        Serial.printf("[Heartbeat] Server schedule_version=%lld differs from local=%lld. Polling schedule...\n", srvVer, currentScheduleVersion);
        pollScheduleFromServer();
      }
      // Optionally sync server time if provided
      const char* srvTime = resp["server_time"] | nullptr;
      if (srvTime) {
        // Not setting system time here, but could be used for diagnostics
        Serial.printf("[Heartbeat] server_time: %s\n", srvTime);
      }
    } else {
      Serial.println("[Heartbeat] Failed to parse heartbeat response JSON");
    }
  } else {
    Serial.printf("[Heartbeat] HTTP error: %d\n", httpCode);
    if (httpCode < 0) Serial.println("[Heartbeat] Connection error (negative HTTP code). Check server reachability and firewall.");
  }
  http.end();
}

void pollScheduleFromServer() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(SERVER_URL) + "/api/esp32/schedule?device_code=" + String(DEVICE_CODE);
  Serial.println("[Schedule] GET URL: " + url);
  // resolve host for debug
  String host = url;
  if (host.startsWith("http://")) host = host.substring(7);
  else if (host.startsWith("https://")) host = host.substring(8);
  int s = host.indexOf('/'); if (s>=0) host = host.substring(0,s);
  int c = host.indexOf(':'); if (c>=0) host = host.substring(0,c);
  IPAddress serverIp;
  if (WiFi.hostByName(host.c_str(), serverIp)) Serial.println("[Schedule] Resolved " + host + " -> " + serverIp.toString());
  else Serial.println("[Schedule] DNS lookup failed for " + host);
  http.begin(url);

  int httpCode = http.GET();
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    DynamicJsonDocument doc(2048);
    DeserializationError err = deserializeJson(doc, payload);

    if (!err) {
      int64_t newVersion = doc["schedule_version"] | 0LL;
      if (newVersion != currentScheduleVersion) {
        currentScheduleVersion = newVersion;
        scheduleCount = 0;

        JsonArray arr = doc["schedules"].as<JsonArray>();
        for (JsonObject s : arr) {
          if (scheduleCount < 4) {
            localSchedules[scheduleCount].schedule_id = s["schedule_id"];
            const char* timeStr = s["time"]; // "08:00:00"
            sscanf(timeStr, "%d:%d", &localSchedules[scheduleCount].hour, &localSchedules[scheduleCount].minute);
            const char* rawMealTiming = s["meal_timing"] | "before_meal";
            if (isBeforeMealTiming(rawMealTiming)) {
              strncpy(localSchedules[scheduleCount].meal_timing, "before_meal", 20);
            } else {
              strncpy(localSchedules[scheduleCount].meal_timing, "after_meal", 20);
            }
            localSchedules[scheduleCount].meal_timing[19] = '\0';
            localSchedules[scheduleCount].repeat_count = s["repeat_count"] | 3;
            localSchedules[scheduleCount].repeat_interval_min = s["repeat_interval_min"] | 5;
            localSchedules[scheduleCount].triggered_today = false;
            scheduleCount++;
          }
        }
        Serial.printf("[Schedule] Synchronized %d schedule items.\n", scheduleCount);
      } else {
        Serial.printf("[Schedule] schedule_version unchanged (%lld).\n", newVersion);
      }
    } else {
      Serial.println("[Schedule] Failed to parse schedule response JSON");
      Serial.println("[Schedule] Payload:");
      Serial.println(payload);
    }
  } else {
    Serial.printf("[Schedule] HTTP GET failed with code %d\n", httpCode);
    if (httpCode < 0) {
      Serial.println("[Schedule] Connection error (negative HTTP code). Check server reachability and firewall.");
    }
  }
  http.end();
}

void uploadIntakeLog(const char* status, int scheduleId) {
  struct tm timeinfo;
  bool hasTime = getLocalTime(&timeinfo);
  int minuteOfDay = -1;
  int dayOfYear = -1;
  if (hasTime) {
    minuteOfDay = timeinfo.tm_hour * 60 + timeinfo.tm_min;
    dayOfYear = timeinfo.tm_yday;
  }

  bool duplicateWithinMinute = false;
  if (hasTime) {
    duplicateWithinMinute = (dayOfYear == lastHistoryLogDayOfYear && minuteOfDay == lastHistoryLogMinuteOfDay);
  } else if (lastHistoryLogMillis > 0 && millis() - lastHistoryLogMillis < 60000) {
    duplicateWithinMinute = true;
  }

  if (duplicateWithinMinute) {
    Serial.println("[History] Skipping duplicate intake log within the same minute.");
    return;
  }

  lastHistoryLogMillis = millis();
  lastHistoryScheduleId = scheduleId;
  strncpy(lastHistoryStatus, status, sizeof(lastHistoryStatus) - 1);
  lastHistoryStatus[sizeof(lastHistoryStatus) - 1] = '\0';
  lastHistoryLogMinuteOfDay = minuteOfDay;
  lastHistoryLogDayOfYear = dayOfYear;

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Offline Log] Action recorded locally. Will sync when Wi-Fi reconnects.");
    return;
  }

  HTTPClient http;
  String url = String(SERVER_URL) + "/api/esp32/intake";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-code", DEVICE_CODE);

  StaticJsonDocument<200> doc;
  doc["device_code"] = DEVICE_CODE;
  doc["schedule_id"] = scheduleId;
  doc["status"] = status; // "Taken" or "Taken Early" or "Missed"

  String jsonBody;
  serializeJson(doc, jsonBody);

  int httpCode = http.POST(jsonBody);
  if (httpCode == HTTP_CODE_OK) {
    Serial.println("[History] Intake log sent successfully.");
  } else {
    Serial.printf("[History] Failed to upload intake log, HTTP code %d\n", httpCode);
  }

  http.end();
}

bool isBeforeMealTiming(const char* timing) {
  if (timing == nullptr) return false;
  char normalized[32];
  strncpy(normalized, timing, sizeof(normalized) - 1);
  normalized[sizeof(normalized) - 1] = '\0';

  // Trim leading/trailing whitespace
  int start = 0;
  while (normalized[start] && isspace((unsigned char)normalized[start])) start++;
  int end = strlen(normalized) - 1;
  while (end >= start && isspace((unsigned char)normalized[end])) {
    normalized[end] = '\0';
    end--;
  }

  for (char* p = normalized + start; *p; p++) {
    *p = tolower((unsigned char)*p);
  }

  const char* value = normalized + start;
  if (strcmp(value, "before_meal") == 0 || strcmp(value, "before") == 0 || strcmp(value, "beforemeal") == 0 || strcmp(value, "ก่อนอาหาร") == 0 || strstr(value, "before") != nullptr) {
    return true;
  }
  return false;
}

// --------------------------------------------------------------------------------------
// Alarm Logic & Hardware Sensors
// --------------------------------------------------------------------------------------
void checkScheduledReminders() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("[Time] Failed to get local time from NTP/system RTC.");
    return;
  }

  if (scheduleCount == 0) {
    Serial.println("[Schedule] No schedules loaded yet. Waiting for sync from server.");
  }

  // Reset daily trigger state once when the day changes.
  int currentDay = timeinfo.tm_yday;
  if (lastScheduleResetDayOfYear != currentDay) {
    for (int i = 0; i < scheduleCount; i++) {
      localSchedules[i].triggered_today = false;
    }
    lastScheduleResetDayOfYear = currentDay;
    Serial.printf("[Schedule] Daily trigger state reset for day %d.\n", currentDay);
  }

  // Compare RTC time with schedule times
  for (int i = 0; i < scheduleCount; i++) {
    if (!localSchedules[i].triggered_today) {
      if (timeinfo.tm_hour == localSchedules[i].hour && timeinfo.tm_min == localSchedules[i].minute) {
        Serial.printf("[Schedule] Time matched schedule %d at %02d:%02d\n", localSchedules[i].schedule_id, timeinfo.tm_hour, timeinfo.tm_min);
        localSchedules[i].triggered_today = true;
        triggerAlert(i);
        break;
      }
    }
  }
}

void triggerAlert(int scheduleIdx) {
  isAlertActive = true;
  isAlertVisualActive = true;
  isBuzzerMuted = false;
  alertRepeatRounds = 0;
  activeScheduleIndex = scheduleIdx;
  lastRepeatTimestamp = millis();

  // Play Active Buzzer (GPIO14)
  digitalWrite(PIN_BUZZER, HIGH);

  // Turn ON Red alert LED (GPIO25) and keep it ON until bottle removal.
  digitalWrite(PIN_LED_RED, HIGH);

  // Meal Timing LED Logic according to SRS:
  // Before Meal -> Yellow LED (GPIO15)
  // After Meal  -> Green LED (GPIO32)
  if (isBeforeMealTiming(localSchedules[scheduleIdx].meal_timing)) {
    digitalWrite(PIN_LED_YELLOW, HIGH);
    digitalWrite(PIN_LED_GREEN, LOW);
  } else {
    digitalWrite(PIN_LED_YELLOW, LOW);
    digitalWrite(PIN_LED_GREEN, HIGH);
  }

  Serial.println("[ALERT TRIGGERED] Visual and Audio alarm started!");
}

void stopAlert() {
  isAlertActive = false;
  isAlertVisualActive = false;
  isBuzzerMuted = false;
  activeScheduleIndex = -1;
  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_LED_RED, LOW);
  digitalWrite(PIN_LED_YELLOW, LOW);
  digitalWrite(PIN_LED_GREEN, LOW);
}

void checkSensors() {
  // Push Button (GPIO19) - Mute Buzzer
  if (digitalRead(PIN_PUSH_BUTTON) == LOW) {
    delay(50); // Debounce
    if (digitalRead(PIN_PUSH_BUTTON) == LOW) {
      if (isAlertActive && !isBuzzerMuted) {
        isBuzzerMuted = true;
        digitalWrite(PIN_BUZZER, LOW); // Stop buzzer sound, LEDs remain ON!
        Serial.println("[Button Pressed] Buzzer muted. LEDs remain ON waiting for bottle removal.");
      }
    }
  }

  // Reed Switch (GPIO27) - Bottle Removal Detection
  int reedState = digitalRead(PIN_REED_SWITCH);
  if (reedState == HIGH && lastReedState == LOW && millis() - lastReedEventMillis > 1000) {
    lastReedEventMillis = millis();
    if (isAlertActive) {
      // Scheduled intake completed
      int currentScheduleId = activeScheduleIndex >= 0 ? localSchedules[activeScheduleIndex].schedule_id : 0;
      stopAlert();
      uploadIntakeLog("Taken", currentScheduleId);
      Serial.println("[Reed Switch] Bottle removed during alarm -> Status: Taken");
    } else if (isAlertVisualActive) {
      // Alert LED remains on after buzzer has stopped (e.g. missed reminder). Clear it now.
      stopAlert();
      Serial.println("[Reed Switch] Bottle removed after alert -> Clearing visual alert.");
    } else {
      struct tm timeinfo;
      bool hasTime = getLocalTime(&timeinfo);
      int currentMinutes = hasTime ? (timeinfo.tm_hour * 60 + timeinfo.tm_min) : -1;
      int selectedIdx = -1;
      bool takenEarly = false;

      if (hasTime && scheduleCount > 0) {
        int bestPastDiff = 1440;
        int bestFutureDiff = 1440;
        int bestPastIdx = -1;
        int bestFutureIdx = -1;

        for (int i = 0; i < scheduleCount; i++) {
          if (localSchedules[i].triggered_today) continue;
          int scheduleMinutes = localSchedules[i].hour * 60 + localSchedules[i].minute;
          if (scheduleMinutes <= currentMinutes) {
            int diff = currentMinutes - scheduleMinutes;
            if (diff < bestPastDiff) {
              bestPastDiff = diff;
              bestPastIdx = i;
            }
          } else {
            int diff = scheduleMinutes - currentMinutes;
            if (diff < bestFutureDiff) {
              bestFutureDiff = diff;
              bestFutureIdx = i;
            }
          }
        }

        if (bestPastIdx >= 0) {
          selectedIdx = bestPastIdx;
          takenEarly = false;
        } else if (bestFutureIdx >= 0) {
          selectedIdx = bestFutureIdx;
          takenEarly = true;
        }
      }

      if (selectedIdx >= 0) {
        localSchedules[selectedIdx].triggered_today = true;
        if (takenEarly) {
          uploadIntakeLog("Taken Early", localSchedules[selectedIdx].schedule_id);
          Serial.println("[Reed Switch] Bottle removed before schedule -> Status: Taken Early");
        } else {
          uploadIntakeLog("Taken", localSchedules[selectedIdx].schedule_id);
          Serial.println("[Reed Switch] Bottle removed at/after schedule -> Status: Taken");
        }
      } else {
        static unsigned long lastEarlyLog = 0;
        if (millis() - lastEarlyLog > 10000) { // Prevent spam
          lastEarlyLog = millis();
          uploadIntakeLog("Taken Early", 0);
          Serial.println("[Reed Switch] Bottle removed before schedule -> Status: Taken Early");
        }
      }
    }
  }
  lastReedState = reedState;
}
