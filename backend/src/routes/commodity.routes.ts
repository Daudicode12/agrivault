import { Router, Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { AppDataSource } from "../config/database";
import { Commodity } from "../entities/Commodity";
import { AppError } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";

const router = Router();
const commodityRepo = () => AppDataSource.getRepository(Commodity);

// ── List All Commodities (public) ──
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const commodities = await commodityRepo().find({ order: { name: "ASC" } });
    res.json({ commodities });
  } catch (error) {
    next(error);
  }
});

// ── Get Single Commodity ──
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commodity = await commodityRepo().findOne({ where: { id: req.params.id } });
    if (!commodity) {
      throw new AppError("Commodity not found", 404);
    }
    res.json({ commodity });
  } catch (error) {
    next(error);
  }
});

// ── Create Commodity (authenticated) ──
router.post(
  "/",
  authenticate,
  [
    body("name").trim().notEmpty().withMessage("Commodity name is required"),
    body("category").optional().trim(),
    body("optimalTempMin").optional().isNumeric(),
    body("optimalTempMax").optional().isNumeric(),
    body("optimalHumidityMin").optional().isNumeric(),
    body("optimalHumidityMax").optional().isNumeric(),
    body("maxStorageDays").optional().isInt({ min: 1 }),
    body("unit").optional().trim(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const existing = await commodityRepo().findOne({ where: { name: req.body.name } });
      if (existing) {
        throw new AppError("Commodity already exists", 409);
      }

      const commodity = commodityRepo().create(req.body);
      await commodityRepo().save(commodity);

      res.status(201).json({ message: "Commodity created", commodity });
    } catch (error) {
      next(error);
    }
  }
);

// ── Update Commodity ──
router.put("/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commodity = await commodityRepo().findOne({ where: { id: req.params.id } });
    if (!commodity) {
      throw new AppError("Commodity not found", 404);
    }

    commodityRepo().merge(commodity, req.body);
    await commodityRepo().save(commodity);

    res.json({ message: "Commodity updated", commodity });
  } catch (error) {
    next(error);
  }
});

// ── Delete Commodity ──
router.delete("/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await commodityRepo().delete({ id: req.params.id });
    if (result.affected === 0) {
      throw new AppError("Commodity not found", 404);
    }
    res.json({ message: "Commodity deleted" });
  } catch (error) {
    next(error);
  }
});

export default router;
