/*
 * AgroVault IoT Sensor Firmware - v0.1
 * ESP32 + DHT22 Temperature & Humidity Monitor
 *
 * Reads sensor data every 30 seconds and POSTs to AgroVault API.
 * Day 3: Basic reading & serial output
 * Day 5: HTTP POST to backend API
 * Day 11: Deep sleep, buffering, GSM fallback, OTA
 */

#include <Arduino.h>
// #include <WiFi.h>
// #include <HTTPClient.h>
// #include <DHT.h>
// #include <ArduinoJson.h>
// #include "config.h"

// ── Pin Definitions ──
// #define DHT_PIN 4
// #define DHT_TYPE DHT22
// #define LED_PIN 2

// DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("==============================");
  Serial.println(" AgroVault Sensor Firmware v0.1");
  Serial.println("==============================");
  Serial.println();
  Serial.println("TODO: Initialize DHT22 sensor on Day 3");
  Serial.println("TODO: Connect to WiFi on Day 3");
  Serial.println("TODO: POST readings to API on Day 5");

  // Uncomment when hardware is ready:
  // pinMode(LED_PIN, OUTPUT);
  // dht.begin();
  // connectWiFi();
}

void loop() {
  // Placeholder — will read sensor and POST to API
  Serial.println("Firmware scaffold ready. Waiting for hardware setup...");
  delay(30000); // 30 second interval
}

// TODO Day 3: Read DHT22 sensor
// float readTemperature() { return dht.readTemperature(); }
// float readHumidity() { return dht.readHumidity(); }

// TODO Day 5: Post data to AgroVault API
// void postSensorData(float temp, float humidity) { ... }
