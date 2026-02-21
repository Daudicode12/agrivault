const { Router } = require("express");
const { body, validationResult } = require("express-validator");
const { AppDataSource } = require("../config/database");
const { MarketData } = require("../entities/MarketData");
const { AppError } = require("../middleware/errorHandler");
const { authenticate } = require("../middleware/auth");
const { Between, MoreThanOrEqual, LessThanOrEqual } = require("typeorm");

const router = Router();
const marketRepo = () => AppDataSource.getRepository(MarketData);

// ── GET market data with filters ──
router.get("/", async (req, res, next) => {
  try {
    const { commodityId, from, to, market, limit } = req.query;

    const where = {};
    if (commodityId) where.commodityId = commodityId;
    if (market) where.market = market;

    if (from && to) {
      where.recordedAt = Between(new Date(from), new Date(to));
    } else if (from) {
      where.recordedAt = MoreThanOrEqual(new Date(from));
    } else if (to) {
      where.recordedAt = LessThanOrEqual(new Date(to));
    }

    const data = await marketRepo().find({
      where,
      relations: ["commodity"],
      order: { recordedAt: "DESC" },
      take: Math.min(parseInt(limit || "100", 10), 1000),
    });

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

      const entry = marketRepo().create({
        ...req.body,
        source: "manual",
        recordedAt: req.body.recordedAt ? new Date(req.body.recordedAt) : new Date(),
      });
      await marketRepo().save(entry);

      res.status(201).json({ message: "Market data recorded", marketData: entry });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
