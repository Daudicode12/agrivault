import { Router, Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { AppDataSource } from "../config/database";
import { MarketData } from "../entities/MarketData";
import { AppError } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";
import { Between, MoreThanOrEqual, LessThanOrEqual } from "typeorm";

const router = Router();
const marketRepo = () => AppDataSource.getRepository(MarketData);

// ── GET market data with filters ──
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { commodityId, from, to, market, limit } = req.query;

    const where: any = {};
    if (commodityId) where.commodityId = commodityId;
    if (market) where.market = market;

    if (from && to) {
      where.recordedAt = Between(new Date(from as string), new Date(to as string));
    } else if (from) {
      where.recordedAt = MoreThanOrEqual(new Date(from as string));
    } else if (to) {
      where.recordedAt = LessThanOrEqual(new Date(to as string));
    }

    const data = await marketRepo().find({
      where,
      relations: ["commodity"],
      order: { recordedAt: "DESC" },
      take: Math.min(parseInt((limit as string) || "100", 10), 1000),
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
  async (req: Request, res: Response, next: NextFunction) => {
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

export default router;
