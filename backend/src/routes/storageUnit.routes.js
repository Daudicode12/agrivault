const { Router } = require("express");
const { body, validationResult } = require("express-validator");
const { AppDataSource } = require("../config/database");
const { StorageUnit } = require("../entities/StorageUnit");
const { AppError } = require("../middleware/errorHandler");
const { authenticate } = require("../middleware/auth");

const router = Router();
const unitRepo = () => AppDataSource.getRepository(StorageUnit);

// All routes require authentication
router.use(authenticate);

// ── Create Storage Unit ──
router.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("Storage unit name is required"),
    body("location").optional().trim(),
    body("capacityKg").optional().isNumeric(),
    body("commodityId").optional().isUUID(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const unit = unitRepo().create({
        ...req.body,
        ownerId: req.userId,
      });
      await unitRepo().save(unit);

      res.status(201).json({ message: "Storage unit created", storageUnit: unit });
    } catch (error) {
      next(error);
    }
  }
);

// ── List My Storage Units ──
router.get("/", async (req, res, next) => {
  try {
    const units = await unitRepo().find({
      where: { ownerId: req.userId },
      relations: ["commodity"],
      order: { createdAt: "DESC" },
    });
    res.json({ storageUnits: units });
  } catch (error) {
    next(error);
  }
});

// ── Get Single Storage Unit ──
router.get("/:id", async (req, res, next) => {
  try {
    const unit = await unitRepo().findOne({
      where: { id: req.params.id, ownerId: req.userId },
      relations: ["commodity"],
    });
    if (!unit) {
      throw new AppError("Storage unit not found", 404);
    }
    res.json({ storageUnit: unit });
  } catch (error) {
    next(error);
  }
});

// ── Update Storage Unit ──
router.put(
  "/:id",
  [
    body("name").optional().trim().notEmpty(),
    body("location").optional().trim(),
    body("capacityKg").optional().isNumeric(),
    body("currentStockKg").optional().isNumeric(),
    body("status").optional().isIn(["active", "inactive", "maintenance"]),
    body("commodityId").optional().isUUID(),
  ],
  async (req, res, next) => {
    try {
      const unit = await unitRepo().findOne({
        where: { id: req.params.id, ownerId: req.userId },
      });
      if (!unit) {
        throw new AppError("Storage unit not found", 404);
      }

      unitRepo().merge(unit, req.body);
      await unitRepo().save(unit);

      res.json({ message: "Storage unit updated", storageUnit: unit });
    } catch (error) {
      next(error);
    }
  }
);

// ── Delete Storage Unit ──
router.delete("/:id", async (req, res, next) => {
  try {
    const result = await unitRepo().delete({ id: req.params.id, ownerId: req.userId });
    if (result.affected === 0) {
      throw new AppError("Storage unit not found", 404);
    }
    res.json({ message: "Storage unit deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
