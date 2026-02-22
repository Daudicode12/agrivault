/**
 * AgroVault Market Analysis Module
 *
 * Public API for all analysis functions.
 */

const { analyzeTrend, computeSMA, computeEMA, computeMomentum, computeVolatility } = require("./trendAnalyzer");
const { forecastPrices, linearRegression } = require("./forecaster");
const { analyzeSeasonalTiming, getSeasonalFactors, computeSeasonalFactors } = require("./seasonality");
const { generateRecommendation } = require("./recommendationEngine");

module.exports = {
  // Trend analysis
  analyzeTrend,
  computeSMA,
  computeEMA,
  computeMomentum,
  computeVolatility,

  // Forecasting
  forecastPrices,
  linearRegression,

  // Seasonality
  analyzeSeasonalTiming,
  getSeasonalFactors,
  computeSeasonalFactors,

  // Recommendations
  generateRecommendation,
};
