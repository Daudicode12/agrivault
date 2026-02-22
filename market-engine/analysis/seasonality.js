/**
 * AgroVault Seasonality Analyzer
 *
 * Detects monthly seasonal patterns in commodity prices for Kenya.
 * Uses historical price data to compute seasonal indices.
 *
 * Kenyan agricultural calendar:
 * - Long rains: March–May (planting) → harvest Jun-Aug
 * - Short rains: October–December (planting) → harvest Jan-Feb
 * - Peak supply (low prices): Jul-Sep, Jan-Feb
 * - Lean season (high prices): Mar-May, Nov-Dec
 */

/**
 * Default seasonal factors for common Kenyan commodities.
 * Factor > 1.0 means prices tend to be HIGHER than average.
 * Factor < 1.0 means prices tend to be LOWER than average.
 * These are used as fallback when insufficient historical data.
 */
const DEFAULT_SEASONAL_FACTORS = {
  // Maize: prices peak during planting season (Mar-May), lowest after harvest (Aug-Sep)
  Maize: {
    1: 0.98, 2: 1.00, 3: 1.05, 4: 1.08, 5: 1.10,
    6: 1.03, 7: 0.95, 8: 0.90, 9: 0.88, 10: 0.93,
    11: 0.98, 12: 1.02,
  },
  // Wheat
  Wheat: {
    1: 0.97, 2: 0.98, 3: 1.02, 4: 1.05, 5: 1.06,
    6: 1.03, 7: 0.98, 8: 0.94, 9: 0.92, 10: 0.95,
    11: 0.99, 12: 1.01,
  },
  // Beans: Two harvest seasons
  Beans: {
    1: 0.95, 2: 0.93, 3: 1.02, 4: 1.08, 5: 1.12,
    6: 1.05, 7: 0.96, 8: 0.90, 9: 0.92, 10: 0.97,
    11: 1.04, 12: 1.06,
  },
  // Rice
  Rice: {
    1: 0.98, 2: 0.97, 3: 1.00, 4: 1.03, 5: 1.05,
    6: 1.02, 7: 0.99, 8: 0.96, 9: 0.95, 10: 0.97,
    11: 1.00, 12: 1.02,
  },
  // Sorghum
  Sorghum: {
    1: 0.97, 2: 0.99, 3: 1.04, 4: 1.07, 5: 1.09,
    6: 1.02, 7: 0.95, 8: 0.91, 9: 0.89, 10: 0.94,
    11: 0.99, 12: 1.01,
  },
  // Irish Potatoes
  "Irish Potatoes": {
    1: 1.02, 2: 1.04, 3: 1.06, 4: 1.03, 5: 0.98,
    6: 0.94, 7: 0.92, 8: 0.93, 9: 0.96, 10: 1.00,
    11: 1.03, 12: 1.05,
  },
  // Coffee
  "Coffee (dried)": {
    1: 1.00, 2: 0.98, 3: 0.97, 4: 0.99, 5: 1.01,
    6: 1.02, 7: 1.03, 8: 1.02, 9: 1.00, 10: 0.99,
    11: 0.98, 12: 1.00,
  },
};

/**
 * Compute seasonal factors from historical price data.
 * Groups prices by month, calculates monthly averages,
 * then normalizes by the overall average.
 *
 * @param {Array} prices - Array of { price, recordedAt }
 * @returns {Object} { factors: { 1: f, 2: f, ... }, computed: boolean }
 */
