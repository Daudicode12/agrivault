/**
 * Generate Market Data for a Specific Commodity
 *
 * Usage: node src/seeds/generateCommodityPrices.js "Commodity Name"
 * Example: node src/seeds/generateCommodityPrices.js "Groundnuts"
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const { supabase } = require("../config/supabase");

// Default price config for new commodities
const DEFAULT_CONFIG = {
  base: 5000,
  volatility: 0.03,
  unit: "bag (90kg)",
};

// Default seasonal pattern (neutral)
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
        source: "seed",
        recordedAt: date.toISOString(),
      });
    }
  }

  return entries;
}

async function generateForCommodity(commodityName) {
  console.log(`\nGenerating market data for: ${commodityName}\n`);

  // Find commodity
  const { data: commodity, error: fetchErr } = await supabase
    .from("agro_commodities")
    .select("id, name")
    .ilike("name", commodityName)
    .maybeSingle();

  if (fetchErr || !commodity) {
    console.error(`Commodity "${commodityName}" not found.`);
    console.log("\nAvailable commodities:");
    const { data: all } = await supabase.from("agro_commodities").select("name");
    all?.forEach((c) => console.log(`  - ${c.name}`));
    process.exit(1);
  }

  console.log(`Found: ${commodity.name} (ID: ${commodity.id})`);

  // Check existing data
  const { data: existing } = await supabase
    .from("agro_market_data")
    .select("id")
    .eq("commodityId", commodity.id)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`\nWarning: Market data already exists for ${commodity.name}.`);
    console.log("Delete existing data? (This will remove all price records)");
    console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    await supabase
      .from("agro_market_data")
      .delete()
      .eq("commodityId", commodity.id);
    console.log("Existing data deleted.\n");
  }

  // Generate prices
  const entries = generatePriceHistory(DEFAULT_CONFIG, DEFAULT_SEASONAL, 180);
  console.log(`Generated ${entries.length} price records (180 days)\n`);

  // Insert in batches
  let inserted = 0;
  for (let i = 0; i < entries.length; i += 50) {
    const batch = entries.slice(i, i + 50).map((e) => ({
      ...e,
      commodityId: commodity.id,
    }));

    const { error } = await supabase.from("agro_market_data").insert(batch);
    if (error) {
      console.error("Insert error:", error.message);
      process.exit(1);
    }
    inserted += batch.length;
  }

  console.log(`✓ Successfully inserted ${inserted} price records for ${commodity.name}`);
  console.log("\nYou can now view market analysis for this commodity!");
  process.exit(0);
}

const commodityName = process.argv[2];

if (!commodityName) {
  console.log("Usage: node src/seeds/generateCommodityPrices.js \"Commodity Name\"");
  console.log('Example: node src/seeds/generateCommodityPrices.js "Groundnuts"');
  process.exit(1);
}

generateForCommodity(commodityName).catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
