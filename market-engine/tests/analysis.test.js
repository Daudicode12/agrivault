/**
 * Tests for Market Analysis Modules
 *
 * Validates trend analysis, forecasting, seasonality, and recommendations
 * using synthetic price data.
 */

const { analyzeTrend, computeSMA, computeEMA, computeMomentum, computeVolatility } = require("../analysis/trendAnalyzer");
const { forecastPrices, linearRegression } = require("../analysis/forecaster");
const { analyzeSeasonalTiming, computeSeasonalFactors, getSeasonalFactors } = require("../analysis/seasonality");
const { generateRecommendation, scoreTrend, scoreForecast, scoreSeasonal, scoreStorageRisk } = require("../analysis/recommendationEngine");

// ── Helper: generate synthetic price data ──
function generatePrices(days, basePrice = 3000, trend = 0, volatility = 50) {
  const prices = [];
  let price = basePrice;
  for (let d = 0; d < days; d++) {
    price += trend + (Math.random() - 0.5) * volatility;
    price = Math.max(100, price);
    const date = new Date();
    date.setDate(date.getDate() - (days - d));
    prices.push({
      price: parseFloat(price.toFixed(2)),
      recordedAt: date.toISOString(),
    });
  }
  return prices;
}

// ── Rising prices ──
function risingPrices(days = 60) {
  return generatePrices(days, 3000, 20, 30);
}

// ── Falling prices ──
function fallingPrices(days = 60) {
  return generatePrices(days, 5000, -20, 30);
}

// ── Flat prices ──
function flatPrices(days = 60) {
  return generatePrices(days, 3000, 0, 10);
}

// ============================================
// Trend Analyzer Tests
// ============================================
describe("Trend Analyzer", () => {
  describe("computeSMA", () => {
    test("computes correct 3-day SMA", () => {
      const prices = [
        { price: 100, recordedAt: "2025-01-01" },
        { price: 200, recordedAt: "2025-01-02" },
        { price: 300, recordedAt: "2025-01-03" },
        { price: 400, recordedAt: "2025-01-04" },
      ];
      const sma = computeSMA(prices, 3);
      expect(sma).toHaveLength(2);
      expect(sma[0].sma).toBe(200); // (100+200+300)/3
      expect(sma[1].sma).toBe(300); // (200+300+400)/3
    });

    test("returns empty when not enough data", () => {
      const prices = [{ price: 100, recordedAt: "2025-01-01" }];
      expect(computeSMA(prices, 5)).toHaveLength(0);
    });
  });

  describe("computeEMA", () => {
    test("computes EMA with correct length", () => {
      const prices = generatePrices(30, 3000);
      const ema = computeEMA(prices, 14);
      expect(ema).toHaveLength(30);
    });

    test("returns empty for empty input", () => {
      expect(computeEMA([], 14)).toHaveLength(0);
    });
  });

  describe("computeMomentum", () => {
    test("computes positive momentum for rising prices", () => {
      const prices = risingPrices(30);
      const momentum = computeMomentum(prices, 7);
      expect(momentum.length).toBeGreaterThan(0);
      // Rising prices should have positive momentum
      const lastMomentum = momentum[momentum.length - 1].momentum;
      expect(lastMomentum).toBeGreaterThan(0);
    });

    test("computes negative momentum for falling prices", () => {
      const prices = fallingPrices(30);
      const momentum = computeMomentum(prices, 7);
      const lastMomentum = momentum[momentum.length - 1].momentum;
      expect(lastMomentum).toBeLessThan(0);
    });
  });

  describe("computeVolatility", () => {
    test("returns volatility for sufficient data", () => {
      const prices = generatePrices(60, 3000, 0, 100);
      const vol = computeVolatility(prices, 30);
      expect(vol).not.toBeNull();
      expect(vol.dailyVolatility).toBeGreaterThan(0);
      expect(vol.annualizedVolatility).toBeGreaterThan(vol.dailyVolatility);
    });

    test("returns null for insufficient data", () => {
      const prices = generatePrices(5, 3000);
      expect(computeVolatility(prices, 30)).toBeNull();
    });
  });

  describe("analyzeTrend", () => {
    test("returns full trend analysis", () => {
      const prices = generatePrices(60, 3000, 5);
      const result = analyzeTrend(prices);

      expect(result.currentPrice).toBeGreaterThan(0);
      expect(result.trend).toBeDefined();
      expect(result.movingAverages).toBeDefined();
      expect(result.priceRange).toBeDefined();
      expect(result.priceRange.high).toBeGreaterThanOrEqual(result.priceRange.low);
    });

    test("returns error for empty data", () => {
      const result = analyzeTrend([]);
      expect(result.error).toBeDefined();
    });

    test("detects rising trend", () => {
      const prices = risingPrices(60);
      const result = analyzeTrend(prices);
      expect(result.trend).toBe("rising");
    });

    test("detects falling trend", () => {
      const prices = fallingPrices(60);
      const result = analyzeTrend(prices);
      expect(result.trend).toBe("falling");
    });
  });
});

