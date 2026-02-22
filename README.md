a# AgroVault

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
- **Get sell/hold recommendations** — The decision engine combines spoilage risk, price trends, forecasts, and seasonal patterns to advise: "Sell now" or "Hold — prices are rising and your storage is safe for 30 more days."
- **View market analysis** — See trend direction, moving averages, momentum, and volatility for any commodity. Understand if prices are rising, falling, or stable.
- **Check price forecasts** — View predicted prices for the next 7–90 days with confidence intervals. Helps plan when to take produce to market.
- **Understand seasonal patterns** — See which months typically have the highest and lowest prices for each crop. Know how many months until the next peak selling window.

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
│   ├── analysis/             # Analysis modules (trend, forecast, seasonal, recommendations)
│   ├── scrapers/base.js      # Scraper interface definition
│   ├── src/index.js          # Cron scheduler entry point
│   ├── src/aggregator.js     # Orchestrates analysis for all commodities
│   └── tests/                # 30 unit tests for analysis modules
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
| `GET` | `/recommendations/:unitId` | JWT | Get personalised sell/hold recommendation for a storage unit |

### Market Analysis

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/market-analysis/overview` | Public | Market snapshot — latest price, trend, weekly/monthly change for all commodities |
| `GET` | `/market-analysis/:commodityId` | Public | Full analysis — trend + forecast + seasonal for one commodity |
| `GET` | `/market-analysis/:commodityId/chart` | Public | Price chart data with SMA/EMA overlays (`?days=90`) |
| `GET` | `/market-analysis/:commodityId/forecast` | Public | Price forecast with confidence intervals (`?days=30`) |
| `GET` | `/market-analysis/:commodityId/seasonal` | Public | Seasonal patterns — peak/valley months, sell/hold signal |

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

The `market-engine/` is the **intelligence core** of AgroVault. It analyses commodity price data and produces actionable sell/hold recommendations so farmers know the best time to sell their produce.

### What It Does

The market engine answers **one critical question** for the farmer:

> *"Should I sell my crop now, or hold it for a better price?"*

It does this by running four types of analysis on historical price data:

| Analysis | What It Computes | Why It Matters |
|---|---|---|
| **Trend Analysis** | Moving averages (7/14/30-day SMA, 14-day EMA), price momentum, volatility, support/resistance levels | Tells the farmer if prices are currently going up, down, or sideways |
| **Price Forecasting** | Predicted prices for the next 7–90 days using linear regression blended with weighted moving averages | Helps the farmer decide if waiting will pay off |
| **Seasonal Patterns** | Monthly price indices based on Kenya's agricultural calendar (long rains Mar–May, short rains Oct–Dec) | Identifies peak-price months (e.g., May for Maize) and low-price months (e.g., Sep for Maize) |
| **Sell/Hold Recommendation** | Weighted composite score combining trend (30%), forecast (25%), seasonality (20%), and storage risk (25%) | A single clear recommendation: SELL, CONSIDER_SELLING, HOLD, or STRONG_HOLD |

### How Recommendations Work

The recommendation engine scores four factors on a scale of -100 (strong hold) to +100 (strong sell):

```
   Factor         Weight    Positive Score → SELL        Negative Score → HOLD
   ─────────────  ──────    ──────────────────────       ─────────────────────
   Price Trend     30%      Price above 30-day SMA       Price below 30-day SMA
                            Falling trend (sell before    Rising trend (wait for
                            further drop)                 higher price)

   Forecast        25%      Forecast shows decline        Forecast shows increase

   Seasonality     20%      Current month is a            Current month is a
                            peak-price month              low-price month

   Storage Risk    25%      Nearing max shelf life,       Plenty of storage time,
                            high spoilage risk from       low spoilage risk
                            sensor data
