/**
 * AgroVault Sell / Hold Recommendation Engine
 *
 * Produces actionable sell-or-hold recommendations for farmers
 * by combining:
 *   1. Price trend analysis (moving averages, momentum)
 *   2. Price forecast direction
 *   3. Seasonal timing patterns
 *   4. Storage risk (spoilage, days in storage)
 *   5. Cost of carry (storage costs vs potential gain)
 *
 * Output: a single recommendation with confidence and reasoning.
 */

const { analyzeTrend } = require("./trendAnalyzer");
const { forecastPrices } = require("./forecaster");
const { analyzeSeasonalTiming, getSeasonalFactors } = require("./seasonality");

/**
 * Score components (each -100 to +100):
 *   Positive = SELL signal
 *   Negative = HOLD signal
 */

/**
 * Score based on price trend vs moving averages.
 * If current price is ABOVE long-term SMA → sell signal.
 */
function scoreTrend(trendData) {
  if (!trendData || trendData.error) return { score: 0, reason: "Insufficient trend data" };

  let score = 0;
  const reasons = [];
  const { currentPrice, movingAverages, trend, momentum } = trendData;

  // Price vs SMA30
  if (movingAverages.sma30) {
    const pctAboveSMA30 = ((currentPrice - movingAverages.sma30) / movingAverages.sma30) * 100;
    if (pctAboveSMA30 > 10) {
      score += 40;
      reasons.push(`Price is ${pctAboveSMA30.toFixed(1)}% above 30-day average — strong sell signal`);
    } else if (pctAboveSMA30 > 5) {
      score += 25;
      reasons.push(`Price is ${pctAboveSMA30.toFixed(1)}% above 30-day average — favorable to sell`);
    } else if (pctAboveSMA30 < -10) {
      score -= 35;
      reasons.push(`Price is ${Math.abs(pctAboveSMA30).toFixed(1)}% below 30-day average — hold for better prices`);
    } else if (pctAboveSMA30 < -5) {
      score -= 20;
      reasons.push(`Price is ${Math.abs(pctAboveSMA30).toFixed(1)}% below 30-day average — consider holding`);
    }
  }

  // Trend direction
  if (trend === "falling") {
    score += 15; // Price is dropping — sell before it drops more
    reasons.push("Price trend is falling — selling now prevents further losses");
  } else if (trend === "rising") {
    score -= 20; // Price is rising — hold for higher price
    reasons.push("Price trend is rising — holding may yield better returns");
  }

  // Momentum
  if (momentum && momentum["7day"] !== null) {
    if (momentum["7day"] > 5) {
      score -= 15;
      reasons.push(`Strong upward momentum (${momentum["7day"]}% in 7 days) — prices still climbing`);
    } else if (momentum["7day"] < -5) {
      score += 15;
      reasons.push(`Downward momentum (${momentum["7day"]}% in 7 days) — sell before further decline`);
    }
  }

  return { score: Math.max(-100, Math.min(100, score)), reasons };
}

/**
 * Score based on price forecast.
 * If forecast shows prices declining → sell now.
 */
function scoreForecast(forecastData) {
  if (!forecastData || forecastData.error) return { score: 0, reason: "Insufficient forecast data" };

  let score = 0;
  const reasons = [];
  const { forecast, confidence } = forecastData;

  if (!forecast) return { score: 0, reasons: ["No forecast available"] };

  const changePct = forecast.priceChangePct;

  if (changePct < -10) {
    score += 40;
    reasons.push(`Forecast shows ${Math.abs(changePct).toFixed(1)}% price drop in ${forecast.horizonDays} days — sell now`);
  } else if (changePct < -3) {
    score += 20;
    reasons.push(`Forecast shows ${Math.abs(changePct).toFixed(1)}% price decline — selling is advisable`);
  } else if (changePct > 10) {
    score -= 35;
    reasons.push(`Forecast shows ${changePct.toFixed(1)}% price increase in ${forecast.horizonDays} days — strong hold`);
  } else if (changePct > 3) {
    score -= 15;
    reasons.push(`Forecast shows ${changePct.toFixed(1)}% price increase — consider holding`);
  }

  // Adjust by confidence
  if (confidence && confidence.reliability === "low") {
    score = Math.round(score * 0.5);
    reasons.push("Forecast reliability is low — treat as directional guidance only");
  }

  return { score: Math.max(-100, Math.min(100, score)), reasons };
}

/**
 * Score based on seasonal patterns.
 */
