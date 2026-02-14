# AgroVault

**Smart Post-Harvest Intelligence Platform**

AgroVault combines IoT environmental monitoring, spoilage prediction, and market intelligence to help African farmers reduce post-harvest losses and maximize selling profits.

## Project Structure

```
agrovault/
├── backend/          # Express + TypeScript API (TypeORM + Supabase)
├── frontend/         # Flutter mobile app (coming Day 7)
├── firmware/         # ESP32 IoT sensor firmware (PlatformIO)
├── market-engine/    # Market data collection & analysis service
└── docs/             # Project documentation
```

## Quick Start

### Backend API

```bash
cd backend
npm install
cp .env.example .env    # Update with your Supabase credentials
npm run dev             # Starts on http://localhost:3000
```

### Seed Database

```bash
cd backend
npm run seed            # Creates demo user, commodities, and storage unit
```

**Demo credentials:** `farmer@agrovault.dev` / `password123`

### API Endpoints

| Method | Endpoint                          | Auth     | Description                     |
|--------|-----------------------------------|----------|---------------------------------|
| POST   | /api/auth/register                | Public   | Register new user               |
| POST   | /api/auth/login                   | Public   | Login & get JWT token           |
| GET    | /api/auth/profile                 | JWT      | Get user profile                |
| GET    | /api/storage-units                | JWT      | List my storage units           |
| POST   | /api/storage-units                | JWT      | Create storage unit             |
| GET    | /api/storage-units/:id            | JWT      | Get storage unit details        |
| PUT    | /api/storage-units/:id            | JWT      | Update storage unit             |
| DELETE | /api/storage-units/:id            | JWT      | Delete storage unit             |
| GET    | /api/commodities                  | Public   | List all commodities            |
| POST   | /api/commodities                  | JWT      | Create commodity                |
| POST   | /api/sensor-readings              | API Key  | Submit sensor reading (IoT)     |
| GET    | /api/sensor-readings/unit/:id     | JWT      | Get readings for a unit         |
| GET    | /api/market-data                  | Public   | Get market prices               |
| POST   | /api/market-data                  | JWT      | Submit manual price entry       |
| GET    | /api/alerts                       | JWT      | Get my alerts                   |
| GET    | /api/health                       | Public   | API health check                |

### Tech Stack

- **Backend:** Node.js, Express, TypeScript, TypeORM
- **Database:** PostgreSQL (Supabase)
- **Frontend:** Flutter (Android + iOS)
- **IoT:** ESP32 + DHT22 (PlatformIO / Arduino)
- **Market Engine:** TypeScript, Axios, Cron

## 21-Day Development Roadmap

- **Phase 1 (Days 1-4):** Foundation & Setup ✅
- **Phase 2 (Days 5-11):** Core Development
- **Phase 3 (Days 12-16):** Intelligence & Integration
- **Phase 4 (Days 17-21):** Testing, Polish & Launch

## License

MIT
