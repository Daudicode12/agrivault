/**
 * Market Analysis Service
 *
 * Provides market analysis capabilities to the backend API.
 * Imports analysis modules from the market-engine package.
 */

const path = require("path");
const { supabase } = require("../config/supabase");

// Import analysis modules from market-engine
const analysisPath = path.resolve(__dirname, "../../../market-engine/analysis");
const { analyzeTrend, forecastPrices, analyzeSeasonalTiming, getSeasonalFactors, generateRecommendation } = require(analysisPath);

/**
 * Fetch price history for a commodity.
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

  if (error) throw new Error(`Failed to fetch price history: ${error.message}`);
  return data || [];
}

/**
 * Get full market analysis for a commodity.
 */
async function getMarketAnalysis(commodityId) {
  // Verify commodity exists
  const { data: commodity, error: commErr } = await supabase
    .from("agro_commodities")
    .select("id, name, category, maxStorageDays")
    .eq("id", commodityId)
    .maybeSingle();

  if (commErr || !commodity) {
    return { error: "Commodity not found" };
  }

  const prices = await fetchPriceHistory(commodityId);

  if (prices.length < 5) {
    return {
      error: `Insufficient market data for ${commodity.name}. Only ${prices.length} records found. Need at least 5.`,
      commodity,
      dataPoints: prices.length,
    };
  }

  // Trend analysis
  const trend = analyzeTrend(prices);

  // Seasonal analysis
  const seasonal = analyzeSeasonalTiming(commodity.name, prices);
  const seasonalFactors = getSeasonalFactors(commodity.name, prices);

  // Forecast
  let forecast = null;
  if (prices.length >= 14) {
    forecast = forecastPrices(prices, 30, seasonalFactors.factors);
  }

  return {
    commodity,
    dataPoints: prices.length,
    trend: trend.error ? null : {
      direction: trend.trend,
      currentPrice: trend.currentPrice,
      latestDate: trend.latestDate,
      movingAverages: trend.movingAverages,
      momentum: trend.momentum,
      volatility: trend.volatility,
      supportResistance: trend.supportResistance,
      priceRange: trend.priceRange,
    },
    forecast: forecast?.error ? null : {
      direction: forecast?.forecast?.direction,
      priceChangePct: forecast?.forecast?.priceChangePct,
      priceChange: forecast?.forecast?.priceChange,
      horizonDays: forecast?.forecast?.horizonDays,
      reliability: forecast?.confidence?.reliability,
      rSquared: forecast?.confidence?.rSquared,
      predictions: forecast?.forecast?.predictions,
    },
    seasonal,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Get sell/hold recommendation for a storage unit.
 */
async function getStorageUnitRecommendation(storageUnitId, userId) {
  // Fetch storage unit (scoped to user)
  const { data: unit, error: unitErr } = await supabase
    .from("agro_storage_units")
    .select("*, commodity:agro_commodities(*)")
    .eq("id", storageUnitId)
    .eq("ownerId", userId)
    .maybeSingle();

  if (unitErr || !unit) {
    return { error: "Storage unit not found or access denied" };
  }

  if (!unit.commodityId) {
    return { error: "No commodity assigned to this storage unit" };
  }

  // Fetch price history
  const prices = await fetchPriceHistory(unit.commodityId);

  if (prices.length < 5) {
    return {
      error: `Insufficient market data for ${unit.commodity?.name}. ${prices.length} records found, need at least 5.`,
      storageUnit: {
        id: unit.id,
        name: unit.name,
        commodity: unit.commodity?.name,
      },
    };
  }

  // Check for spoilage risk
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

  // Days in storage
  const daysInStorage = unit.createdAt
    ? Math.floor((Date.now() - new Date(unit.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const storageInfo = {
    daysInStorage,
    maxStorageDays: unit.commodity?.maxStorageDays || 365,
    currentStockKg: unit.currentStockKg || 0,
    spoilageRisk,
  };

  const result = generateRecommendation({
    prices,
    commodityName: unit.commodity?.name || "Unknown",
    storageInfo,
  });

  return {
    storageUnit: {
      id: unit.id,
      name: unit.name,
      commodity: unit.commodity?.name,
      currentStockKg: unit.currentStockKg,
      daysInStorage,
    },
    ...result,
  };
}

/**
 * Get price comparison across all commodities.
 */
async function getMarketOverview() {
  const { data: commodities, error } = await supabase
    .from("agro_commodities")
    .select("id, name, category, unit")
    .order("name");

  if (error) throw new Error(`Failed to fetch commodities: ${error.message}`);

  const overview = [];

  for (const commodity of commodities) {
    // Fetch latest price
    const { data: latest } = await supabase
      .from("agro_market_data")
      .select("price, recordedAt, market")
      .eq("commodityId", commodity.id)
      .order("recordedAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch price 7 days ago for weekly change
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: weekAgoPrice } = await supabase
      .from("agro_market_data")
      .select("price")
      .eq("commodityId", commodity.id)
      .lte("recordedAt", weekAgo.toISOString())
      .order("recordedAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch price 30 days ago for monthly change
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const { data: monthAgoPrice } = await supabase
      .from("agro_market_data")
      .select("price")
      .eq("commodityId", commodity.id)
      .lte("recordedAt", monthAgo.toISOString())
      .order("recordedAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    const weeklyChange = latest && weekAgoPrice
      ? parseFloat((((latest.price - weekAgoPrice.price) / weekAgoPrice.price) * 100).toFixed(2))
      : null;

    const monthlyChange = latest && monthAgoPrice
      ? parseFloat((((latest.price - monthAgoPrice.price) / monthAgoPrice.price) * 100).toFixed(2))
      : null;

    overview.push({
      commodity: {
        id: commodity.id,
        name: commodity.name,
        category: commodity.category,
        unit: commodity.unit,
      },
      latestPrice: latest ? latest.price : null,
      latestDate: latest ? latest.recordedAt : null,
      market: latest ? latest.market : null,
      weeklyChangePct: weeklyChange,
      monthlyChangePct: monthlyChange,
      trend: weeklyChange !== null
        ? weeklyChange > 2 ? "rising" : weeklyChange < -2 ? "falling" : "stable"
        : "unknown",
    });
  }

  return overview;
}

/**
 * Get price chart data for a commodity.
 */
async function getPriceChartData(commodityId, days = 90) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const { data: prices, error } = await supabase
    .from("agro_market_data")
    .select("price, recordedAt, market, source")
    .eq("commodityId", commodityId)
    .gte("recordedAt", fromDate.toISOString())
    .order("recordedAt", { ascending: true });

  if (error) throw new Error(`Failed to fetch chart data: ${error.message}`);

  if (!prices || prices.length === 0) {
    return { error: "No price data available for the requested period" };
  }

  // Compute moving averages for chart overlay
  const trend = analyzeTrend(prices, { smaWindows: [7, 14, 30] });

  return {
    prices: prices.map((p) => ({
      date: p.recordedAt,
      price: p.price,
      market: p.market,
      source: p.source,
    })),
    movingAverages: trend.series?.sma || {},
    ema: trend.series?.ema || [],
    dataPoints: prices.length,
    periodDays: days,
  };
}

module.exports = {
  getMarketAnalysis,
  getStorageUnitRecommendation,
  getMarketOverview,
  getPriceChartData,
  fetchPriceHistory,
};