function scoreSeasonal(seasonalData) {
  if (!seasonalData) return { score: 0, reasons: ["No seasonal data"] };

  let score = 0;
  const reasons = [];
  const { seasonalSignal, currentMonth, nextPeakMonth, monthsUntilPeak, currentFactor } = seasonalData;

  switch (seasonalSignal) {
    case "strong_sell":
      score += 35;
      reasons.push(`${currentMonth} is a peak-price month (factor: ${currentFactor}) — excellent time to sell`);
      break;
    case "sell":
      score += 20;
      reasons.push(`${currentMonth} typically has above-average prices — good time to sell`);
      break;
    case "strong_hold":
      score -= 35;
      reasons.push(`${currentMonth} is a low-price month (factor: ${currentFactor}) — hold for better months`);
      if (nextPeakMonth) {
        reasons.push(`Prices typically peak in ${nextPeakMonth} (${monthsUntilPeak} months away)`);
      }
      break;
    case "hold":
      score -= 20;
      reasons.push(`${currentMonth} typically has below-average prices — consider holding`);
      if (nextPeakMonth) {
        reasons.push(`Next seasonal peak: ${nextPeakMonth} (${monthsUntilPeak} months away)`);
      }
      break;
    default:
      reasons.push(`${currentMonth} has neutral seasonal pricing`);
  }

  return { score: Math.max(-100, Math.min(100, score)), reasons };
}

/**
 * Score based on storage risk and costs.
 * Higher risk/cost = stronger sell signal.
 */
function scoreStorageRisk(storageInfo) {
  if (!storageInfo) return { score: 0, reasons: ["No storage info provided"] };

  let score = 0;
  const reasons = [];
  const {
    daysInStorage = 0,
    maxStorageDays = 365,
    currentStockKg = 0,
    spoilageRisk = null,
  } = storageInfo;

  // Days remaining as fraction
  const daysRemaining = maxStorageDays - daysInStorage;
  const fractionUsed = daysInStorage / maxStorageDays;

  if (fractionUsed > 0.85) {
    score += 40;
    reasons.push(`Storage is ${Math.round(fractionUsed * 100)}% of max shelf life (${daysRemaining} days left) — sell urgently`);
  } else if (fractionUsed > 0.65) {
    score += 25;
    reasons.push(`${daysRemaining} days of storage life remaining — begin selling soon`);
  } else if (fractionUsed > 0.5) {
    score += 10;
    reasons.push(`${daysRemaining} days of storage remaining — adequate time to hold`);
  } else {
    score -= 5;
    reasons.push(`Plenty of storage life remaining (${daysRemaining} days) — no urgency to sell`);
  }

  // Spoilage risk from sensor data
  if (spoilageRisk === "high") {
    score += 30;
    reasons.push("Sensor data indicates HIGH spoilage risk — sell immediately");
  } else if (spoilageRisk === "medium") {
    score += 15;
    reasons.push("Sensor data indicates moderate spoilage risk — selling is advisable");
  }

  return { score: Math.max(-100, Math.min(100, score)), reasons };
}

/**
 * Generate the final sell/hold recommendation.
 *
 * @param {Object} params
 * @param {Array}  params.prices - Historical price data [{ price, recordedAt }]
 * @param {string} params.commodityName - Name of the commodity
 * @param {Object} params.storageInfo - Storage context (optional)
 * @param {Object} params.analysisOptions - Override analysis defaults (optional)
 * @returns {Object} Full recommendation with reasoning
 */
