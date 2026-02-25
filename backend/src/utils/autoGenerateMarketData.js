/**
 * Auto-generate market data for commodities without price history
 */

const { supabase } = require("../config/supabase");

const DEFAULT_CONFIG = {
  base: 5000,
  volatility: 0.03,
};

const DEFAULT_SEASONAL = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];

const MARKETS = [
  { name: "Nairobi", county: "Nairobi" },
  { name: "Mombasa", county: "Mombasa" },
  { name: "Kisumu", county: "Kisumu" },
  { name: "Nakuru", county: "Nakuru" },
  { name: "Eldoret", county: "Uasin Gishu" },
  { name: "Kiambu", county: "Kiambu" },
  { name: "Machakos", county: "Machakos" },
];

function gaussianRandom() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function generatePriceHistory(config, seasonal, days = 180) {
  const entries = [];
  let price = config.base;

  for (let d = days; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    date.setHours(10, 0, 0, 0);
    const month = date.getMonth();

    const seasonalPrice = config.base * seasonal[month];
    const drift = (seasonalPrice - price) * 0.05;
    const shock = gaussianRandom() * config.volatility * config.base;
    price = Math.max(price * 0.5, price + drift + shock);
    price = parseFloat(price.toFixed(2));

    if (Math.random() < 0.7) {
      const marketInfo = MARKETS[Math.floor(Math.random() * MARKETS.length)];
      entries.push({
        price,
        currency: "KES",
        market: marketInfo.name,
        county: marketInfo.county,
        source: "auto_generated",
        recordedAt: date.toISOString(),
      });
    }
  }

  return entries;
}

/**
 * Check if commodity has market data, generate if missing
 */
async function ensureMarketData(commodityId) {
  // Check if data exists
  const { data: existing } = await supabase
    .from("agro_market_data")
    .select("id")
    .eq("commodityId", commodityId)
    .limit(1);

  if (existing && existing.length > 0) {
    return { generated: false, message: "Data already exists" };
  }

  // Generate data
  const entries = generatePriceHistory(DEFAULT_CONFIG, DEFAULT_SEASONAL, 180);

  // Insert in batches
  let inserted = 0;
  for (let i = 0; i < entries.length; i += 50) {
    const batch = entries.slice(i, i + 50).map((e) => ({
      ...e,
      commodityId,
    }));

    const { error } = await supabase.from("agro_market_data").insert(batch);
    if (error) {
      console.error("Auto-generate error:", error.message);
      return { generated: false, error: error.message };
    }
    inserted += batch.length;
  }

  console.log(`✓ Auto-generated ${inserted} price records for commodity ${commodityId}`);
  return { generated: true, count: inserted };
}

module.exports = { ensureMarketData };
