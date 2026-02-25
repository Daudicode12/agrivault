/**
 * KNBS Price Service
 *
 * Fetches real commodity prices from KNBS and stores them in agro_market_data.
 * Used when:
 *  - A farmer adds a new commodity (auto-fetch background prices)
 *  - Market analysis is requested but no price data exists
 *  - Scheduled price updates run
 */

const path = require("path");
const { supabase } = require("../config/supabase");

const scraperPath = path.resolve(__dirname, "../../../market-engine/scrapers");
const KNBSScraper = require(path.join(scraperPath, "knbs"));
const { loadCommodityMap, ingestEntries } = require(scraperPath);

// County → market town mapping for Kenya
const COUNTY_MARKETS = {
  nairobi: ["Nairobi"],
  mombasa: ["Mombasa"],
  kisumu: ["Kisumu"],
  nakuru: ["Nakuru"],
  "uasin gishu": ["Eldoret"],
  kiambu: ["Thika", "Kiambu"],
  machakos: ["Machakos"],
  meru: ["Meru"],
  nyeri: ["Nyeri"],
  bungoma: ["Bungoma"],
  kakamega: ["Kakamega"],
  garissa: ["Garissa"],
  embu: ["Embu"],
  laikipia: ["Nanyuki"],
  narok: ["Narok"],
  kericho: ["Kericho"],
  nyandarua: ["Naivasha"],
  kajiado: ["Kajiado"],
  kilifi: ["Kilifi"],
  trans_nzoia: ["Kitale"],
};

/**
 * Fetch KNBS prices for a specific commodity and ingest them into the database.
 * Returns the count of new entries inserted.
 */
async function fetchKNBSPricesForCommodity(commodityName) {
  console.log(`[KNBS] Fetching prices for "${commodityName}"...`);

  try {
    const scraper = new KNBSScraper({ timeout: 30000 });
    const allEntries = await scraper.fetch();

    // Filter entries matching the target commodity
    const matching = allEntries.filter(
      (e) =>
        (e.commodityName || "").toLowerCase() === commodityName.toLowerCase()
    );

    if (matching.length === 0) {
      console.log(`[KNBS] No entries found for "${commodityName}"`);
      return { inserted: 0, message: "No KNBS data found for this commodity" };
    }

    // Load commodity map and ingest
    const commodityMap = await loadCommodityMap();
    const stats = await ingestEntries(matching, commodityMap);

    console.log(
      `[KNBS] Ingested ${stats.inserted} entries for "${commodityName}" (${stats.duplicates} duplicates skipped)`
    );
    return stats;
  } catch (err) {
    console.error(`[KNBS] Error fetching prices for "${commodityName}":`, err.message);
    return { inserted: 0, error: err.message };
  }
}

/**
 * Ensure real market data exists for a commodity.
 * Unlike the old auto-generate approach, this tries to fetch from KNBS.
 * Returns info about what happened.
 */
async function ensureRealMarketData(commodityId) {
  // Check existing data count
  const { data: existing, error: countErr } = await supabase
    .from("agro_market_data")
    .select("id, source")
    .eq("commodityId", commodityId)
    .limit(5);

  if (countErr) {
    console.error("[KNBS] Error checking existing data:", countErr.message);
    return { hasData: false, error: countErr.message };
  }

  // If we have enough real data, skip
  if (existing && existing.length >= 5) {
    return { hasData: true, count: existing.length, source: "existing" };
  }

  // Look up commodity name
  const { data: commodity } = await supabase
    .from("agro_commodities")
    .select("name")
    .eq("id", commodityId)
    .maybeSingle();

  if (!commodity) {
    return { hasData: false, error: "Commodity not found" };
  }

  // Try to fetch from KNBS
  const result = await fetchKNBSPricesForCommodity(commodity.name);
  return {
    hasData: result.inserted > 0,
    count: result.inserted,
    source: "KNBS",
    ...result,
  };
}

/**
 * Get the latest price for a commodity in a specific market/county.
 */
async function getLatestPrice(commodityId, { market, county } = {}) {
  let query = supabase
    .from("agro_market_data")
    .select("price, market, county, source, recordedAt, currency")
    .eq("commodityId", commodityId)
    .order("recordedAt", { ascending: false })
    .limit(1);

  if (market) query = query.ilike("market", `%${market}%`);
  if (county) query = query.ilike("county", `%${county}%`);

  const { data, error } = await query;
  if (error || !data || data.length === 0) return null;
  return data[0];
}

/**
 * Get prices for a commodity across all markets in a county.
 */
async function getPricesByCounty(commodityId, county) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);

  // Try county column first, then market name
  let { data, error } = await supabase
    .from("agro_market_data")
    .select("price, market, county, source, recordedAt, currency")
    .eq("commodityId", commodityId)
    .gte("recordedAt", fromDate.toISOString())
    .order("recordedAt", { ascending: false });

  if (error) return [];

  // Filter by county (checking both county column and market name)
  if (county && county.toLowerCase() !== "all counties") {
    const countyLower = county.toLowerCase();
    const countyMarkets = COUNTY_MARKETS[countyLower] || [];

    data = (data || []).filter((d) => {
      const matchCounty = (d.county || "").toLowerCase().includes(countyLower);
      const matchMarket = countyMarkets.some((m) =>
        (d.market || "").toLowerCase().includes(m.toLowerCase())
      );
      return matchCounty || matchMarket;
    });
  }

  return data || [];
}

/**
 * Clean up any auto-generated/seed data and replace with note about KNBS.
 * Call once to migrate from dummy data.
 */
async function cleanupDummyData() {
  const sources = ["auto_generated", "seed", "auto_update"];

  for (const source of sources) {
    const { data, error } = await supabase
      .from("agro_market_data")
      .delete()
      .eq("source", source)
      .select("id");

    if (error) {
      console.error(`[Cleanup] Error removing ${source} data:`, error.message);
    } else {
      console.log(`[Cleanup] Removed ${data?.length || 0} ${source} entries`);
    }
  }
}

module.exports = {
  fetchKNBSPricesForCommodity,
  ensureRealMarketData,
  getLatestPrice,
  getPricesByCounty,
  cleanupDummyData,
  COUNTY_MARKETS,
};