function generateRecommendation(params) {
  const {
    prices = [],
    commodityName = "Unknown",
    storageInfo = null,
    analysisOptions = {},
  } = params;

  // Run all analyses
  const trendData = analyzeTrend(prices, analysisOptions);
  const seasonalData = analyzeSeasonalTiming(commodityName, prices);
  const seasonalFactors = getSeasonalFactors(commodityName, prices);
  const forecastData = forecastPrices(prices, 30, seasonalFactors.factors);

  // Score each factor
  const trendScore = scoreTrend(trendData);
  const forecastScore = scoreForecast(forecastData);
  const seasonalScore = scoreSeasonal(seasonalData);
  const storageScore = scoreStorageRisk(storageInfo);

  // Weighted composite score
  // Weights: trend (30%), forecast (25%), seasonal (20%), storage (25%)
  const weights = { trend: 0.30, forecast: 0.25, seasonal: 0.20, storage: 0.25 };
  const compositeScore =
    trendScore.score * weights.trend +
    forecastScore.score * weights.forecast +
    seasonalScore.score * weights.seasonal +
    storageScore.score * weights.storage;

  // Map composite to recommendation
  let recommendation, urgency, confidence;
  if (compositeScore >= 30) {
    recommendation = "SELL";
    urgency = "high";
  } else if (compositeScore >= 15) {
    recommendation = "SELL";
    urgency = "moderate";
  } else if (compositeScore >= 5) {
    recommendation = "CONSIDER_SELLING";
    urgency = "low";
  } else if (compositeScore >= -5) {
    recommendation = "HOLD";
    urgency = "low";
  } else if (compositeScore >= -15) {
    recommendation = "HOLD";
    urgency = "moderate";
  } else {
    recommendation = "STRONG_HOLD";
    urgency = "high";
  }

  // Confidence based on data quality
  const dataQuality = prices.length >= 30 ? "high" : prices.length >= 14 ? "moderate" : "low";
  confidence = dataQuality;

  // Collect all reasons
  const allReasons = [
    ...trendScore.reasons,
    ...forecastScore.reasons,
    ...seasonalScore.reasons,
    ...storageScore.reasons,
  ];

  // Generate human-readable summary
  const summary = generateSummary(recommendation, urgency, commodityName, trendData, forecastData, seasonalData);

  return {
    recommendation,
    urgency,
    confidence,
    compositeScore: parseFloat(compositeScore.toFixed(1)),
    summary,
    commodity: commodityName,
    currentPrice: trendData.currentPrice || null,
    scores: {
      trend: { score: trendScore.score, weight: weights.trend, reasons: trendScore.reasons },
      forecast: { score: forecastScore.score, weight: weights.forecast, reasons: forecastScore.reasons },
      seasonal: { score: seasonalScore.score, weight: weights.seasonal, reasons: seasonalScore.reasons },
      storage: { score: storageScore.score, weight: weights.storage, reasons: storageScore.reasons },
    },
    analysis: {
      trend: trendData.error ? null : {
        direction: trendData.trend,
        movingAverages: trendData.movingAverages,
        momentum: trendData.momentum,
        priceRange: trendData.priceRange,
      },
      forecast: forecastData.error ? null : {
        direction: forecastData.forecast?.direction,
        priceChangePct: forecastData.forecast?.priceChangePct,
        reliability: forecastData.confidence?.reliability,
        predictions: forecastData.forecast?.predictions?.slice(0, 7), // Next 7 days
      },
      seasonal: seasonalData,
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate a farmer-friendly summary paragraph.
 */
function generateSummary(recommendation, urgency, commodity, trend, forecast, seasonal) {
  const currentPrice = trend?.currentPrice;
  const priceStr = currentPrice ? `KES ${currentPrice.toLocaleString()}` : "the current price";

  let message = "";

  switch (recommendation) {
    case "SELL":
      if (urgency === "high") {
        message = `We strongly recommend selling your ${commodity} now at ${priceStr}. `;
      } else {
        message = `It's a good time to sell your ${commodity} at ${priceStr}. `;
      }
      break;
    case "CONSIDER_SELLING":
      message = `You may want to start selling some of your ${commodity} at ${priceStr}. `;
      break;
    case "HOLD":
      message = `We recommend holding your ${commodity} for now. `;
      break;
    case "STRONG_HOLD":
      message = `We strongly recommend holding your ${commodity}. `;
      break;
  }

  // Add seasonal context
  if (seasonal && seasonal.nextPeakMonth && recommendation.includes("HOLD")) {
    message += `Prices typically peak around ${seasonal.nextPeakMonth}, which is ${seasonal.monthsUntilPeak} month(s) away. `;
  }

  // Add forecast context
  if (forecast && !forecast.error && forecast.forecast) {
    const dir = forecast.forecast.direction;
    if (dir === "strong_increase" || dir === "moderate_increase") {
      message += `Our forecast shows prices are likely to rise by ${Math.abs(forecast.forecast.priceChangePct)}% over the next ${forecast.forecast.horizonDays} days. `;
    } else if (dir === "strong_decrease" || dir === "moderate_decrease") {
      message += `Our forecast indicates prices may drop by ${Math.abs(forecast.forecast.priceChangePct)}% over the next ${forecast.forecast.horizonDays} days. `;
    }
  }

  return message.trim();
}

module.exports = {
  generateRecommendation,
  scoreTrend,
  scoreForecast,
  scoreSeasonal,
  scoreStorageRisk,
};