// ============================================
// Forecaster Tests
// ============================================
describe("Forecaster", () => {
  describe("linearRegression", () => {
    test("computes regression for perfect linear data", () => {
      const prices = [
        { price: 100 },
        { price: 200 },
        { price: 300 },
        { price: 400 },
      ];
      const reg = linearRegression(prices);
      expect(reg.slope).toBe(100);
      expect(reg.intercept).toBe(100);
      expect(reg.rSquared).toBe(1);
    });

    test("returns null for single point", () => {
      expect(linearRegression([{ price: 100 }])).toBeNull();
    });
  });

  describe("forecastPrices", () => {
    test("generates forecast for valid data", () => {
      const prices = generatePrices(30, 3000, 10);
      const result = forecastPrices(prices, 14);

      expect(result.error).toBeUndefined();
      expect(result.currentPrice).toBeGreaterThan(0);
      expect(result.forecast.predictions).toHaveLength(14);
      expect(result.confidence).toBeDefined();
    });

    test("predictions have confidence intervals", () => {
      const prices = generatePrices(30, 3000, 5);
      const result = forecastPrices(prices, 7);

      const prediction = result.forecast.predictions[0];
      expect(prediction.confidence90.lower).toBeLessThanOrEqual(prediction.predictedPrice);
      expect(prediction.confidence90.upper).toBeGreaterThanOrEqual(prediction.predictedPrice);
    });

    test("confidence interval widens over time", () => {
      const prices = generatePrices(30, 3000, 5, 100);
      const result = forecastPrices(prices, 14);
      const preds = result.forecast.predictions;
      const firstRange = preds[0].confidence90.upper - preds[0].confidence90.lower;
      const lastRange = preds[preds.length - 1].confidence90.upper - preds[preds.length - 1].confidence90.lower;
      expect(lastRange).toBeGreaterThan(firstRange);
    });

    test("returns error for insufficient data", () => {
      const result = forecastPrices([{ price: 100, recordedAt: "2025-01-01" }], 7);
      expect(result.error).toBeDefined();
    });
  });
});

// ============================================
// Seasonality Tests
// ============================================
describe("Seasonality", () => {
  describe("getSeasonalFactors", () => {
    test("returns default factors for known commodities", () => {
      const result = getSeasonalFactors("Maize");
      expect(result.source).toBe("default");
      expect(result.factors).toBeDefined();
      expect(Object.keys(result.factors)).toHaveLength(12);
    });

    test("returns neutral factors for unknown commodities", () => {
      const result = getSeasonalFactors("Unknown Crop");
      expect(result.source).toBe("neutral");
      Object.values(result.factors).forEach((f) => expect(f).toBe(1.0));
    });

    test("computes factors from sufficient data", () => {
      // Create 24 months of data with monthly variation
      const prices = [];
      for (let m = 0; m < 24; m++) {
        const date = new Date(2024, m % 12, 15);
        prices.push({
          price: 3000 + (m % 12) * 50, // Linearly increasing by month
          recordedAt: date.toISOString(),
        });
      }
      const result = getSeasonalFactors("Maize", prices);
      expect(result.source).toBe("computed");
    });
  });

  describe("analyzeSeasonalTiming", () => {
    test("returns seasonal analysis with signals", () => {
      const result = analyzeSeasonalTiming("Maize");
      expect(result.currentMonth).toBeDefined();
      expect(result.seasonalSignal).toBeDefined();
      expect(result.peakMonths).toHaveLength(3);
      expect(result.valleyMonths).toHaveLength(3);
    });

    test("identifies peak and valley months", () => {
      const result = analyzeSeasonalTiming("Beans");
      const peakNames = result.peakMonths.map((p) => p.month);
      const valleyNames = result.valleyMonths.map((v) => v.month);
      // Peak months should not be valley months
      peakNames.forEach((p) => {
        expect(valleyNames).not.toContain(p);
      });
    });
  });
});

// ============================================
// Recommendation Engine Tests
// ============================================
describe("Recommendation Engine", () => {
  describe("scoreStorageRisk", () => {
    test("high urgency when near max storage days", () => {
      const result = scoreStorageRisk({
        daysInStorage: 340,
        maxStorageDays: 365,
      });
      expect(result.score).toBeGreaterThan(25);
    });

    test("low score when plenty of storage time", () => {
      const result = scoreStorageRisk({
        daysInStorage: 30,
        maxStorageDays: 365,
      });
      expect(result.score).toBeLessThan(10);
    });

    test("adds urgency for high spoilage risk", () => {
      const result = scoreStorageRisk({
        daysInStorage: 30,
        maxStorageDays: 365,
        spoilageRisk: "high",
      });
      expect(result.score).toBeGreaterThan(20);
    });
  });

  describe("generateRecommendation", () => {
    test("generates SELL for falling prices with high storage risk", () => {
      const result = generateRecommendation({
        prices: fallingPrices(60),
        commodityName: "Maize",
        storageInfo: {
          daysInStorage: 330,
          maxStorageDays: 365,
          spoilageRisk: "high",
        },
      });
      expect(["SELL", "CONSIDER_SELLING"]).toContain(result.recommendation);
      expect(result.summary).toBeDefined();
      expect(result.scores).toBeDefined();
    });

    test("generates HOLD for rising prices with low storage risk", () => {
      const result = generateRecommendation({
        prices: risingPrices(60),
        commodityName: "Maize",
        storageInfo: {
          daysInStorage: 30,
          maxStorageDays: 365,
        },
      });
      expect(["HOLD", "STRONG_HOLD"]).toContain(result.recommendation);
    });

    test("includes all analysis sections", () => {
      const result = generateRecommendation({
        prices: generatePrices(60, 3000, 5),
        commodityName: "Beans",
      });

      expect(result.recommendation).toBeDefined();
      expect(result.urgency).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.compositeScore).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.scores.trend).toBeDefined();
      expect(result.scores.forecast).toBeDefined();
      expect(result.scores.seasonal).toBeDefined();
      expect(result.scores.storage).toBeDefined();
      expect(result.analysis.seasonal).toBeDefined();
      expect(result.generatedAt).toBeDefined();
    });

    test("works with minimal data (5 points)", () => {
      const prices = generatePrices(5, 3000, 10);
      const result = generateRecommendation({
        prices,
        commodityName: "Rice",
      });
      // Should still produce a recommendation, even with low confidence
      expect(result.recommendation).toBeDefined();
      expect(result.confidence).toBe("low");
    });
  });
});
