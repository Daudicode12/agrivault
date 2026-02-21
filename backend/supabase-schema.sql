-- ============================================
-- AgroVault Database Schema for Supabase
-- Copy and paste this into the Supabase SQL Editor
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Create the agrovault schema ──
CREATE SCHEMA IF NOT EXISTS agrovault;

-- ── Grant access to Supabase roles ──
GRANT USAGE ON SCHEMA agrovault TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA agrovault TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA agrovault TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA agrovault TO anon, authenticated, service_role;

-- Auto-grant on future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA agrovault GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA agrovault GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA agrovault GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ── 1. Users ──
CREATE TABLE agrovault.users (
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
CREATE TABLE agrovault.commodities (
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
CREATE TABLE agrovault.storage_units (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(150)    NOT NULL,
  location        VARCHAR(255),
  "capacityKg"    DECIMAL(10,2),
  "currentStockKg" DECIMAL(10,2),
  status          VARCHAR         NOT NULL DEFAULT 'active',
  "deviceId"      VARCHAR(100),
  "deviceApiKey"  VARCHAR(100),
  "ownerId"       UUID            NOT NULL REFERENCES agrovault.users(id) ON DELETE CASCADE,
  "commodityId"   UUID            REFERENCES agrovault.commodities(id),
  "createdAt"     TIMESTAMP       NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMP       NOT NULL DEFAULT now()
);

-- ── 4. Sensor Readings ──
CREATE TABLE agrovault.sensor_readings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  temperature       DECIMAL(5,2)  NOT NULL,
  humidity          DECIMAL(5,2)  NOT NULL,
  "recordedAt"      TIMESTAMP     NOT NULL,
  "deviceId"        VARCHAR(100),
  "batteryLevel"    DECIMAL(5,2),
  "signalStrength"  INT,
  "storageUnitId"   UUID          NOT NULL REFERENCES agrovault.storage_units(id) ON DELETE CASCADE,
  "createdAt"       TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE INDEX idx_sensor_readings_unit_time
  ON agrovault.sensor_readings ("storageUnitId", "recordedAt");

-- ── 5. Market Data ──
CREATE TABLE agrovault.market_data (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  price           DECIMAL(12,2)  NOT NULL,
  currency        VARCHAR(10)    NOT NULL DEFAULT 'KES',
  market          VARCHAR(255),
  source          VARCHAR(100),
  "recordedAt"    TIMESTAMP      NOT NULL,
  "commodityId"   UUID           NOT NULL REFERENCES agrovault.commodities(id) ON DELETE CASCADE,
  "createdAt"     TIMESTAMP      NOT NULL DEFAULT now()
);

CREATE INDEX idx_market_data_commodity_time
  ON agrovault.market_data ("commodityId", "recordedAt");

-- ── 6. Alerts ──
CREATE TABLE agrovault.alerts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type              VARCHAR(50)   NOT NULL,
  severity          VARCHAR(20)   NOT NULL,
  message           TEXT          NOT NULL,
  data              JSONB,
  "isRead"          BOOLEAN       NOT NULL DEFAULT false,
  "isSent"          BOOLEAN       NOT NULL DEFAULT false,
  channel           VARCHAR(20)   NOT NULL DEFAULT 'push',
  "userId"          UUID          NOT NULL REFERENCES agrovault.users(id) ON DELETE CASCADE,
  "storageUnitId"   UUID          REFERENCES agrovault.storage_units(id) ON DELETE SET NULL,
  "createdAt"       TIMESTAMP     NOT NULL DEFAULT now()
);

-- ── 7. Prediction Logs ──
CREATE TABLE agrovault.prediction_logs (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type                        VARCHAR(50)   NOT NULL,
  "riskLevel"                 VARCHAR(20)   NOT NULL,
  "confidenceScore"           DECIMAL(5,2),
  "estimatedDaysToSpoilage"   INT,
  recommendation              VARCHAR(50),
  reasoning                   TEXT,
  "inputData"                 JSONB,
  "storageUnitId"             UUID          NOT NULL REFERENCES agrovault.storage_units(id) ON DELETE CASCADE,
  "createdAt"                 TIMESTAMP     NOT NULL DEFAULT now()
);

-- ============================================
-- Optional: updatedAt auto-update trigger
-- Automatically sets updatedAt on row update
-- ============================================
CREATE OR REPLACE FUNCTION agrovault.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON agrovault.users
  FOR EACH ROW EXECUTE FUNCTION agrovault.update_updated_at();

CREATE TRIGGER trg_commodities_updated_at
  BEFORE UPDATE ON agrovault.commodities
  FOR EACH ROW EXECUTE FUNCTION agrovault.update_updated_at();

CREATE TRIGGER trg_storage_units_updated_at
  BEFORE UPDATE ON agrovault.storage_units
  FOR EACH ROW EXECUTE FUNCTION agrovault.update_updated_at();
