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

// Import analysis functions for individual endpoints
const path = require("path");
const analysisPath = path.resolve(__dirname, "../../../market-engine/analysis");
const { forecastPrices, analyzeSeasonalTiming, getSeasonalFactors } = require(analysisPath);

const router = Router();

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
