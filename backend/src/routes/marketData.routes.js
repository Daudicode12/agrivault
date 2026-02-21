const { Router } = require("express");
const { body, validationResult } = require("express-validator");
const { supabase } = require("../config/supabase");
const { AppError } = require("../middleware/errorHandler");
const { authenticate } = require("../middleware/auth");

const router = Router();

// ── GET market data with filters ──
router.get("/", async (req, res, next) => {
  try {
    const { commodityId, from, to, market, limit } = req.query;

    let query = supabase
      .from("agro_market_data")
      .select("*, commodity:agro_commodities(*)")
      .order("recordedAt", { ascending: false })
      .limit(Math.min(parseInt(limit || "100", 10), 1000));

    if (commodityId) query = query.eq("commodityId", commodityId);
    if (market) query = query.eq("market", market);
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
    body("currency").optional().trim(),
    body("recordedAt").optional().isISO8601(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const { price, commodityId, market, currency, recordedAt } = req.body;
      const { data: entry, error } = await supabase
        .from("agro_market_data")
        .insert({
          price,
          commodityId,
          market,
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
