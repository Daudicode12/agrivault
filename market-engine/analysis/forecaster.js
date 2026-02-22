/**
 * AgroVault Price Forecaster
 *
 * Predicts future commodity prices using:
 * - Linear regression for short-term projection
 * - Weighted Moving Average (WMA) forecasting
 * - Seasonal adjustment factors
 * - Confidence intervals based on historical volatility
 */

/**
 * Simple Linear Regression.
 * x = day index (0, 1, 2, ...), y = price
 * Returns { slope, intercept, rSquared }
 */
function linearRegression(prices) {
  const n = prices.length;
  if (n < 2) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = prices[i].price;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared (coefficient of determination)
  const yMean = sumY / n;
  const ssTot = prices.reduce((s, p) => s + (p.price - yMean) ** 2, 0);
  const ssRes = prices.reduce((s, p, i) => {
    const predicted = intercept + slope * i;
    return s + (p.price - predicted) ** 2;
  }, 0);
  const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

  return {
    slope: parseFloat(slope.toFixed(4)),
    intercept: parseFloat(intercept.toFixed(2)),
    rSquared: parseFloat(rSquared.toFixed(4)),
  };
}

/**
 * Weighted Moving Average forecast.
 * Gives more weight to recent data points.
 */
function weightedMovingAverageForecast(prices, windowSize = 14) {
  if (prices.length < windowSize) return null;

  const recent = prices.slice(-windowSize);
  let weightedSum = 0;
  let weightTotal = 0;

  for (let i = 0; i < recent.length; i++) {
    const weight = i + 1; // Linear weights: 1, 2, 3, ...
    weightedSum += recent[i].price * weight;
    weightTotal += weight;
  }

  return parseFloat((weightedSum / weightTotal).toFixed(2));
}

/**
 * Compute prediction residuals' standard deviation (used for confidence intervals).
 */
function computeResidualStdDev(prices, regression) {
  if (!regression || prices.length < 3) return 0;

  const residuals = prices.map((p, i) => {
    const predicted = regression.intercept + regression.slope * i;
    return p.price - predicted;
  });

  const mean = residuals.reduce((s, r) => s + r, 0) / residuals.length;
  const variance =
    residuals.reduce((s, r) => s + (r - mean) ** 2, 0) / (residuals.length - 2);

  return Math.sqrt(Math.max(0, variance));
}

/**
 * Generate price forecast for the next N days.
 *
 * @param {Array} prices - Sorted { price, recordedAt } array
 * @param {number} horizonDays - How many days ahead to forecast
 * @param {Object} seasonalFactors - Optional { month: factor } map
 * @returns {Object} Forecast result
 */
function forecastPrices(prices, horizonDays = 30, seasonalFactors = null) {
  if (!prices || prices.length < 2) {
    return { error: "Insufficient data for forecasting" };
  }

  const sorted = [...prices].sort(
    (a, b) => new Date(a.recordedAt) - new Date(b.recordedAt)
  );

  const n = sorted.length;
  const currentPrice = sorted[n - 1].price;
  const latestDate = new Date(sorted[n - 1].recordedAt);

  // Linear regression on the full series
  const regression = linearRegression(sorted);
  if (!regression) {
    return { error: "Unable to compute regression" };
  }

  // Residual standard deviation for confidence intervals
  const residualStdDev = computeResidualStdDev(sorted, regression);

  // WMA forecast (baseline)
  const wmaForecast = weightedMovingAverageForecast(sorted);

  // Generate daily forecasts
  const forecasts = [];
  for (let d = 1; d <= horizonDays; d++) {
    const futureDate = new Date(latestDate);
    futureDate.setDate(futureDate.getDate() + d);

    // Linear regression prediction
    const dayIndex = n - 1 + d;
    let predicted = regression.intercept + regression.slope * dayIndex;

    // Blend with WMA (60% regression, 40% WMA trend)
    if (wmaForecast !== null) {
      const wmaTrend = wmaForecast + (regression.slope * d);
      predicted = predicted * 0.6 + wmaTrend * 0.4;
    }

    // Apply seasonal adjustment
    if (seasonalFactors) {
      const month = futureDate.getMonth() + 1; // 1-12
      const factor = seasonalFactors[month] || 1.0;
      predicted *= factor;
    }

    // Ensure price doesn't go negative
    predicted = Math.max(0, predicted);

    // Confidence interval widens over time
    const uncertainty = residualStdDev * Math.sqrt(d);
    const ci90Lower = Math.max(0, predicted - 1.645 * uncertainty);
    const ci90Upper = predicted + 1.645 * uncertainty;

    forecasts.push({
      date: futureDate.toISOString().split("T")[0],
      predictedPrice: parseFloat(predicted.toFixed(2)),
      confidence90: {
        lower: parseFloat(ci90Lower.toFixed(2)),
        upper: parseFloat(ci90Upper.toFixed(2)),
      },
      dayAhead: d,
    });
  }

  // Price direction assessment
  const lastForecast = forecasts[forecasts.length - 1];
  const priceChange = lastForecast.predictedPrice - currentPrice;
  const priceChangePct = (priceChange / currentPrice) * 100;

  let direction;
  if (priceChangePct > 5) direction = "strong_increase";
  else if (priceChangePct > 2) direction = "moderate_increase";
  else if (priceChangePct > -2) direction = "stable";
  else if (priceChangePct > -5) direction = "moderate_decrease";
  else direction = "strong_decrease";

  return {
    currentPrice,
    method: "blended_regression_wma",
    regression: {
      slope: regression.slope,
      intercept: regression.intercept,
      rSquared: regression.rSquared,
      dailyTrend: regression.slope > 0 ? "upward" : "downward",
      dailyChangeRate: parseFloat(regression.slope.toFixed(2)),
    },
    forecast: {
      horizonDays,
      direction,
      priceChange: parseFloat(priceChange.toFixed(2)),
      priceChangePct: parseFloat(priceChangePct.toFixed(2)),
      predictions: forecasts,
    },
    confidence: {
      rSquared: regression.rSquared,
      reliability:
        regression.rSquared > 0.7
          ? "high"
          : regression.rSquared > 0.4
          ? "moderate"
          : "low",
      dataPoints: n,
      note:
        regression.rSquared < 0.3
          ? "Low R² indicates high price variability; use forecast as directional guidance only"
          : undefined,
    },
  };
}

module.exports = {
  linearRegression,
  weightedMovingAverageForecast,
  forecastPrices,
};