```

The weighted composite score maps to a recommendation:

| Score Range | Recommendation | Urgency |
|---|---|---|
| ≥ 30 | **SELL** | High |
| 15 to 29 | **SELL** | Moderate |
| 5 to 14 | **CONSIDER_SELLING** | Low |
| -4 to 4 | **HOLD** | Low |
| -15 to -5 | **HOLD** | Moderate |
| ≤ -16 | **STRONG_HOLD** | High |

Each recommendation comes with a **plain-English summary**, e.g.:
> *"We strongly recommend holding your Maize. Prices typically peak around May, which is 3 month(s) away. Our forecast shows prices are likely to rise by 8.5% over the next 30 days."*

### Kenyan Seasonal Calendar

The engine has built-in seasonal factors for 7 Kenyan crops, calibrated to the country's two rainy seasons:

- **Long rains** (March–May) → harvest June–August → **prices drop** after harvest
- **Short rains** (October–December) → harvest January–February → **prices drop** after harvest
- **Lean season** (March–May, November–December) → low supply → **prices peak**

| Commodity | Peak Months (Sell!) | Valley Months (Hold!) |
|---|---|---|
| Maize | April, May, March | September, August, July |
| Beans | May, April, December | August, September, February |
| Rice | May, April, June | September, August, October |
| Irish Potatoes | March, December, February | July, August, June |
| Coffee (dried) | July, June, August | March, February, November |

### Analysis Modules

```
market-engine/
├── analysis/
│   ├── index.js                # Public API — re-exports all functions
│   ├── trendAnalyzer.js        # SMA, EMA, momentum, volatility, support/resistance
│   ├── forecaster.js           # Linear regression + WMA price forecasting
│   ├── seasonality.js          # Monthly seasonal indices & timing signals
│   └── recommendationEngine.js # Composite sell/hold scoring engine
├── scrapers/
│   └── base.js                 # Scraper interface (KNBS, FAO, EAGC — planned)
├── src/
│   ├── index.js                # Cron scheduler entry point
│   ├── config.js               # Supabase connection & analysis config
│   └── aggregator.js           # Orchestrates analysis for all commodities
├── tests/
│   └── analysis.test.js        # 30 unit tests for all modules
└── package.json
```

### Running the Market Engine

```bash
cd market-engine
npm install

# Run analysis immediately (one-shot)
npm run analyze

# Start cron scheduler (analyses every 4 hours)
npm run dev

# Run tests (30 tests covering all modules)
npm test
```

### Seeding Market Data for Development

The analysis needs historical price data. A seeder generates 180 days of realistic prices for all commodities:

```bash
cd backend
npm run seed          # Seed commodities + demo user first
npm run seed:market   # Generate 180 days of price data
```

This creates ~126 price records per commodity (simulating ~5 market days/week) with:
- Realistic seasonal price variation matching Kenya's agricultural calendar
- Random walk with mean reversion (prices fluctuate but gravitate toward seasonal norms)
- Multiple markets: Nairobi, Mombasa, Kisumu, Nakuru, Eldoret

---

## Market Analysis API Reference

All market analysis endpoints are prefixed with `/api/market-analysis`. These are **public** endpoints (no auth required) — any farmer can view market data.

### Market Analysis Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/market-analysis/overview` | Public | Market snapshot for ALL commodities |
| `GET` | `/market-analysis/:commodityId` | Public | Full analysis — trend + forecast + seasonal |
| `GET` | `/market-analysis/:commodityId/chart` | Public | Price chart data with moving average overlays |
| `GET` | `/market-analysis/:commodityId/forecast` | Public | Price forecast only (next 7–90 days) |
| `GET` | `/market-analysis/:commodityId/seasonal` | Public | Seasonal patterns & sell/hold timing |
| `GET` | `/recommendations/:unitId` | **JWT** | Personalised sell/hold for a specific storage unit |

---

## Testing Market Analysis APIs in Postman

Below is a step-by-step Postman testing guide. **Setup first:**

1. Start the backend: `cd backend && npm run dev`
2. Seed data: `npm run seed && npm run seed:market`
3. Set Postman base URL variable: `{{baseUrl}}` = `http://localhost:3000/api`

### Step 1: Get a Commodity ID

**Request:**
```
GET {{baseUrl}}/commodities
```

**Expected Response (200):**
```json
{
  "commodities": [
    {
      "id": "a1b2c3d4-...",
      "name": "Maize",
      "category": "Grain",
      "optimalTempMin": 10,
      "optimalTempMax": 15,
      "optimalHumidityMin": 12,
      "optimalHumidityMax": 14,
      "maxStorageDays": 365,
      "unit": "bag (90kg)"
    },
    { "id": "...", "name": "Beans", ... },
    { "id": "...", "name": "Coffee (dried)", ... }
  ]
}
```
Copy one of the `id` values (e.g. the Maize ID) — you'll use it in the next requests.

---

### Step 2: Market Overview (All Commodities)

**Request:**
```
GET {{baseUrl}}/market-analysis/overview
```

**Expected Response (200):**
```json
{
  "overview": [
    {
      "commodity": {
        "id": "a1b2c3d4-...",
        "name": "Maize",
        "category": "Grain",
        "unit": "bag (90kg)"
      },
      "latestPrice": 3842.50,
      "latestDate": "2026-02-22T10:00:00.000Z",
      "market": "Nakuru",
      "weeklyChangePct": 2.35,
      "monthlyChangePct": -1.80,
      "trend": "rising"
    },
    {
      "commodity": { "name": "Beans", ... },
      "latestPrice": 8320.00,
      "weeklyChangePct": -3.10,
      "trend": "falling"
    }
  ],
  "count": 7,
  "generatedAt": "2026-02-22T12:00:00.000Z"
}
```

