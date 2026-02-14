# AgroVault System Architecture

## Data Flow

```
┌──────────────┐    HTTP/MQTT     ┌──────────────┐    SQL      ┌──────────────┐
│   ESP32 +    │ ──────────────►  │   Backend    │ ─────────►  │   Supabase   │
│   DHT22      │   sensor data    │   Express    │   TypeORM   │  PostgreSQL  │
│   Sensor     │                  │   API        │             │              │
└──────────────┘                  └──────┬───────┘             └──────────────┘
                                         │
                                    ┌────┴────┐
                                    ▼         ▼
                              ┌──────────┐ ┌──────────────┐
                              │  Alert   │ │   Market     │
                              │  Engine  │ │   Engine     │
                              └────┬─────┘ └──────┬───────┘
                                   │              │
                                   ▼              ▼
                              ┌─────────────────────┐
                              │  Decision Engine    │
                              │  (Recommendations)  │
                              └──────────┬──────────┘
                                         │
                                    ┌────┴────┐
                                    ▼         ▼
                              ┌──────────┐ ┌──────────┐
                              │ Flutter  │ │   SMS    │
                              │   App    │ │ (AT/     │
                              │ (FCM)    │ │  Twilio) │
                              └──────────┘ └──────────┘
```

## Database Schema (7 tables)

- **users** — Farmer accounts and profiles
- **commodities** — Crop types with optimal storage conditions
- **storage_units** — Physical storage locations with IoT device mapping
- **sensor_readings** — Time-series environmental data (temp, humidity)
- **market_data** — Commodity prices by market and source
- **alerts** — Notifications and warnings
- **prediction_logs** — Spoilage predictions and market forecasts
