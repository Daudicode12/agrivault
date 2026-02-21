-- ============================================
-- AgroVault Database Schema for Supabase
-- Uses the default "public" schema
-- Includes Row Level Security (RLS) + Policies
-- Copy and paste this into the Supabase SQL Editor
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- ── 1. Users ──
CREATE TABLE IF NOT EXISTS agro_users (
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
CREATE TABLE IF NOT EXISTS agro_commodities (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                 VARCHAR(100)     NOT NULL UNIQUE,
  category             VARCHAR(50),
  "optimalTempMin"     DECIMAL(5,2),
  "optimalTempMax"     DECIMAL(5,2),
  "optimalHumidityMin" DECIMAL(5,2),
  "optimalHumidityMax" DECIMAL(5,2),
  "maxStorageDays"     INT,
  unit                 VARCHAR(50),
  "createdAt"          TIMESTAMP        NOT NULL DEFAULT now(),
  "updatedAt"          TIMESTAMP        NOT NULL DEFAULT now()
);

-- ── 3. Storage Units ──
CREATE TABLE IF NOT EXISTS agro_storage_units (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(150)    NOT NULL,
  location         VARCHAR(255),
  "capacityKg"     DECIMAL(10,2),
  "currentStockKg" DECIMAL(10,2),
  status           VARCHAR         NOT NULL DEFAULT 'active',
  "deviceId"       VARCHAR(100),
  "deviceApiKey"   VARCHAR(100),
  "ownerId"        UUID            NOT NULL REFERENCES agro_users(id) ON DELETE CASCADE,
  "commodityId"    UUID            REFERENCES agro_commodities(id),
  "createdAt"      TIMESTAMP       NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMP       NOT NULL DEFAULT now()
);

-- ── 4. Sensor Readings ──
CREATE TABLE IF NOT EXISTS agro_sensor_readings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  temperature       DECIMAL(5,2)  NOT NULL,
  humidity          DECIMAL(5,2)  NOT NULL,
  "recordedAt"      TIMESTAMP     NOT NULL,
  "deviceId"        VARCHAR(100),
  "batteryLevel"    DECIMAL(5,2),
  "signalStrength"  INT,
  "storageUnitId"   UUID          NOT NULL REFERENCES agro_storage_units(id) ON DELETE CASCADE,
  "createdAt"       TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_unit_time
  ON agro_sensor_readings ("storageUnitId", "recordedAt");

-- ── 5. Market Data ──
CREATE TABLE IF NOT EXISTS agro_market_data (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  price           DECIMAL(12,2)  NOT NULL,
  currency        VARCHAR(10)    NOT NULL DEFAULT 'KES',
  market          VARCHAR(255),
  source          VARCHAR(100),
  "recordedAt"    TIMESTAMP      NOT NULL,
  "commodityId"   UUID           NOT NULL REFERENCES agro_commodities(id) ON DELETE CASCADE,
  "createdAt"     TIMESTAMP      NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_data_commodity_time
  ON agro_market_data ("commodityId", "recordedAt");

-- ── 6. Alerts ──
CREATE TABLE IF NOT EXISTS agro_alerts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type              VARCHAR(50)   NOT NULL,
  severity          VARCHAR(20)   NOT NULL,
  message           TEXT          NOT NULL,
  data              JSONB,
  "isRead"          BOOLEAN       NOT NULL DEFAULT false,
  "isSent"          BOOLEAN       NOT NULL DEFAULT false,
  channel           VARCHAR(20)   NOT NULL DEFAULT 'push',
  "userId"          UUID          NOT NULL REFERENCES agro_users(id) ON DELETE CASCADE,
  "storageUnitId"   UUID          REFERENCES agro_storage_units(id) ON DELETE SET NULL,
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
  "storageUnitId"             UUID          NOT NULL REFERENCES agro_storage_units(id) ON DELETE CASCADE,
  "createdAt"                 TIMESTAMP     NOT NULL DEFAULT now()
);

-- ============================================
-- AUTO-UPDATE "updatedAt" TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON agro_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_commodities_updated_at
  BEFORE UPDATE ON agro_commodities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_storage_units_updated_at
  BEFORE UPDATE ON agro_storage_units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS) + POLICIES
-- ============================================
-- The backend uses the service_role key which BYPASSES RLS.
-- These policies protect data when accessed via anon/authenticated
-- keys (e.g. a future mobile app hitting Supabase directly).

-- ─────────────────────────────────────────────
-- 1. agro_users
-- ─────────────────────────────────────────────
ALTER TABLE agro_users ENABLE ROW LEVEL SECURITY;

-- Users can read their own row
CREATE POLICY "users_select_own"
  ON agro_users FOR SELECT
  TO authenticated
  USING ( id = auth.uid() );

-- Users can update their own row
CREATE POLICY "users_update_own"
  ON agro_users FOR UPDATE
  TO authenticated
  USING ( id = auth.uid() )
  WITH CHECK ( id = auth.uid() );

-- Anyone can insert (registration) – password is hashed app-side
CREATE POLICY "users_insert_registration"
  ON agro_users FOR INSERT
  TO anon, authenticated
  WITH CHECK ( true );

-- No direct delete – deactivate via isActive flag instead

-- ─────────────────────────────────────────────
-- 2. agro_commodities  (public reference data)
-- ─────────────────────────────────────────────
ALTER TABLE agro_commodities ENABLE ROW LEVEL SECURITY;