**What to look for:**
- Each commodity shows its latest price, which market reported it, and weekly/monthly % change
- `trend` will be `"rising"`, `"falling"`, or `"stable"` based on the weekly change
- `weeklyChangePct` / `monthlyChangePct` will be `null` if there isn't enough historical data

---

### Step 3: Full Analysis for One Commodity

**Request:**
```
GET {{baseUrl}}/market-analysis/{{commodityId}}
```
Replace `{{commodityId}}` with the Maize UUID from Step 1.

**Expected Response (200):**
```json
{
  "status": "ok",
  "commodity": {
    "id": "a1b2c3d4-...",
    "name": "Maize",
    "category": "Grain",
    "maxStorageDays": 365
  },
  "dataPoints": 126,
  "trend": {
    "direction": "rising",
    "currentPrice": 3842.50,
    "latestDate": "2026-02-22T10:00:00.000Z",
    "movingAverages": {
      "sma7": 3810.25,
      "sma14": 3785.50,
      "sma30": 3720.00,
      "ema14": 3805.10
    },
    "momentum": {
      "7day": 3.45,
      "14day": 5.20
    },
    "volatility": {
      "dailyVolatility": 1.85,
      "annualizedVolatility": 29.35,
      "periodDays": 30
    },
    "supportResistance": {
      "support": 3650.00,
      "resistance": 3920.00
    },
    "priceRange": {
      "high": 3920.00,
      "low": 3580.00,
      "average": 3750.25
    }
  },
  "forecast": {
    "direction": "moderate_increase",
    "priceChangePct": 4.20,
    "priceChange": 161.50,
    "horizonDays": 30,
    "reliability": "moderate",
    "rSquared": 0.52,
    "predictions": [
      {
        "date": "2026-02-23",
        "predictedPrice": 3855.00,
        "confidence90": { "lower": 3780.00, "upper": 3930.00 },
        "dayAhead": 1
      },
      {
        "date": "2026-02-24",
        "predictedPrice": 3868.00,
        "confidence90": { "lower": 3770.00, "upper": 3966.00 },
        "dayAhead": 2
      }
    ]
  },
  "seasonal": {
    "currentMonth": "February",
    "currentFactor": 1.0,
    "seasonalSignal": "neutral",
    "peakMonths": [
      { "month": "May", "factor": 1.1 },
      { "month": "April", "factor": 1.08 },
      { "month": "March", "factor": 1.05 }
    ],
    "valleyMonths": [
      { "month": "September", "factor": 0.88 },
      { "month": "August", "factor": 0.9 },
      { "month": "July", "factor": 0.95 }
    ],
    "nextPeakMonth": "March",
    "monthsUntilPeak": 1,
    "source": "computed"
  },
  "analyzedAt": "2026-02-22T12:00:00.000Z"
}
```

**What to look for:**
- `trend.direction`: `"rising"`, `"falling"`, or `"stable"`
- `trend.movingAverages`: If `sma7 > sma30`, short-term prices are above the long-term average (bullish)
- `trend.momentum.7day`: Positive = prices going up, negative = going down
- `forecast.direction`: `"strong_increase"`, `"moderate_increase"`, `"stable"`, `"moderate_decrease"`, `"strong_decrease"`
- `forecast.predictions[]`: Day-by-day predicted prices with 90% confidence bands
- `seasonal.nextPeakMonth` + `monthsUntilPeak`: When to sell for best seasonal price
- If data is insufficient, `status` will be `"insufficient_data"` with an explanation

---

### Step 4: Price Chart Data

**Request:**
```
GET {{baseUrl}}/market-analysis/{{commodityId}}/chart?days=90
```

**Query Parameters:**
- `days` — Number of days of history (default: 90, max: 365)

**Expected Response (200):**
```json
{
  "status": "ok",
  "prices": [
    { "date": "2025-11-25T...", "price": 3520.00, "market": "Nairobi", "source": "seed" },
    { "date": "2025-11-26T...", "price": 3545.00, "market": "Kisumu", "source": "seed" }
  ],
  "movingAverages": {
    "sma7": [{ "date": "2025-12-01T...", "sma": 3530.50 }, ...],
    "sma14": [...],
    "sma30": [...]
  },
  "ema": [{ "date": "2025-11-25T...", "ema": 3520.00 }, ...],
  "dataPoints": 63,
  "periodDays": 90
}
```

