// AgroVault Firmware Configuration
// Update these values with your actual credentials

#ifndef CONFIG_H
#define CONFIG_H

// WiFi
#define WIFI_SSID       "your_wifi_ssid"
#define WIFI_PASSWORD   "your_wifi_password"

// AgroVault API
#define API_BASE_URL    "https://your-api.example.com"
#define API_ENDPOINT    "/api/sensor-readings"
#define DEVICE_API_KEY  "dev_api_key_001"
#define STORAGE_UNIT_ID "your-storage-unit-uuid"

// Sensor
#define READ_INTERVAL_MS 30000  // 30 seconds
#define DHT_PIN          4
#define DHT_TYPE         DHT22

#endif
