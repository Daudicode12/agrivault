# AgroVault IoT Firmware

ESP32-based environmental monitoring firmware for post-harvest storage.

## Hardware Requirements
- ESP32 DevKit V1
- DHT22 Temperature & Humidity Sensor
- Breadboard + jumper wires
- USB cable for programming
- (Optional) SIM800L GSM module for cellular fallback

## Wiring
| ESP32 Pin | DHT22 Pin | Description       |
|-----------|-----------|-------------------|
| 3.3V      | VCC       | Power supply      |
| GND       | GND       | Ground            |
| GPIO 4    | DATA      | Signal (with 10kΩ pull-up) |

## Setup
1. Install [PlatformIO](https://platformio.org/) in VS Code
2. Update `src/config.h` with your WiFi and API credentials
3. Connect ESP32 via USB
4. Build & upload: `pio run --target upload`
5. Monitor: `pio device monitor`

## Development Phases
- **Day 3**: Basic sensor reading on serial monitor
- **Day 5**: HTTP POST to AgroVault API
- **Day 11**: Deep sleep, local buffering, GSM fallback, OTA updates
