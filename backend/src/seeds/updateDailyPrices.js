/**
 * Daily Price Updater
 *
 * Generates new price data for today for all commodities.
 * Run this daily via cron to keep market data current.
 *
 * Usage: node src/seeds/updateDailyPrices.js
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const { supabase } = require("../config/supabase");

// Base prices per unit (KES) for Kenyan commodities
const COMMODITY_PRICES = {
  Maize: { base: 3800, volatility: 0.03, unit: "bag (90kg)" },
  Wheat: { base: 4200, volatility: 0.025, unit: "bag (90kg)" },
  Rice: { base: 7500, volatility: 0.02, unit: "bag (50kg)" },
  Beans: { base: 8500, volatility: 0.04, unit: "bag (90kg)" },
  Sorghum: { base: 3200, volatility: 0.03, unit: "bag (90kg)" },
  "Irish Potatoes": { base: 55, volatility: 0.05, unit: "kg" },
  "Coffee (dried)": { base: 450, volatility: 0.02, unit: "kg" },
};

// Seasonal multipliers by month (1-12)
const SEASONAL = {
  Maize: [0.98, 1.0, 1.05, 1.08, 1.10, 1.03, 0.95, 0.90, 0.88, 0.93, 0.98, 1.02],
  Wheat: [0.97, 0.98, 1.02, 1.05, 1.06, 1.03, 0.98, 0.94, 0.92, 0.95, 0.99, 1.01],
  Beans: [0.95, 0.93, 1.02, 1.08, 1.12, 1.05, 0.96, 0.90, 0.92, 0.97, 1.04, 1.06],
  Rice: [0.98, 0.97, 1.0, 1.03, 1.05, 1.02, 0.99, 0.96, 0.95, 0.97, 1.0, 1.02],
  Sorghum: [0.97, 0.99, 1.04, 1.07, 1.09, 1.02, 0.95, 0.91, 0.89, 0.94, 0.99, 1.01],
  "Irish Potatoes": [1.02, 1.04, 1.06, 1.03, 0.98, 0.94, 0.92, 0.93, 0.96, 1.0, 1.03, 1.05],
  "Coffee (dried)": [1.0, 0.98, 0.97, 0.99, 1.01, 1.02, 1.03, 1.02, 1.0, 0.99, 0.98, 1.0],
};

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

/**
 * Generate today's price for a commodity based on yesterday's price
 */
async function generateTodayPrice(commodityId, commodityName) {
  const config = COMMODITY_PRICES[commodityName];
  if (!config) return null;

  const seasonal = SEASONAL[commodityName] || Array(12).fill(1.0);
  const today = new Date();
  today.setHours(10, 0, 0, 0);
  const month = today.getMonth();

  // Get yesterday's price
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const { data: recentPrices } = await supabase
    .from("agro_market_data")
    .select("price")
    .eq("commodityId", commodityId)
    .gte("recordedAt", yesterday.toISOString())
    .order("recordedAt", { ascending: false })
    .limit(1);

  let price = recentPrices && recentPrices.length > 0 
    ? recentPrices[0].price 
    : config.base;

  // Apply seasonal factor
  const seasonalPrice = config.base * seasonal[month];

  // Random walk with mean reversion
  const drift = (seasonalPrice - price) * 0.05;
  const shock = gaussianRandom() * config.volatility * config.base;
  price = Math.max(price * 0.5, price + drift + shock);
  price = parseFloat(price.toFixed(2));

  // Generate 2-4 market entries for today
  const numEntries = Math.floor(Math.random() * 3) + 2;
  const entries = [];
  const usedMarkets = new Set();

  for (let i = 0; i < numEntries; i++) {
    let marketInfo;
    do {
      marketInfo = MARKETS[Math.floor(Math.random() * MARKETS.length)];
    } while (usedMarkets.has(marketInfo.name) && usedMarkets.size < MARKETS.length);
    
    usedMarkets.add(marketInfo.name);

    // Slight price variation between markets
    const marketPrice = price * (1 + (Math.random() - 0.5) * 0.02);

    entries.push({
      commodityId,
      price: parseFloat(marketPrice.toFixed(2)),
      currency: "KES",
      market: marketInfo.name,
      county: marketInfo.county,
      source: "auto_update",
      recordedAt: today.toISOString(),
    });
  }

  return entries;
}

async function updateDailyPrices() {
  console.log("AgroVault Daily Price Updater");
  console.log("=============================\n");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  console.log(`Updating prices for: ${today.toDateString()}\n`);

  // Fetch commodities
  const { data: commodities, error: fetchErr } = await supabase
    .from("agro_commodities")
    .select("id, name");

  if (fetchErr) {
    console.error("Error fetching commodities:", fetchErr.message);
    process.exit(1);
  }

  if (!commodities || commodities.length === 0) {
    console.log("No commodities found.");
    process.exit(1);
  }

  let totalInserted = 0;

  for (const commodity of commodities) {
    // Check if we already have data for today
    const { data: existing } = await supabase
      .from("agro_market_data")
      .select("id")
      .eq("commodityId", commodity.id)
      .gte("recordedAt", today.toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`  ${commodity.name}: Already updated today — skipping`);
      continue;
    }

    const entries = await generateTodayPrice(commodity.id, commodity.name);

    if (!entries || entries.length === 0) {
      console.log(`  ${commodity.name}: No price config — skipping`);
      continue;
    }

    const { error } = await supabase.from("agro_market_data").insert(entries);

    if (error) {
      console.error(`  ${commodity.name}: Insert error:`, error.message);
      continue;
    }

    console.log(`  ${commodity.name}: ${entries.length} price records added`);
    totalInserted += entries.length;
  }

  console.log(`\nDaily update complete! ${totalInserted} total records added.`);
  process.exit(0);
}

updateDailyPrices().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
