/**
 * AgroVault Price Trend Analyzer
 *
 * Computes moving averages, momentum, volatility, and support/resistance
 * levels for commodity price series.
 *
 * All functions accept an array of { price, recordedAt } sorted by date ascending.
 */

/**
 * Simple Moving Average for a given window size.
 * Returns an array of { date, sma } for each point that has enough history.
 */
function computeSMA(prices, windowSize) {
  if (prices.length < windowSize) return [];

  const result = [];
  for (let i = windowSize - 1; i < prices.length; i++) {
    let sum = 0;
    for (let j = i - windowSize + 1; j <= i; j++) {
      sum += prices[j].price;
    }
    result.push({
      date: prices[i].recordedAt,
      sma: parseFloat((sum / windowSize).toFixed(2)),
    });
  }
  return result;
}

/**
 * Exponential Moving Average.
 * Uses a smoothing factor: k = 2 / (span + 1)
 */
function computeEMA(prices, span) {
  if (prices.length === 0) return [];

  const k = 2 / (span + 1);
  const result = [];
  let ema = prices[0].price;

  for (let i = 0; i < prices.length; i++) {
    ema = prices[i].price * k + ema * (1 - k);
    result.push({
      date: prices[i].recordedAt,
      ema: parseFloat(ema.toFixed(2)),
    });
  }
  return result;
}

/**
 * Price Momentum (rate of change over N days).
 * momentum = (currentPrice - priceNDaysAgo) / priceNDaysAgo * 100
 */
function computeMomentum(prices, period = 7) {
  if (prices.length < period + 1) return [];

  const result = [];
  for (let i = period; i < prices.length; i++) {
    const prev = prices[i - period].price;
    const curr = prices[i].price;
    const momentum = prev !== 0 ? ((curr - prev) / prev) * 100 : 0;
    result.push({
      date: prices[i].recordedAt,
      momentum: parseFloat(momentum.toFixed(2)),
    });
  }
  return result;
}

/**
 * Volatility as rolling standard deviation of daily returns.
 */
function computeVolatility(prices, windowSize = 30) {
  if (prices.length < windowSize + 1) return null;

  // Calculate daily returns
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1].price;
    if (prev === 0) continue;
    returns.push((prices[i].price - prev) / prev);
  }

  if (returns.length < windowSize) return null;

  // Use last `windowSize` returns
  const recentReturns = returns.slice(-windowSize);
  const mean = recentReturns.reduce((s, r) => s + r, 0) / recentReturns.length;
  const variance =
    recentReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / recentReturns.length;

  return {
    dailyVolatility: parseFloat((Math.sqrt(variance) * 100).toFixed(2)),
    annualizedVolatility: parseFloat((Math.sqrt(variance) * Math.sqrt(252) * 100).toFixed(2)),
    periodDays: windowSize,
  };
}

/**
 * Detect support and resistance levels using local min/max.
 */
function detectSupportResistance(prices, lookback = 5) {
  if (prices.length < lookback * 2 + 1) return { support: null, resistance: null };

  const supports = [];
  const resistances = [];

  for (let i = lookback; i < prices.length - lookback; i++) {
    let isMin = true;
    let isMax = true;

    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (prices[j].price <= prices[i].price) isMin = false;
      if (prices[j].price >= prices[i].price) isMax = false;
    }

    if (isMin) supports.push(prices[i].price);
    if (isMax) resistances.push(prices[i].price);
  }

  // Return the most recent levels
  return {
    support: supports.length > 0 ? supports[supports.length - 1] : null,
    resistance: resistances.length > 0 ? resistances[resistances.length - 1] : null,
    allSupports: supports.slice(-3),
    allResistances: resistances.slice(-3),
  };
}

/**
 * Determine the current price trend direction.
 * Returns: "rising", "falling", or "stable"
 */