-- Anyone can read commodities
CREATE POLICY "commodities_select_all"
  ON agro_commodities FOR SELECT
  TO anon, authenticated
  USING ( true );

-- Authenticated users can insert
CREATE POLICY "commodities_insert_auth"
  ON agro_commodities FOR INSERT
  TO authenticated
  WITH CHECK ( true );

-- Authenticated users can update
CREATE POLICY "commodities_update_auth"
  ON agro_commodities FOR UPDATE
  TO authenticated
  USING ( true )
  WITH CHECK ( true );

-- Authenticated users can delete
CREATE POLICY "commodities_delete_auth"
  ON agro_commodities FOR DELETE
  TO authenticated
  USING ( true );

-- ─────────────────────────────────────────────
-- 3. agro_storage_units  (owner-scoped)
-- ─────────────────────────────────────────────
ALTER TABLE agro_storage_units ENABLE ROW LEVEL SECURITY;

-- Owners can see their own storage units
CREATE POLICY "storage_units_select_own"
  ON agro_storage_units FOR SELECT
  TO authenticated
  USING ( "ownerId" = auth.uid() );

-- Owners can create storage units (ownerId must match uid)
CREATE POLICY "storage_units_insert_own"
  ON agro_storage_units FOR INSERT
  TO authenticated
  WITH CHECK ( "ownerId" = auth.uid() );

-- Owners can update their own storage units
CREATE POLICY "storage_units_update_own"
  ON agro_storage_units FOR UPDATE
  TO authenticated
  USING ( "ownerId" = auth.uid() )
  WITH CHECK ( "ownerId" = auth.uid() );

-- Owners can delete their own storage units
CREATE POLICY "storage_units_delete_own"
  ON agro_storage_units FOR DELETE
  TO authenticated
  USING ( "ownerId" = auth.uid() );

-- ─────────────────────────────────────────────
-- 4. agro_sensor_readings  (scoped via storage unit owner)
-- ─────────────────────────────────────────────
ALTER TABLE agro_sensor_readings ENABLE ROW LEVEL SECURITY;

-- Users can read readings for their own storage units
CREATE POLICY "sensor_readings_select_own"
  ON agro_sensor_readings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agro_storage_units su
      WHERE su.id = "storageUnitId"
        AND su."ownerId" = auth.uid()
    )
  );

-- Authenticated users can insert readings for their own units
-- (devices use service_role which bypasses RLS)
CREATE POLICY "sensor_readings_insert_own"
  ON agro_sensor_readings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agro_storage_units su
      WHERE su.id = "storageUnitId"
        AND su."ownerId" = auth.uid()
    )
  );

-- No update/delete – sensor data is an append-only log

-- ─────────────────────────────────────────────
-- 5. agro_market_data  (public read, auth write)
-- ─────────────────────────────────────────────
ALTER TABLE agro_market_data ENABLE ROW LEVEL SECURITY;

-- Anyone can read market data
CREATE POLICY "market_data_select_all"
  ON agro_market_data FOR SELECT
  TO anon, authenticated
  USING ( true );

-- Authenticated users can insert manual price entries
CREATE POLICY "market_data_insert_auth"
  ON agro_market_data FOR INSERT
  TO authenticated
  WITH CHECK ( true );

-- No update/delete – historical price data is immutable

-- ─────────────────────────────────────────────
-- 6. agro_alerts  (owner-scoped)
-- ─────────────────────────────────────────────
ALTER TABLE agro_alerts ENABLE ROW LEVEL SECURITY;

-- Users can see their own alerts
CREATE POLICY "alerts_select_own"
  ON agro_alerts FOR SELECT
  TO authenticated
  USING ( "userId" = auth.uid() );

-- Users can create their own alerts
CREATE POLICY "alerts_insert_own"
  ON agro_alerts FOR INSERT
  TO authenticated
  WITH CHECK ( "userId" = auth.uid() );

-- Users can update their own alerts (mark as read)
CREATE POLICY "alerts_update_own"
  ON agro_alerts FOR UPDATE
  TO authenticated
  USING ( "userId" = auth.uid() )
  WITH CHECK ( "userId" = auth.uid() );

-- Users can delete their own alerts
CREATE POLICY "alerts_delete_own"
  ON agro_alerts FOR DELETE
  TO authenticated
  USING ( "userId" = auth.uid() );

-- ─────────────────────────────────────────────
-- 7. prediction_logs  (read-only, scoped via storage unit)
-- ─────────────────────────────────────────────
ALTER TABLE prediction_logs ENABLE ROW LEVEL SECURITY;

-- Users can read predictions for their own storage units
CREATE POLICY "prediction_logs_select_own"
  ON prediction_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agro_storage_units su
      WHERE su.id = "storageUnitId"
        AND su."ownerId" = auth.uid()
    )
  );

-- Predictions are created by the backend (service_role only)

-- ============================================
-- GRANT TABLE ACCESS TO SUPABASE ROLES
-- RLS filters rows; these grants allow the
-- roles to reach the tables in the first place.
-- ============================================
GRANT SELECT, INSERT, UPDATE        ON agro_users           TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON agro_commodities     TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON agro_storage_units   TO anon, authenticated;
GRANT SELECT, INSERT                ON agro_sensor_readings  TO anon, authenticated;
GRANT SELECT, INSERT                ON agro_market_data      TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON agro_alerts          TO anon, authenticated;
GRANT SELECT                        ON prediction_logs       TO anon, authenticated;