**What to look for:**
- `prices[]`: Raw price points for plotting the main chart line
- `movingAverages.sma7/14/30`: Overlay lines — SMA7 tracks recent movement, SMA30 shows the longer trend
- `ema[]`: Exponential moving average — reacts faster to recent price changes
- Use these arrays to build a line chart in the frontend

---

### Step 5: Price Forecast

**Request:**
```
GET {{baseUrl}}/market-analysis/{{commodityId}}/forecast?days=30
```

**Query Parameters:**
- `days` — Forecast horizon (default: 30, max: 90)

**Expected Response (200):**
```json
{
  "status": "ok",
  "commodity": "Maize",
  "currentPrice": 3842.50,
  "method": "blended_regression_wma",
  "regression": {
    "slope": 3.85,
    "intercept": 3350.00,
    "rSquared": 0.52,
    "dailyTrend": "upward",
    "dailyChangeRate": 3.85
  },
  "forecast": {
    "horizonDays": 30,
    "direction": "moderate_increase",
    "priceChange": 161.50,
    "priceChangePct": 4.20,
    "predictions": [
      {
        "date": "2026-02-23",
        "predictedPrice": 3855.00,
        "confidence90": { "lower": 3780.00, "upper": 3930.00 },
        "dayAhead": 1
      }
    ]
  },
  "confidence": {
    "rSquared": 0.52,
    "reliability": "moderate",
    "dataPoints": 126
  }
}
```

**What to look for:**
- `regression.slope`: Daily price change rate in KES. Positive = upward, negative = downward
- `regression.rSquared`: How well the model fits (0 = poor, 1 = perfect). Above 0.7 = high confidence
- `confidence.reliability`: `"high"` (R² > 0.7), `"moderate"` (R² > 0.4), `"low"` (R² ≤ 0.4)
- `forecast.predictions[].confidence90`: 90% of the time, the actual price will fall in this range
- Notice confidence bands **widen** for dates further in the future (more uncertainty)
- Returns `status: "insufficient_data"` if fewer than 14 price records exist

---

### Step 6: Seasonal Patterns

**Request:**
```
GET {{baseUrl}}/market-analysis/{{commodityId}}/seasonal
```

**Expected Response (200):**
```json
{
  "status": "ok",
  "commodity": "Maize",
  "currentMonth": "February",
  "currentFactor": 1.0,
  "seasonalSignal": "neutral",
  "peakMonths": [
    { "month": "May", "factor": 1.1 },
    { "month": "April", "factor": 1.08 },
    { "month": "March", "factor": 1.05 }
  ],
  "valleyMonths": [
    { "month": "September", "factor": 0.88 },
    { "month": "August", "factor": 0.9 },
    { "month": "July", "factor": 0.95 }
  ],
  "nextPeakMonth": "March",
  "monthsUntilPeak": 1,
  "allFactors": {
    "January": 0.98,
    "February": 1.0,
    "March": 1.05,
    "April": 1.08,
    "May": 1.1,
    "June": 1.03,
    "July": 0.95,
    "August": 0.9,
    "September": 0.88,
    "October": 0.93,
    "November": 0.98,
    "December": 1.02
  },
  "source": "computed"
}
```

**What to look for:**
- `currentFactor`: > 1.0 means current month has above-average prices (good to sell), < 1.0 means below average (hold)
- `seasonalSignal`: `"strong_sell"` (factor ≥ 1.05), `"sell"` (≥ 1.02), `"neutral"`, `"hold"` (≤ 0.97), `"strong_hold"` (≤ 0.93)
- `peakMonths`: Top 3 months when prices are highest — aim to sell during these
- `valleyMonths`: Bottom 3 months when prices are lowest — avoid selling during these
- `nextPeakMonth` + `monthsUntilPeak`: Tells farmer how long to hold for peak pricing
- `source`: `"computed"` (calculated from actual data) or `"default"` (using Kenya seasonal defaults)

---

### Step 7: Sell/Hold Recommendation for a Storage Unit (Requires Auth)

This is the **most important endpoint** — it gives a farmer a personalised recommendation for their stored produce.

**First, log in to get a token:**
```
POST {{baseUrl}}/auth/login
Body (JSON):
{
  "email": "farmer@agrovault.dev",
  "password": "password123"
}
```
Copy the `token` from the response.

**Then get your storage unit ID:**
```
GET {{baseUrl}}/storage-units
Headers: Authorization: Bearer {{token}}
```
Copy a `storageUnit.id`.

**Request the recommendation:**
```
GET {{baseUrl}}/recommendations/{{storageUnitId}}
Headers: Authorization: Bearer {{token}}
```