function determineTrend(prices, shortWindow = 7, longWindow = 30) {
  if (prices.length < longWindow) {
    if (prices.length < shortWindow) return "insufficient_data";

    // Fallback to short-term only
    const shortSMA = computeSMA(prices, shortWindow);
    if (shortSMA.length < 2) return "insufficient_data";
    const latest = shortSMA[shortSMA.length - 1].sma;
    const prev = shortSMA[shortSMA.length - 2].sma;
    const changePct = ((latest - prev) / prev) * 100;

    if (changePct > 1) return "rising";
    if (changePct < -1) return "falling";
    return "stable";
  }

  const shortSMA = computeSMA(prices, shortWindow);
  const longSMA = computeSMA(prices, longWindow);

  if (shortSMA.length === 0 || longSMA.length === 0) return "insufficient_data";

  const latestShort = shortSMA[shortSMA.length - 1].sma;
  const latestLong = longSMA[longSMA.length - 1].sma;

  // Short-term above long-term = bullish (rising)
  const crossPct = ((latestShort - latestLong) / latestLong) * 100;

  if (crossPct > 2) return "rising";
  if (crossPct < -2) return "falling";
  return "stable";
}

/**
 * Full trend analysis for a commodity's price series.
 */
function analyzeTrend(prices, options = {}) {
  const {
    smaWindows = [7, 14, 30],
    emaSpan = 14,
    volatilityWindow = 30,
  } = options;

  if (!prices || prices.length === 0) {
    return { error: "No price data available" };
  }

  // Sort ascending by date
  const sorted = [...prices].sort(
    (a, b) => new Date(a.recordedAt) - new Date(b.recordedAt)
  );

  const currentPrice = sorted[sorted.length - 1].price;
  const latestDate = sorted[sorted.length - 1].recordedAt;

  // Compute SMAs for each window
  const smaResults = {};
  for (const w of smaWindows) {
    const sma = computeSMA(sorted, w);
    smaResults[`sma${w}`] = sma.length > 0 ? sma[sma.length - 1].sma : null;
    smaResults[`sma${w}Series`] = sma;
  }

  // EMA
  const emaSeries = computeEMA(sorted, emaSpan);
  const latestEMA = emaSeries.length > 0 ? emaSeries[emaSeries.length - 1].ema : null;

  // Momentum
  const momentum7 = computeMomentum(sorted, 7);
  const momentum14 = computeMomentum(sorted, 14);

  // Volatility
  const volatility = computeVolatility(sorted, volatilityWindow);

  // Support / Resistance
  const levels = detectSupportResistance(sorted);

  // Trend direction
  const trend = determineTrend(sorted);

  // Price range (30-day)
  const last30 = sorted.slice(-30);
  const priceRange = {
    high: Math.max(...last30.map((p) => p.price)),
    low: Math.min(...last30.map((p) => p.price)),
    average: parseFloat(
      (last30.reduce((s, p) => s + p.price, 0) / last30.length).toFixed(2)
    ),
  };

  return {
    currentPrice,
    latestDate,
    trend,
    dataPoints: sorted.length,
    movingAverages: {
      ...Object.fromEntries(
        smaWindows.map((w) => [`sma${w}`, smaResults[`sma${w}`]])
      ),
      [`ema${emaSpan}`]: latestEMA,
    },
    momentum: {
      "7day": momentum7.length > 0 ? momentum7[momentum7.length - 1].momentum : null,
      "14day": momentum14.length > 0 ? momentum14[momentum14.length - 1].momentum : null,
    },
    volatility,
    supportResistance: levels,
    priceRange,
    series: {
      sma: Object.fromEntries(
        smaWindows.map((w) => [`sma${w}`, smaResults[`sma${w}Series`]])
      ),
      ema: emaSeries,
    },
  };
}

module.exports = {
  computeSMA,
  computeEMA,
  computeMomentum,
  computeVolatility,
  detectSupportResistance,
  determineTrend,
  analyzeTrend,
};
