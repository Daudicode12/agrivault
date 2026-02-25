/**
 * Market Analysis Routes
 *
 * Exposes market trend analysis, price forecasting, seasonal patterns,
 * and sell/hold recommendations to the frontend.
 *
 * Routes:
 *   GET  /api/market-analysis/overview         — Market overview for all commodities
 *   GET  /api/market-analysis/:commodityId      — Full analysis for one commodity
 *   GET  /api/market-analysis/:commodityId/chart — Price chart data with MA overlays
 *   GET  /api/market-analysis/:commodityId/forecast — Price forecast only
 *   GET  /api/market-analysis/:commodityId/seasonal — Seasonal patterns
 * creating the market analysis route, which will call the market analysis service functions to get the data and return it in the API response. The rout will handle errors and return appropriate status messages if data is insufficient or if the commodity is not found
 */

const { Router } = require("express");
const { AppError } = require("../middleware/errorHandler");
const { authenticate } = require("../middleware/auth");
const {
  getMarketAnalysis,
  getMarketOverview,
  getPriceChartData,
  fetchPriceHistory,
} = require("../services/marketAnalysis.service");
const { ensureRealMarketData, getPricesByCounty } = require("../services/knbsPrice.service");

// Import analysis functions for individual endpoints
const path = require("path");
const analysisPath = path.resolve(__dirname, "../../../market-engine/analysis");
const { forecastPrices, analyzeSeasonalTiming, getSeasonalFactors } = require(analysisPath);

const router = Router();

