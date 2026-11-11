/*
 * =====================================================================================
 *  PayPal Hackathon 2026 - IoT Smart Gate & Audio Controller
 *  Platform: ESP32 Dev Module
 *  UNIVERSAL BUZZER CODE (Active & Passive) + Robust Wi-Fi Auto-Reconnect & Debugging
 * =====================================================================================
 *  CIRCUIT WIRING:
 *  - Buzzer (+) Pin (Longer leg) ---> ESP32 D14 (GPIO 14)
 *  - Buzzer (-) Pin (Shorter leg) ---> ESP32 GND
 *  - Magnetic Gate Lock          ---> Built-in Blue LED (GPIO 2)
 * =====================================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>

// --- 1. Wi-Fi Configuration ---
// Make sure this matches your Phone Mobile Hotspot or Home Wi-Fi EXACTLY!
const char* WIFI_SSID     = "YOUR_WIFI_HOTSPOT_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// --- 2. Server IP Address (Your Laptop running server.js) ---
// Find your laptop IPv4 address by typing 'ipconfig' in command prompt (Current Wi-Fi IP: 192.168.1.7)
const char* SERVER_POLL_URL = "http://192.168.1.7:3000/api/esp32/poll";

// --- 3. Pin Definitions ---
#define BUZZER_PIN    14  // Buzzer connected to D14 (GPIO 14)
#define GATE_LOCK_LED 2   // Built-in Blue LED (Magnetic Solenoid Lock)

// Timing
unsigned long lastPollTime = 0;
const unsigned long POLL_INTERVAL_MS = 350; // Poll server every 350ms
unsigned long lastErrorPrint = 0;

void playTone(int freqHz, int durationMs);
void playPayPalVictoryChime();
void unlockGateSequence(int durationMs, int beepCount);

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n=======================================================");
  Serial.println("  PayPal IoT Smart Gate (Robust Auto-Reconnect Mode)   ");
  Serial.println("=======================================================");

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(GATE_LOCK_LED, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(GATE_LOCK_LED, LOW);

  // Test Beep right at power-on!
  Serial.println("[TEST] Testing buzzer on D14...");
  playTone(2000, 200);
  delay(100);
  playTone(2500, 200);

  // Connect to Wi-Fi
  connectToWiFi();
}

void connectToWiFi() {
  Serial.print("\n[WiFi] Connecting to SSID: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40) {
    digitalWrite(GATE_LOCK_LED, HIGH);
    delay(100);
    digitalWrite(GATE_LOCK_LED, LOW);
    delay(150);
    Serial.print(".");
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] CONNECTED SUCCESSFULLY!");
    Serial.print("[WiFi] ESP32 Assigned IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WiFi] Target Server URL: ");
    Serial.println(SERVER_POLL_URL);

    // Beep 2 high notes when Wi-Fi connects
    playTone(1500, 100);
    delay(60);
    playTone(2200, 150);
  } else {
    Serial.println("\n[WiFi ERROR] Failed to connect! Check SSID and Password.");
    Serial.println("[WiFi ERROR] Make sure ESP32 and Laptop are on the SAME network/hotspot!");
  }
}

void loop() {
  // If Wi-Fi lost, automatically reconnect
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastErrorPrint > 5000) {
      lastErrorPrint = millis();
      Serial.println("[WiFi] Lost connection! Reconnecting...");
      connectToWiFi();
    }
    return;
  }

  // Poll server every 350ms
  if (millis() - lastPollTime >= POLL_INTERVAL_MS) {
    lastPollTime = millis();
    pollServerForCommands();
  }
}

// --- Poll Server for Gate & Audio Triggers ---
void pollServerForCommands() {
  HTTPClient http;
  http.begin(SERVER_POLL_URL);
  http.setTimeout(1000);

  int httpCode = http.GET();

  if (httpCode == 200) {
    String payload = http.getString();

    // Check if server sent a hardware command
    if (payload.indexOf("\"hasCommand\":true") != -1) {
      Serial.println("\n>>> [COMMAND RECEIVED FROM SERVER!] <<<");

      // 1. Entry Gate Opened (Customer scanned QR)
      if (payload.indexOf("OPEN_ENTRY_GATE") != -1) {
        Serial.println(">>> Action: OPEN_ENTRY_GATE (Unlocking Gate + 2 Beeps)");
        unlockGateSequence(4000, 2);
      }
      // 2. Exit Gate Opened (PayPal Auto-Pay Approved)
      else if (payload.indexOf("OPEN_EXIT_GATE") != -1) {
        Serial.println(">>> Action: OPEN_EXIT_GATE (PayPal Victory Chime + Unlocking Gate)");
        playPayPalVictoryChime();
        unlockGateSequence(5000, 0);
      }
      // 3. Barcode Scanned
      else if (payload.indexOf("BEEP_SCAN") != -1) {
        Serial.println(">>> Action: BEEP_SCAN (Barcode Chirp)");
        playTone(2000, 100);
      }
      // 4. Error Alert
      else if (payload.indexOf("BEEP_ERROR") != -1) {
        Serial.println(">>> Action: BEEP_ERROR");
        playTone(400, 500);
      }
      // 5. Anti-Theft Shoplifting Alarm (Alternating Siren + Fast LED Strobe)
      else if (payload.indexOf("ALARM_THEFT") != -1) {
        Serial.println(">>> Action: ALARM_THEFT (EMERGENCY POLICE SIREN + GATE LOCKDOWN)");
        playAntiTheftAlarm(3500);
      }
    }
  } else {
    // Print connection issues to Serial Monitor once every 4 seconds
    if (millis() - lastErrorPrint > 4000) {
      lastErrorPrint = millis();
      Serial.printf("[HTTP ERROR] Code: %d -> Cannot reach %s\n", httpCode, SERVER_POLL_URL);
      if (httpCode == -1) {
        Serial.println("  --> REASON: Laptop refused connection or Windows Firewall is blocking Port 3000!");
        Serial.println("  --> FIX: Check your Laptop IP in ipconfig, or disable Windows Firewall temporarily.");
      }
    }
  }

  http.end();
}

// --- Releases Magnetic Lock (LED ON) & Sounds Chimes ---
void unlockGateSequence(int durationMs, int beepCount) {
  for (int i = 0; i < beepCount; i++) {
    playTone(1500 + (i * 400), 120);
    if (i < beepCount - 1) delay(80);
  }

  // Energize Gate Lock (LED ON = Gate Open)
  digitalWrite(GATE_LOCK_LED, HIGH);
  Serial.println("[GATE] >>> SOLENOID LOCK RELEASED / GATE OPEN (LED ON) <<<");

  delay(durationMs);

  // Lock Gate again (LED OFF = Gate Locked)
  digitalWrite(GATE_LOCK_LED, LOW);
  Serial.println("[GATE] >>> SOLENOID LOCK ENGAGED / GATE LOCKED (LED OFF) <<<");
}

// --- Universal Sound Generator (Works on Active AND Passive Buzzers) ---
void playTone(int freqHz, int durationMs) {
  if (freqHz <= 0) return;
  long delayUs = 1000000L / (freqHz * 2L);
  long totalCycles = ((long)freqHz * durationMs) / 1000L;

  for (long i = 0; i < totalCycles; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delayMicroseconds(delayUs);
    digitalWrite(BUZZER_PIN, LOW);
    delayMicroseconds(delayUs);
  }
}

// --- PayPal 3-Tone Victory Chime ---
void playPayPalVictoryChime() {
  int frequencies[] = { 1046, 1318, 1568 };
  int noteDurations[] = { 120, 120, 260 };

  for (int i = 0; i < 3; i++) {
    digitalWrite(GATE_LOCK_LED, HIGH);
    playTone(frequencies[i], noteDurations[i]);
    digitalWrite(GATE_LOCK_LED, LOW);
    if (i < 2) delay(60);
  }
}

// --- Anti-Theft Emergency Siren & LED Strobe (Alternating 900Hz / 1300Hz) ---
void playAntiTheftAlarm(int durationMs) {
  unsigned long start = millis();
  while (millis() - start < (unsigned long)durationMs) {
    // Phase A: Low tone + LED Strobe ON
    digitalWrite(GATE_LOCK_LED, HIGH);
    playTone(900, 110);
    digitalWrite(GATE_LOCK_LED, LOW);
    
    // Phase B: High pitch siren + LED Strobe
    playTone(1300, 110);
  }
  digitalWrite(GATE_LOCK_LED, LOW);
  digitalWrite(BUZZER_PIN, LOW);
}