function computeSeasonalFactors(prices) {
  if (!prices || prices.length < 12) {
    return { factors: null, computed: false };
  }

  // Group by month
  const monthBuckets = {};
  for (let m = 1; m <= 12; m++) monthBuckets[m] = [];

  for (const p of prices) {
    const month = new Date(p.recordedAt).getMonth() + 1;
    monthBuckets[month].push(p.price);
  }

  // Calculate monthly averages
  const monthlyAvg = {};
  let totalSum = 0;
  let totalCount = 0;
  for (let m = 1; m <= 12; m++) {
    if (monthBuckets[m].length > 0) {
      monthlyAvg[m] =
        monthBuckets[m].reduce((s, p) => s + p, 0) / monthBuckets[m].length;
      totalSum += monthlyAvg[m] * monthBuckets[m].length;
      totalCount += monthBuckets[m].length;
    }
  }

  if (totalCount === 0) return { factors: null, computed: false };

  const overallAvg = totalSum / totalCount;

  // Seasonal index = monthAvg / overallAvg
  const factors = {};
  for (let m = 1; m <= 12; m++) {
    if (monthlyAvg[m] !== undefined) {
      factors[m] = parseFloat((monthlyAvg[m] / overallAvg).toFixed(3));
    } else {
      factors[m] = 1.0; // No data for this month
    }
  }

  return { factors, computed: true };
}

/**
 * Get seasonal factors for a commodity.
 * Prefers computed factors if enough data; falls back to defaults.
 */
function getSeasonalFactors(commodityName, historicalPrices = []) {
  // Try computing from data first
  const computed = computeSeasonalFactors(historicalPrices);
  if (computed.computed) {
    return { ...computed, source: "computed" };
  }

  // Fall back to defaults
  if (DEFAULT_SEASONAL_FACTORS[commodityName]) {
    return {
      factors: DEFAULT_SEASONAL_FACTORS[commodityName],
      computed: false,
      source: "default",
    };
  }

  // Generic neutral factors
  const neutral = {};
  for (let m = 1; m <= 12; m++) neutral[m] = 1.0;
  return { factors: neutral, computed: false, source: "neutral" };
}

/**
 * Analyze whether the current month is a good time to sell
 * based on seasonal patterns.
 */
function analyzeSeasonalTiming(commodityName, historicalPrices = []) {
  const { factors, source } = getSeasonalFactors(commodityName, historicalPrices);
  const currentMonth = new Date().getMonth() + 1;
  const currentFactor = factors[currentMonth];

  // Find peak and valley months
  const entries = Object.entries(factors).map(([m, f]) => ({
    month: parseInt(m),
    factor: f,
  }));
  entries.sort((a, b) => b.factor - a.factor);

  const peakMonths = entries.slice(0, 3).map((e) => e.month);
  const valleyMonths = entries.slice(-3).map((e) => e.month);

  // Determine seasonal signal
  let seasonalSignal;
  if (currentFactor >= 1.05) seasonalSignal = "strong_sell";
  else if (currentFactor >= 1.02) seasonalSignal = "sell";
  else if (currentFactor <= 0.93) seasonalSignal = "strong_hold";
  else if (currentFactor <= 0.97) seasonalSignal = "hold";
  else seasonalSignal = "neutral";

  // Find next peak
  let nextPeakMonth = null;
  for (let offset = 1; offset <= 12; offset++) {
    const checkMonth = ((currentMonth - 1 + offset) % 12) + 1;
    if (peakMonths.includes(checkMonth)) {
      nextPeakMonth = checkMonth;
      break;
    }
  }

  const monthNames = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return {
    currentMonth: monthNames[currentMonth],
    currentFactor,
    seasonalSignal,
    peakMonths: peakMonths.map((m) => ({ month: monthNames[m], factor: factors[m] })),
    valleyMonths: valleyMonths.map((m) => ({ month: monthNames[m], factor: factors[m] })),
    nextPeakMonth: nextPeakMonth ? monthNames[nextPeakMonth] : null,
    monthsUntilPeak: nextPeakMonth
      ? ((nextPeakMonth - currentMonth + 12) % 12) || 12
      : null,
    allFactors: Object.fromEntries(
      Object.entries(factors).map(([m, f]) => [monthNames[parseInt(m)], f])
    ),
    source,
  };
}

module.exports = {
  DEFAULT_SEASONAL_FACTORS,
  computeSeasonalFactors,
  getSeasonalFactors,
  analyzeSeasonalTiming,
};
