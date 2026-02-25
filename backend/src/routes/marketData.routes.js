const { Router } = require("express");
const { body, validationResult } = require("express-validator");
const { supabase } = require("../config/supabase");
const { AppError } = require("../middleware/errorHandler");
const { authenticate } = require("../middleware/auth");
const { getPricesByCounty, getLatestPrice, ensureRealMarketData } = require("../services/knbsPrice.service");

const router = Router();

// ── GET /latest — Latest price for a commodity in a market/county ──
router.get("/latest", async (req, res, next) => {
  try {
    const { commodityId, market, county } = req.query;
    if (!commodityId) throw new AppError("commodityId is required", 400);

    // Ensure we have real data
    await ensureRealMarketData(commodityId);

    const latest = await getLatestPrice(commodityId, { market, county });
    if (!latest) {
      return res.json({ price: null, message: "No price data available" });
    }

    res.json({ price: latest });
  } catch (error) {
    next(error);
  }
});

// ── GET /by-county — Prices for a commodity across markets in a county ──
router.get("/by-county", async (req, res, next) => {
  try {
    const { commodityId, county } = req.query;
    if (!commodityId) throw new AppError("commodityId is required", 400);

    // Ensure we have real data
    await ensureRealMarketData(commodityId);

    const prices = await getPricesByCounty(commodityId, county);

    // Group by market for display
    const byMarket = {};
    for (const p of prices) {
      const mkt = p.market || "Unknown";
      if (!byMarket[mkt]) {
        byMarket[mkt] = { market: mkt, county: p.county, prices: [] };
      }
      byMarket[mkt].prices.push({
        price: p.price,
        date: p.recordedAt,
        source: p.source,
        currency: p.currency,
      });
    }

    res.json({
      commodityId,
      county: county || "All",
      markets: Object.values(byMarket),
      totalRecords: prices.length,
    });
  } catch (error) {
    next(error);
  }
});

// ── GET / — Market data with filters ──
router.get("/", async (req, res, next) => {
  try {
    const { commodityId, from, to, market, county, limit } = req.query;

    let query = supabase
      .from("agro_market_data")
      .select("*, commodity:agro_commodities(*)")
      .order("recordedAt", { ascending: false })
      .limit(Math.min(parseInt(limit || "100", 10), 1000));

    if (commodityId) query = query.eq("commodityId", commodityId);
    if (market) query = query.eq("market", market);
    if (county) query = query.ilike("county", `%${county}%`);
    if (from) query = query.gte("recordedAt", new Date(from).toISOString());
    if (to) query = query.lte("recordedAt", new Date(to).toISOString());

    const { data, error } = await query;
    if (error) throw new AppError(error.message, 500);

    res.json({ marketData: data, count: data.length });
  } catch (error) {
    next(error);
  }
});

// ── POST manual market price entry (authenticated) ──
router.post(
  "/",
  authenticate,
  [
    body("price").isNumeric().withMessage("Price is required"),
    body("commodityId").isUUID().withMessage("Valid commodity ID is required"),
    body("market").optional().trim(),
    body("county").optional().trim(),
    body("currency").optional().trim(),
    body("recordedAt").optional().isISO8601(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const { price, commodityId, market, county, currency, recordedAt } = req.body;
      const { data: entry, error } = await supabase
        .from("agro_market_data")
        .insert({
          price,
          commodityId,
          market,
          county,
          currency: currency || "KES",
          source: "manual",
          recordedAt: recordedAt ? new Date(recordedAt).toISOString() : new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw new AppError(error.message, 500);

      res.status(201).json({ message: "Market data recorded", marketData: entry });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