**Expected Response (200):**
```json
{
  "status": "ok",
  "storageUnit": {
    "id": "unit-uuid-...",
    "name": "Barn A - Maize Storage",
    "commodity": "Maize",
    "currentStockKg": 3200,
    "daysInStorage": 45
  },
  "recommendation": "HOLD",
  "urgency": "moderate",
  "confidence": "high",
  "compositeScore": -12.5,
  "summary": "We recommend holding your Maize for now. Prices typically peak around May, which is 3 month(s) away. Our forecast shows prices are likely to rise by 4.2% over the next 30 days.",
  "commodity": "Maize",
  "currentPrice": 3842.50,
  "scores": {
    "trend": {
      "score": -20,
      "weight": 0.3,
      "reasons": [
        "Price trend is rising — holding may yield better returns",
        "Strong upward momentum (6.2% in 7 days) — prices still climbing"
      ]
    },
    "forecast": {
      "score": -15,
      "weight": 0.25,
      "reasons": [
        "Forecast shows 4.2% price increase — consider holding"
      ]
    },
    "seasonal": {
      "score": -20,
      "weight": 0.2,
      "reasons": [
        "February typically has below-average prices — consider holding",
        "Prices typically peak in May (3 months away)"
      ]
    },
    "storage": {
      "score": -5,
      "weight": 0.25,
      "reasons": [
        "Plenty of storage life remaining (320 days) — no urgency to sell"
      ]
    }
  },
  "analysis": {
    "trend": {
      "direction": "rising",
      "movingAverages": { "sma7": 3810.25, "sma14": 3785.50, "sma30": 3720.00 },
      "momentum": { "7day": 6.2, "14day": 8.1 },
      "priceRange": { "high": 3920.00, "low": 3580.00, "average": 3750.25 }
    },
    "forecast": {
      "direction": "moderate_increase",
      "priceChangePct": 4.2,
      "reliability": "moderate",
      "predictions": [
        { "date": "2026-02-23", "predictedPrice": 3855.00, "dayAhead": 1 }
      ]
    },
    "seasonal": {
      "currentMonth": "February",
      "seasonalSignal": "hold",
      "nextPeakMonth": "May",
      "monthsUntilPeak": 3
    }
  },
  "generatedAt": "2026-02-22T12:00:00.000Z"
}
```

**What to look for:**
- `recommendation`: The action — `"SELL"`, `"CONSIDER_SELLING"`, `"HOLD"`, or `"STRONG_HOLD"`
- `urgency`: `"high"`, `"moderate"`, or `"low"`
- `summary`: **Human-readable advice** you can show directly to the farmer in the app UI
- `compositeScore`: The raw weighted score (positive = sell, negative = hold)
- `scores.*.reasons[]`: Detailed explanations for each factor — useful for an "Why?" expandable section in the UI
- `storageUnit.daysInStorage`: How long the produce has been stored (affects storage risk score)
- If spoilage risk is detected from sensor data, the storage score will be higher (push toward selling)

---

### Postman Quick-Test Summary

| # | Request | What You're Testing |
|---|---|---|
| 1 | `GET /commodities` | Get commodity IDs for subsequent requests |
| 2 | `GET /market-analysis/overview` | Dashboard view — all commodities at a glance |
| 3 | `GET /market-analysis/:id` | Deep dive — full trend + forecast + seasonal for one crop |
| 4 | `GET /market-analysis/:id/chart?days=90` | Chart data — plot price lines with moving averages |
| 5 | `GET /market-analysis/:id/forecast?days=30` | Forecast — predicted prices with confidence intervals |
| 6 | `GET /market-analysis/:id/seasonal` | Seasonal calendar — peak/valley months |
| 7 | `POST /auth/login` | Get JWT token for authenticated endpoints |
| 8 | `GET /storage-units` | Get storage unit IDs (needs token) |
| 9 | `GET /recommendations/:unitId` | **The big one** — personalised sell/hold recommendation |

> **Tip:** If you see `"status": "insufficient_data"`, run `npm run seed:market` in the backend directory to generate 180 days of historical prices.

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

- [x] Market price trend analysis (SMA, EMA, momentum, volatility)
- [x] Price forecasting (linear regression + WMA blending + seasonal adjustment)
- [x] Seasonal pattern detection (Kenya agricultural calendar)
- [x] Combined sell/hold recommendation engine (4-factor weighted scoring)
- [x] Market analysis API endpoints (6 routes)
- [x] Market data seeder (180 days of realistic prices)
- [x] 30 unit tests for all analysis modules
- [ ] Spoilage prediction model (moving averages + rule engine)
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
