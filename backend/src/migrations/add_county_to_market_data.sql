-- Migration: Add county field to market data
-- This allows farmers to filter market prices by their county

ALTER TABLE agro_market_data 
ADD COLUMN IF NOT EXISTS county VARCHAR(100);

-- Create index for faster county-based queries
CREATE INDEX IF NOT EXISTS idx_market_data_county 
  ON agro_market_data (county);

-- Create composite index for commodity + county queries
CREATE INDEX IF NOT EXISTS idx_market_data_commodity_county 
  ON agro_market_data ("commodityId", county, "recordedAt");

COMMENT ON COLUMN agro_market_data.county IS 'County/region where the price was recorded (e.g., Nairobi, Kiambu, Nakuru)';