// ── GET /dashboard — Farmer's personalized market dashboard ──
// Authenticated: shows market data filtered by county and commodity with recommendations
router.get("/dashboard", authenticate, async (req, res, next) => {
  try {
    const { commodity, county, days = 90 } = req.query;

    if (!commodity) {
      throw new AppError("commodity query parameter is required", 400);
    }

    // Find commodity by name (case-insensitive)
    const { supabase } = require("../config/supabase");
    const { data: commodityData, error: commErr } = await supabase
      .from("agro_commodities")
      .select("id, name, category, unit, maxStorageDays")
      .ilike("name", commodity)
      .maybeSingle();

    if (commErr || !commodityData) {
      throw new AppError(`Commodity "${commodity}" not found. Available: Maize, Wheat, Rice, Beans, Sorghum, Irish Potatoes, Coffee`, 404);
    }

    const commodityId = commodityData.id;

    // Fetch real market data from KNBS if missing
    await ensureRealMarketData(commodityId);

    // Fetch price history with optional county filter
    const lookbackDays = Math.min(parseInt(days, 10), 365);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - lookbackDays);

    let priceQuery = supabase
      .from("agro_market_data")
      .select("price, recordedAt, market, source, currency")
      .eq("commodityId", commodityId)
      .gte("recordedAt", fromDate.toISOString())
      .order("recordedAt", { ascending: true });

    if (county) {
      priceQuery = priceQuery.ilike("market", `%${county}%`);
    }

    const { data: priceHistory, error: priceErr } = await priceQuery;
    if (priceErr) throw new AppError(priceErr.message, 500);

    if (!priceHistory || priceHistory.length < 5) {
      return res.json({
        status: "insufficient_data",
        message: `Insufficient market data for ${commodityData.name}${county ? ` in ${county}` : ""}. Only ${priceHistory?.length || 0} records found.`,
        commodity: commodityData,
        county: county || "All counties",
        priceHistory: priceHistory || [],
        dataPoints: priceHistory?.length || 0,
      });
    }

    // Run full analysis
    const { analyzeTrend, forecastPrices, analyzeSeasonalTiming, getSeasonalFactors, generateRecommendation } = require(analysisPath);
    
    const trend = analyzeTrend(priceHistory);
    const seasonalFactors = getSeasonalFactors(commodityData.name, priceHistory);
    const forecast = priceHistory.length >= 14 ? forecastPrices(priceHistory, 30, seasonalFactors.factors) : null;
    const seasonal = analyzeSeasonalTiming(commodityData.name, priceHistory);
    
    // Generate recommendation (without storage context for general market view)
    const recommendation = generateRecommendation({
      prices: priceHistory,
      commodityName: commodityData.name,
      storageInfo: null,
    });

    // Get latest price
    const latestPrice = priceHistory[priceHistory.length - 1];

    // Calculate price statistics
    const prices = priceHistory.map(p => p.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    res.json({
      status: "ok",
      commodity: commodityData,
      county: county || "All counties",
      dataPoints: priceHistory.length,
      periodDays: lookbackDays,
      
      // Price summary
      priceSummary: {
        current: latestPrice.price,
        currentDate: latestPrice.recordedAt,
        currentMarket: latestPrice.market,
        average: parseFloat(avgPrice.toFixed(2)),
        minimum: minPrice,
        maximum: maxPrice,
        currency: latestPrice.currency || "KES",
      },

      // Full price history for charts
      priceHistory: priceHistory.map(p => ({
        date: p.recordedAt,
        price: p.price,
        market: p.market,
        source: p.source,
      })),

      // Market analysis
      analysis: {
        trend: trend.error ? null : {
          direction: trend.trend,
          movingAverages: trend.movingAverages,
          momentum: trend.momentum,
          volatility: trend.volatility,
          priceRange: trend.priceRange,
        },
        forecast: forecast?.error ? null : {
          direction: forecast.forecast?.direction,
          priceChangePct: forecast.forecast?.priceChangePct,
          horizonDays: forecast.forecast?.horizonDays,
          reliability: forecast.confidence?.reliability,
          predictions: forecast.forecast?.predictions?.slice(0, 30),
        },
        seasonal,
      },

      // Sell/Hold recommendation
      recommendation: {
        action: recommendation.recommendation,
        urgency: recommendation.urgency,
        confidence: recommendation.confidence,
        summary: recommendation.summary,
        compositeScore: recommendation.compositeScore,
        reasoning: {
          trend: recommendation.scores.trend.reasons,
          forecast: recommendation.scores.forecast.reasons,
          seasonal: recommendation.scores.seasonal.reasons,
        },
      },

      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// ── GET /overview — Market overview (all commodities) ──
// Public: farmers can see market overview without auth
router.get("/overview", async (_req, res, next) => {
  try {
    const overview = await getMarketOverview();
    res.json({
      overview,
      count: overview.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
});

// ── GET /:commodityId — Full market analysis ──
router.get("/:commodityId", async (req, res, next) => {
  try {
    const { commodityId } = req.params;
    
    // Fetch real market data from KNBS if missing
    await ensureRealMarketData(commodityId);
    
    const result = await getMarketAnalysis(commodityId);

    if (result.error) {
      // Not a hard error — return partial data with status info
      return res.json({
        status: "insufficient_data",
        message: result.error,
        ...result,
      });
    }

    res.json({
      status: "ok",
      ...result,
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
});

// ── GET /:commodityId/chart — Price chart data ──
router.get("/:commodityId/chart", async (req, res, next) => {
  try {
    const { commodityId } = req.params;
    const days = Math.min(parseInt(req.query.days || "90", 10), 365);

    // Fetch real market data from KNBS if missing
    await ensureRealMarketData(commodityId);

    const chartData = await getPriceChartData(commodityId, days);

    if (chartData.error) {
      return res.json({ status: "no_data", message: chartData.error });
    }

    res.json({
      status: "ok",
      ...chartData,
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
});

// ── GET /:commodityId/forecast — Price forecast ──
router.get("/:commodityId/forecast", async (req, res, next) => {
  try {
    const { commodityId } = req.params;
    const horizonDays = Math.min(parseInt(req.query.days || "30", 10), 90);

    // Fetch real market data from KNBS if missing
    await ensureRealMarketData(commodityId);

    const prices = await fetchPriceHistory(commodityId);

    if (prices.length < 14) {
      return res.json({
        status: "insufficient_data",
        message: `Need at least 14 data points for forecasting. Found ${prices.length}.`,
        dataPoints: prices.length,
      });
    }

    // Get commodity name for seasonal factors
    const { supabase } = require("../config/supabase");
    const { data: commodity } = await supabase
      .from("agro_commodities")
      .select("name")
      .eq("id", commodityId)
      .maybeSingle();

    const seasonalFactors = getSeasonalFactors(commodity?.name || "Unknown", prices);
    const forecast = forecastPrices(prices, horizonDays, seasonalFactors.factors);

    if (forecast.error) {
      return res.json({ status: "error", message: forecast.error });
    }

    res.json({
      status: "ok",
      commodity: commodity?.name,
      ...forecast,
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
});

// ── GET /:commodityId/seasonal — Seasonal patterns ──
router.get("/:commodityId/seasonal", async (req, res, next) => {
  try {
    const { commodityId } = req.params;

    const { supabase } = require("../config/supabase");
    const { data: commodity } = await supabase
      .from("agro_commodities")
      .select("name")
      .eq("id", commodityId)
      .maybeSingle();

    if (!commodity) {
      throw new AppError("Commodity not found", 404);
    }

    const prices = await fetchPriceHistory(commodityId, 365);
    const seasonal = analyzeSeasonalTiming(commodity.name, prices);

    res.json({
      status: "ok",
      commodity: commodity.name,
      ...seasonal,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
