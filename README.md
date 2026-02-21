# AgroVault

**Smart Post-Harvest Intelligence Platform**

AgroVault combines IoT environmental monitoring, spoilage prediction, and real-time market intelligence to help African farmers reduce post-harvest losses and sell at the best price. The system watches over stored crops 24/7 using low-cost sensors, warns farmers before spoilage occurs, and tracks commodity prices across markets.

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [What the App Does](#what-the-app-does)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
- [IoT Firmware](#iot-firmware)
- [Market Engine](#market-engine)
- [Row Level Security](#row-level-security)
- [Development Roadmap](#development-roadmap)
- [License](#license)

---

## Problem Statement

In Sub-Saharan Africa, **30–40 % of harvested crops are lost** before reaching the market due to poor storage conditions, lack of real-time monitoring, and farmers selling at the wrong time. AgroVault tackles all three:

1. **Environmental Monitoring** — ESP32 + DHT22 sensors track temperature and humidity inside storage units in real time.
2. **Spoilage Prevention** — Alerts fire when conditions drift outside safe ranges for each commodity (e.g., 10–15 °C / 12–14 % RH for maize).
3. **Market Intelligence** — Aggregated commodity prices help farmers decide *when* and *where* to sell.

---

## What the App Does

AgroVault is a full-stack platform (mobile app + backend + IoT hardware) that gives farmers visibility and control over their stored harvests. Here's what a farmer can do:

### For Farmers (Mobile App)

- **Register & manage an account** — Sign up with name, email, phone, and location. Log in with email/password to receive a JWT session.
- **Add storage units** — Register each physical storage location (barn, warehouse, silo) and assign a commodity type (e.g., Maize, Beans, Coffee). Track capacity and current stock levels.
- **Link an IoT sensor** — Each storage unit is paired with an ESP32 + DHT22 device via a unique device ID and API key. The sensor pushes temperature and humidity readings every 30 seconds automatically.
- **Monitor conditions in real time** — View the latest and historical sensor readings for any storage unit. Filter by date range to spot trends.
- **Receive spoilage alerts** — When temperature or humidity drifts outside the safe range for the stored commodity, the system generates an alert with severity level, description, and the storage unit involved. Alerts can be filtered by type, marked as read individually or in bulk.
- **Check market prices** — Browse current and historical commodity prices across different markets. Filter by commodity, market, date range. Use this to decide when and where to sell.
- **Submit manual price entries** — If a farmer observes a price at a local market, they can record it to contribute to the platform's price data.
- **Get sell/hold recommendations** *(Phase 3)* — The decision engine will combine spoilage risk and market trends to advise farmers: "Sell now at Market X" or "Hold — prices are rising and your storage is safe for 30 more days."

### For IoT Devices

- **Authenticate via API key** — Each sensor device sends its `x-api-key` header. The backend validates it against the storage unit's registered key.
- **Post sensor readings** — Devices send temperature, humidity, battery level, and signal strength. Readings outside the valid range (-40–80 °C, 0–100 % RH) are rejected.
- **Automatic device tracking** — Each reading records the device ID, enabling diagnostics per sensor.

### For the System (Backend / Automation)

- **Commodity reference data** — The system maintains optimal storage conditions for each crop (temp range, humidity range, max safe storage days). This drives alert thresholds.
- **Spoilage prediction logging** *(Phase 3)* — The prediction engine logs risk level, confidence score, estimated days to spoilage, and recommended action for each storage unit over time.
- **Market data aggregation** — The market engine scrapes prices from external sources (KNBS, FAO, EAGC) on a schedule, normalizing them into a common format.
- **Row Level Security** — Even if the database is accessed directly (e.g., from a future mobile SDK integration), RLS policies ensure users can only see and modify their own data.

---

## How It Works

```
  ┌─────────────┐         ┌───────────────┐         ┌──────────────┐
  │  ESP32 +    │  HTTP   │   Express.js  │ Supabase│  PostgreSQL  │
  │  DHT22      │────────►│   REST API    │────────►│  (Supabase)  │
  │  Sensor     │ POST    │               │  JS SDK │              │
  └─────────────┘         └───────┬───────┘         └──────────────┘
                                  │
                           ┌──────┴──────┐
                           ▼             ▼
                     ┌──────────┐  ┌───────────┐
                     │  Alert   │  │  Market   │
                     │  Engine  │  │  Engine   │
                     └────┬─────┘  └─────┬─────┘
                          │              │
                          ▼              ▼
                     ┌───────────────────────┐
                     │  Decision Engine      │
                     │  (Recommendations)    │
                     └───────────┬───────────┘
                                 │
                          ┌──────┴──────┐
                          ▼             ▼
                     ┌──────────┐ ┌──────────┐
                     │ Flutter  │ │   SMS    │
                     │  App     │ │ Alerts   │
                     └──────────┘ └──────────┘
```

1. **Sensor → API** — ESP32 reads temp & humidity every 30 s, POSTs to `/api/sensor-readings` with its API key.
2. **API → Supabase** — The Express backend validates the data and writes it via the Supabase JS SDK.
3. **Alert Engine** — Compares readings against the commodity's optimal ranges; creates alerts when thresholds are breached.
4. **Market Engine** — Periodically scrapes / fetches commodity prices from external sources (KNBS, FAO, EAGC).
5. **Decision Engine** — Combines sensor trends, spoilage risk, and market prices into actionable recommendations.
6. **Notifications** — Delivered via the Flutter app (FCM push) or SMS fallback (Africa's Talk / Twilio).

---

## Project Structure

```
agrovault/
├── backend/                  # Express.js REST API (plain JavaScript)
│   ├── src/
│   │   ├── config/           # Supabase client, env config
│   │   ├── middleware/       # JWT auth, device auth, error handler
│   │   ├── routes/           # Route handlers (auth, storage, sensors, …)
│   │   ├── seeds/            # Database seeding script
│   │   ├── utils/            # Winston logger
│   │   └── server.js         # Express app entry point
│   ├── tests/                # Jest test suite
│   ├── supabase-schema-public.sql   # Full DDL + RLS policies
│   └── package.json
│
├── firmware/                 # ESP32 IoT sensor firmware (PlatformIO)
│   ├── src/
│   │   ├── main.cpp          # Arduino entrypoint
│   │   └── config.h          # WiFi & API credentials
│   └── platformio.ini
│
├── market-engine/            # Market data collection & analysis
│   ├── src/index.js          # Scheduler / entry point
│   └── scrapers/base.js      # Scraper interface definition
│
├── frontend/                 # Flutter mobile app (Android + iOS)
│
└── docs/                     # Architecture diagrams, user guide
    └── architecture/
        └── system-overview.md
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend API** | Node.js, Express 4, plain JavaScript (CommonJS) |
| **Database** | PostgreSQL on [Supabase](https://supabase.com) via `@supabase/supabase-js` |
| **Auth** | JWT (jsonwebtoken) + bcryptjs password hashing |
| **Validation** | express-validator |
| **Security** | helmet, cors, express-rate-limit, Row Level Security |
| **Logging** | winston |
| **IoT Firmware** | ESP32 + DHT22, PlatformIO / Arduino framework |
| **Mobile App** | Flutter (Android + iOS) |
| **Market Engine** | Node.js, Axios, node-cron |
| **Testing** | Jest |

---

## Architecture

### Backend

The API is a standard Express.js server. All database operations go through the **Supabase JS SDK** (HTTPS), so there is no direct PostgreSQL connection or ORM. The backend authenticates using the `service_role` key (bypasses RLS) and issues its own JWT tokens for user sessions.

**Key design decisions:**

- **No ORM** — All queries use `supabase.from("table").select() / .insert() / .update() / .delete()`.
- **Two auth strategies** — JWT Bearer tokens for users, `x-api-key` header for IoT devices.
- **Owner-scoped data** — Every query filters by `ownerId` or `userId` to enforce data isolation at the app layer.
- **Append-only logs** — Sensor readings and market data are immutable after insertion.

---

## Database Schema

Seven tables, all prefixed with `agro_` (except `prediction_logs`):

| Table | Purpose | Key Columns |
|---|---|---|
| **agro_users** | Farmer accounts | fullName, email, password (hashed), role, location |
| **agro_commodities** | Crop types & optimal conditions | optimalTempMin/Max, optimalHumidityMin/Max, maxStorageDays |
| **agro_storage_units** | Physical storage locations | ownerId → user, commodityId → commodity, deviceId, deviceApiKey |
| **agro_sensor_readings** | Time-series environmental data | temperature, humidity, recordedAt, storageUnitId |
| **agro_market_data** | Commodity prices | price, currency (KES), market, source, commodityId |
| **agro_alerts** | Notifications & warnings | type, severity, message, isRead, userId, storageUnitId |
| **prediction_logs** | Spoilage predictions & forecasts | riskLevel, confidenceScore, estimatedDaysToSpoilage, storageUnitId |

### Entity Relationships

```
agro_users ──< agro_storage_units ──< agro_sensor_readings
                    │                        │
                    ├──< agro_alerts          │
                    └──< prediction_logs      │
                                              │
agro_commodities ──< agro_storage_units       │
                 ──< agro_market_data         │
```

### Seeded Commodities

The seed script populates 7 Kenyan staples with their optimal storage conditions:

| Commodity | Category | Temp (°C) | Humidity (%) | Max Storage |
|---|---|---|---|---|
| Maize | Grain | 10–15 | 12–14 | 365 days |
| Wheat | Grain | 10–15 | 11–13 | 365 days |
| Rice | Grain | 15–20 | 12–14 | 365 days |
| Beans | Legume | 10–18 | 12–15 | 180 days |
| Sorghum | Grain | 10–15 | 12–14 | 365 days |
| Irish Potatoes | Tuber | 4–8 | 85–95 | 90 days |
| Coffee (dried) | Cash Crop | 15–20 | 10–12 | 365 days |

---

## API Reference

All endpoints are prefixed with `/api`.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Create a new farmer account |
| `POST` | `/auth/login` | Public | Login → returns JWT token |
| `GET` | `/auth/profile` | JWT | Get current user's profile |

### Storage Units

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/storage-units` | JWT | List my storage units (with commodity join) |
| `POST` | `/storage-units` | JWT | Create a new storage unit |
| `GET` | `/storage-units/:id` | JWT | Get a single unit's details |
| `PUT` | `/storage-units/:id` | JWT | Update a storage unit |
| `DELETE` | `/storage-units/:id` | JWT | Delete a storage unit |

### Commodities

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/commodities` | Public | List all commodities |
| `GET` | `/commodities/:id` | Public | Get commodity details |
| `POST` | `/commodities` | JWT | Create a new commodity |
| `PUT` | `/commodities/:id` | JWT | Update a commodity |
| `DELETE` | `/commodities/:id` | JWT | Delete a commodity |

### Sensor Readings

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/sensor-readings` | API Key | Submit a reading from an IoT device |
| `GET` | `/sensor-readings/unit/:unitId` | JWT | Get readings (supports `?from=&to=&limit=`) |
| `GET` | `/sensor-readings/unit/:unitId/latest` | JWT | Get the most recent reading |

### Market Data

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/market-data` | Public | List prices (`?commodityId=&from=&to=&market=&limit=`) |
| `POST` | `/market-data` | JWT | Submit a manual price entry |

### Alerts

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/alerts` | JWT | List my alerts (`?unreadOnly=true&type=&limit=`) |
| `PATCH` | `/alerts/:id/read` | JWT | Mark a single alert as read |
| `PATCH` | `/alerts/read-all` | JWT | Mark all my alerts as read |

### Recommendations

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/recommendations/:unitId` | JWT | Get recommendation for a storage unit *(Phase 3)* |

### Health Check

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Returns `{ status: "ok" }` |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- A **Supabase** project ([supabase.com](https://supabase.com))

### 1. Clone & Install

```bash
git clone https://github.com/your-org/agrovault.git
cd agrovault/backend
npm install
```

### 2. Configure Environment

Create a `.env` file in `backend/`:

```env
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_KEY=<your-service-role-key>
SUPABASE_ANON_KEY=<your-anon-key>

# JWT
JWT_SECRET=change_me_in_production
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### 3. Create Database Tables

Open the **Supabase SQL Editor** and paste the contents of [`backend/supabase-schema-public.sql`](backend/supabase-schema-public.sql). This creates all 7 tables, indexes, triggers, RLS policies, and role grants.

### 4. Seed Demo Data

```bash
npm run seed
```

This creates:
- 7 commodity entries (Maize, Wheat, Rice, Beans, Sorghum, Irish Potatoes, Coffee)
- 1 demo user: `farmer@agrovault.dev` / `password123`
- 1 demo storage unit: "Barn A - Maize Storage"

### 5. Start the Server

```bash
npm run dev          # http://localhost:3000
```

### 6. Test the API

```bash
# Health check
curl http://localhost:3000/api/health

# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"John Doe","email":"john@example.com","password":"secret123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"farmer@agrovault.dev","password":"password123"}'

# Use the returned token for authenticated requests
curl http://localhost:3000/api/storage-units \
  -H "Authorization: Bearer <token>"
```

---

## IoT Firmware

The `firmware/` directory contains PlatformIO code for the **ESP32 + DHT22** environmental sensor.

### Hardware

| Component | Purpose |
|---|---|
| ESP32 DevKit V1 | Microcontroller with WiFi |
| DHT22 | Temperature & humidity sensor |
| SIM800L *(optional)* | GSM cellular fallback |

### Wiring

| ESP32 Pin | DHT22 Pin | Notes |
|---|---|---|
| 3.3V | VCC | Power |
| GND | GND | Ground |
| GPIO 4 | DATA | 10 kΩ pull-up resistor |

### Setup

```bash
cd firmware
# Edit src/config.h with WiFi SSID, password, API URL, and device API key
pio run --target upload
pio device monitor
```

The sensor reads every **30 seconds** and POSTs to `POST /api/sensor-readings` with the `x-api-key` header.

---

## Market Engine

The `market-engine/` service fetches commodity prices from external sources on a schedule.

**Planned data sources:**
- Kenya National Bureau of Statistics API
- FAO price data
- EAGC market prices
- Manual CSV import

Scrapers implement a common interface that returns normalized `{ commodityName, price, currency, market, source, recordedAt }` objects.

```bash
cd market-engine
npm install
npm run dev
```

---

## Row Level Security

All tables have **RLS enabled** with fine-grained policies:

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| **agro_users** | Own row only | Open (registration) | Own row only | — |
| **agro_commodities** | Public | Authenticated | Authenticated | Authenticated |
| **agro_storage_units** | Owner only | Owner only | Owner only | Owner only |
| **agro_sensor_readings** | Via unit owner | Via unit owner | — | — |
| **agro_market_data** | Public | Authenticated | — | — |
| **agro_alerts** | Own alerts | Own alerts | Own alerts | Own alerts |
| **prediction_logs** | Via unit owner | service_role only | — | — |

> **Note:** The Express backend uses the `service_role` key, which **bypasses RLS**. Policies protect data when accessed directly via the `anon` or `authenticated` Supabase keys (e.g., a mobile app calling Supabase directly).

---

## Development Roadmap

### Phase 1 — Foundation & Setup (Days 1–4) ✅

- [x] Project scaffolding (backend, firmware, market-engine, docs)
- [x] Supabase database schema + RLS policies
- [x] Express REST API with JWT auth
- [x] CRUD for users, storage units, commodities
- [x] Seed script with demo data

### Phase 2 — Core Development (Days 5–11)

- [ ] ESP32 firmware: WiFi connection + HTTP POST
- [ ] Sensor readings ingestion pipeline
- [ ] Alert engine (threshold-based)
- [ ] Market data scraper (at least one source)
- [ ] Deep sleep, local buffering, GSM fallback for firmware

### Phase 3 — Intelligence & Integration (Days 12–16)

- [ ] Spoilage prediction model (moving averages + rule engine)
- [ ] Market price forecasting (trend analysis)
- [ ] Combined decision / recommendation engine
- [ ] Flutter mobile app (dashboard, alerts, market view)

### Phase 4 — Testing, Polish & Launch (Days 17–21)

- [ ] End-to-end integration testing
- [ ] SMS alert fallback (Africa's Talking / Twilio)
- [ ] OTA firmware updates
- [ ] Performance optimization & documentation
- [ ] Production deployment

---

## License

MIT
