/*
 * Quick 15-Line Standalone Buzzer Test Sketch
 * Upload this to test your buzzer on D14 right now!
 */

#define BUZZER_PIN 14  // Buzzer connected to D14
#define BLUE_LED   2   // Onboard Blue LED

void playTone(int freqHz, int durationMs) {
  long delayUs = 1000000L / (freqHz * 2L);
  long totalCycles = ((long)freqHz * durationMs) / 1000L;
  for (long i = 0; i < totalCycles; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delayMicroseconds(delayUs);
    digitalWrite(BUZZER_PIN, LOW);
    delayMicroseconds(delayUs);
  }
}

void setup() {
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BLUE_LED, OUTPUT);
}

void loop() {
  // Beep + Blue LED ON
  digitalWrite(BLUE_LED, HIGH);
  playTone(2000, 200); // 2000 Hz beep for 200ms
  digitalWrite(BLUE_LED, LOW);

  delay(1000); // Wait 1 second and repeat
}
