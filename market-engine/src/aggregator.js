/**
 * AgroVault Market Data Aggregator
 *
 * Fetches market data from Supabase, runs analysis for all commodities,
 * and stores results. Called by the cron scheduler.
 */

const { supabase, config } = require("./config");
const { analyzeTrend, forecastPrices, analyzeSeasonalTiming, getSeasonalFactors, generateRecommendation } = require("../analysis");

/**
 * Fetch price history for a commodity from Supabase.
 */
async function fetchPriceHistory(commodityId, lookbackDays = 365) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - lookbackDays);

  const { data, error } = await supabase
    .from("agro_market_data")
    .select("price, recordedAt")
    .eq("commodityId", commodityId)
    .gte("recordedAt", fromDate.toISOString())
    .order("recordedAt", { ascending: true });

  if (error) {
    console.error(`Error fetching prices for commodity ${commodityId}:`, error.message);
    return [];
  }

  return data || [];
}

/**
 * Fetch all commodities.
 */
async function fetchCommodities() {
  const { data, error } = await supabase
    .from("agro_commodities")
    .select("id, name, category, maxStorageDays");

  if (error) {
    console.error("Error fetching commodities:", error.message);
    return [];
  }

  return data || [];
}

/**
 * Store an analysis snapshot in the database.
 */
async function storeAnalysisSnapshot(commodityId, analysisType, result) {
  const { error } = await supabase.from("agro_market_analysis").insert({
    commodityId,
    analysisType,
    result,
    generatedAt: new Date().toISOString(),
  });

  if (error) {
    // Table may not exist yet — log but don't crash
    if (error.message.includes("relation") || error.code === "42P01") {
      console.warn("agro_market_analysis table not found — skipping storage. Run the migration first.");
      return false;
    }
    console.error("Error storing analysis:", error.message);
    return false;
  }
  return true;
}

/**
 * Run full analysis for a single commodity.
 */
async function analyzeOneCommodity(commodity) {
  const { id, name } = commodity;
  console.log(`  Analyzing: ${name}`);

  const prices = await fetchPriceHistory(id);

  if (prices.length < config.analysis.minDataPointsForAnalysis) {
    console.log(`    Skipping ${name}: only ${prices.length} data points (need ${config.analysis.minDataPointsForAnalysis})`);
    return null;
  }

  // Run trend analysis
  const trend = analyzeTrend(prices, {
    smaWindows: config.analysis.smaWindows,
    emaSpan: config.analysis.emaSpan,
    volatilityWindow: config.analysis.volatilityWindow,
  });

  // Get seasonal factors
  const seasonal = getSeasonalFactors(name, prices);

  // Run forecast
  let forecast = null;
  if (prices.length >= config.analysis.minDataPointsForForecast) {
    forecast = forecastPrices(prices, config.analysis.forecastHorizonDays, seasonal.factors);
  }

  // Seasonal timing
  const seasonalTiming = analyzeSeasonalTiming(name, prices);

  // Generate recommendation
  const recommendation = generateRecommendation({
    prices,
    commodityName: name,
    storageInfo: null, // No specific storage unit context in batch mode
  });

  const result = {
    commodityId: id,
    commodityName: name,
    trend: trend.error ? null : {
      direction: trend.trend,
      currentPrice: trend.currentPrice,
      movingAverages: trend.movingAverages,
      momentum: trend.momentum,
      volatility: trend.volatility,
      priceRange: trend.priceRange,
      dataPoints: trend.dataPoints,
    },
    forecast: forecast?.error ? null : forecast,
    seasonal: seasonalTiming,
    recommendation: {
      action: recommendation.recommendation,
      urgency: recommendation.urgency,
      confidence: recommendation.confidence,
      summary: recommendation.summary,
      compositeScore: recommendation.compositeScore,
    },
    analyzedAt: new Date().toISOString(),
  };

  // Store snapshot
  await storeAnalysisSnapshot(id, "full", result);

  return result;
}

/**
 * Run analysis for ALL commodities. Called by the cron scheduler.
 */
async function runFullAnalysis() {
  console.log("\n=== AgroVault Market Analysis Run ===");
  console.log(`Time: ${new Date().toISOString()}\n`);

  const commodities = await fetchCommodities();
  if (commodities.length === 0) {
    console.log("No commodities found. Seed the database first.");
    return [];
  }

  console.log(`Found ${commodities.length} commodities to analyze.\n`);

  const results = [];
  for (const commodity of commodities) {
    try {
      const result = await analyzeOneCommodity(commodity);
      if (result) results.push(result);
    } catch (err) {
      console.error(`  Error analyzing ${commodity.name}:`, err.message);
    }
  }

  console.log(`\nAnalysis complete. ${results.length}/${commodities.length} commodities analyzed.`);

  // Print summary table
  if (results.length > 0) {
    console.log("\n--- Recommendations Summary ---");
    for (const r of results) {
      const rec = r.recommendation;
      const price = r.trend?.currentPrice ? `KES ${r.trend.currentPrice}` : "N/A";
      console.log(`  ${r.commodityName.padEnd(20)} ${price.padEnd(14)} ${rec.action.padEnd(18)} [${rec.urgency}]`);
    }
    console.log("");
  }

  return results;
}

/**
 * Run analysis for a specific commodity (called by API).
 */
async function analyzeCommodityById(commodityId) {
  const { data: commodity, error } = await supabase
    .from("agro_commodities")
    .select("id, name, category, maxStorageDays")
    .eq("id", commodityId)
    .maybeSingle();

  if (error || !commodity) {
    return { error: "Commodity not found" };
  }

  return analyzeOneCommodity(commodity);
}

/**
 * Generate a sell/hold recommendation with storage context.
 * Called when a farmer checks a specific storage unit.
 */
async function recommendForStorageUnit(storageUnitId) {
  // Fetch storage unit with commodity info
  const { data: unit, error: unitErr } = await supabase
    .from("agro_storage_units")
    .select("*, commodity:agro_commodities(*)")
    .eq("id", storageUnitId)
    .maybeSingle();

  if (unitErr || !unit) {
    return { error: "Storage unit not found" };
  }

  if (!unit.commodityId) {
    return { error: "No commodity assigned to this storage unit" };
  }

  // Fetch price history
  const prices = await fetchPriceHistory(unit.commodityId);

  if (prices.length < config.analysis.minDataPointsForAnalysis) {
    return {
      error: `Insufficient market data (${prices.length} records). Need at least ${config.analysis.minDataPointsForAnalysis}.`,
    };
  }

  // Check for spoilage risk from recent predictions
  let spoilageRisk = null;
  const { data: recentPrediction } = await supabase
    .from("prediction_logs")
    .select("riskLevel, estimatedDaysToSpoilage")
    .eq("storageUnitId", storageUnitId)
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentPrediction) {
    spoilageRisk = recentPrediction.riskLevel?.toLowerCase() || null;
  }

  // Calculate days in storage
  const daysInStorage = unit.createdAt
    ? Math.floor((Date.now() - new Date(unit.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const storageInfo = {
    daysInStorage,
    maxStorageDays: unit.commodity?.maxStorageDays || 365,
    currentStockKg: unit.currentStockKg || 0,
    spoilageRisk,
  };

  return generateRecommendation({
    prices,
    commodityName: unit.commodity?.name || "Unknown",
    storageInfo,
  });
}

module.exports = {
  fetchPriceHistory,
  fetchCommodities,
  runFullAnalysis,
  analyzeCommodityById,
  recommendForStorageUnit,
};
