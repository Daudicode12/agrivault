/**
 * Market Data Seeder
 *
 * Generates realistic historical price data for all commodities
 * so the analysis engine has data to work with during development.
 *
 * Usage: node src/seeds/seedMarketData.js
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

const MARKETS = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"];

function gaussianRandom() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Generate price entries for one commodity over the last N days.
 */
function generatePriceHistory(commodityName, days = 180) {
  const config = COMMODITY_PRICES[commodityName];
  if (!config) return [];

  const seasonal = SEASONAL[commodityName] || Array(12).fill(1.0);
  const entries = [];
  let price = config.base;

  for (let d = days; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const month = date.getMonth(); // 0-indexed

    // Apply seasonal factor
    const seasonalPrice = config.base * seasonal[month];

    // Random walk with mean reversion to seasonal price
    const drift = (seasonalPrice - price) * 0.05; // Mean reversion strength
    const shock = gaussianRandom() * config.volatility * config.base;
    price = Math.max(price * 0.5, price + drift + shock); // Floor at 50% of base
    price = parseFloat(price.toFixed(2));

    // Not every day has a data point (simulate market days ~5/week)
    if (Math.random() < 0.7) {
      const market = MARKETS[Math.floor(Math.random() * MARKETS.length)];
      entries.push({
        price,
        currency: "KES",
        market,
        source: "seed",
        recordedAt: date.toISOString(),
      });
    }
  }

  return entries;
}

async function seedMarketData() {
  console.log("AgroVault Market Data Seeder");
  console.log("============================\n");

  // Fetch commodities
  const { data: commodities, error: fetchErr } = await supabase
    .from("agro_commodities")
    .select("id, name");

  if (fetchErr) {
    console.error("Error fetching commodities:", fetchErr.message);
    console.log("Make sure you've run the seed first: npm run seed");
    process.exit(1);
  }

  if (!commodities || commodities.length === 0) {
    console.log("No commodities found. Run the main seed first.");
    process.exit(1);
  }

  console.log(`Found ${commodities.length} commodities.\n`);

  for (const commodity of commodities) {
    const entries = generatePriceHistory(commodity.name, 180);

    if (entries.length === 0) {
      console.log(`  ${commodity.name}: No price config — skipping`);
      continue;
    }

    // Delete existing seed data for clean re-seed
    await supabase
      .from("agro_market_data")
      .delete()
      .eq("commodityId", commodity.id)
      .eq("source", "seed");

    // Insert in batches of 50
    let inserted = 0;
    for (let i = 0; i < entries.length; i += 50) {
      const batch = entries.slice(i, i + 50).map((e) => ({
        ...e,
        commodityId: commodity.id,
      }));

      const { error } = await supabase.from("agro_market_data").insert(batch);
      if (error) {
        console.error(`  ${commodity.name}: Insert error:`, error.message);
        break;
      }
      inserted += batch.length;
    }

    console.log(`  ${commodity.name}: ${inserted} price records seeded (180 days)`);
  }

  console.log("\nMarket data seeding complete!");
  process.exit(0);
}

seedMarketData().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
