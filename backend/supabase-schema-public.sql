-- ============================================
-- AgroVault Database Schema for Supabase
-- Uses the default "public" schema
-- Copy and paste this into the Supabase SQL Editor
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Users ──
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "fullName"    VARCHAR(100)  NOT NULL,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password      VARCHAR       NOT NULL,
  phone         VARCHAR(20),
  location      VARCHAR(255),
  role          VARCHAR       NOT NULL DEFAULT 'farmer',
  "isActive"    BOOLEAN       NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP     NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMP     NOT NULL DEFAULT now()
);

-- ── 2. Commodities ──
CREATE TABLE IF NOT EXISTS commodities (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                VARCHAR(100)     NOT NULL UNIQUE,
  category            VARCHAR(50),
  "optimalTempMin"    DECIMAL(5,2),
  "optimalTempMax"    DECIMAL(5,2),
  "optimalHumidityMin" DECIMAL(5,2),
  "optimalHumidityMax" DECIMAL(5,2),
  "maxStorageDays"    INT,
  unit                VARCHAR(50),
  "createdAt"         TIMESTAMP        NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMP        NOT NULL DEFAULT now()
);

-- ── 3. Storage Units ──
CREATE TABLE IF NOT EXISTS storage_units (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(150)    NOT NULL,
  location        VARCHAR(255),
  "capacityKg"    DECIMAL(10,2),
  "currentStockKg" DECIMAL(10,2),
  status          VARCHAR         NOT NULL DEFAULT 'active',
  "deviceId"      VARCHAR(100),
  "deviceApiKey"  VARCHAR(100),
  "ownerId"       UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "commodityId"   UUID            REFERENCES commodities(id),
  "createdAt"     TIMESTAMP       NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMP       NOT NULL DEFAULT now()
);

-- ── 4. Sensor Readings ──
CREATE TABLE IF NOT EXISTS sensor_readings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  temperature       DECIMAL(5,2)  NOT NULL,
  humidity          DECIMAL(5,2)  NOT NULL,
  "recordedAt"      TIMESTAMP     NOT NULL,
  "deviceId"        VARCHAR(100),
  "batteryLevel"    DECIMAL(5,2),
  "signalStrength"  INT,
  "storageUnitId"   UUID          NOT NULL REFERENCES storage_units(id) ON DELETE CASCADE,
  "createdAt"       TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_unit_time
  ON sensor_readings ("storageUnitId", "recordedAt");

-- ── 5. Market Data ──
CREATE TABLE IF NOT EXISTS market_data (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  price           DECIMAL(12,2)  NOT NULL,
  currency        VARCHAR(10)    NOT NULL DEFAULT 'KES',
  market          VARCHAR(255),
  source          VARCHAR(100),
  "recordedAt"    TIMESTAMP      NOT NULL,
  "commodityId"   UUID           NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
  "createdAt"     TIMESTAMP      NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_data_commodity_time
  ON market_data ("commodityId", "recordedAt");

-- ── 6. Alerts ──
CREATE TABLE IF NOT EXISTS alerts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type              VARCHAR(50)   NOT NULL,
  severity          VARCHAR(20)   NOT NULL,
  message           TEXT          NOT NULL,
  data              JSONB,
  "isRead"          BOOLEAN       NOT NULL DEFAULT false,
  "isSent"          BOOLEAN       NOT NULL DEFAULT false,
  channel           VARCHAR(20)   NOT NULL DEFAULT 'push',
  "userId"          UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "storageUnitId"   UUID          REFERENCES storage_units(id) ON DELETE SET NULL,
  "createdAt"       TIMESTAMP     NOT NULL DEFAULT now()
);

-- ── 7. Prediction Logs ──
CREATE TABLE IF NOT EXISTS prediction_logs (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type                        VARCHAR(50)   NOT NULL,
  "riskLevel"                 VARCHAR(20)   NOT NULL,
  "confidenceScore"           DECIMAL(5,2),
  "estimatedDaysToSpoilage"   INT,
  recommendation              VARCHAR(50),
  reasoning                   TEXT,
  "inputData"                 JSONB,
  "storageUnitId"             UUID          NOT NULL REFERENCES storage_units(id) ON DELETE CASCADE,
  "createdAt"                 TIMESTAMP     NOT NULL DEFAULT now()
);

-- ============================================
-- Auto-update "updatedAt" trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_commodities_updated_at
  BEFORE UPDATE ON commodities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_storage_units_updated_at
  BEFORE UPDATE ON storage_units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
