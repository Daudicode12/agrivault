const { Router } = require("express");
const { body, validationResult } = require("express-validator");
const { supabase } = require("../config/supabase");
const { AppError } = require("../middleware/errorHandler");
const { authenticate } = require("../middleware/auth");

const router = Router();

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

      const { name, location, capacityKg, commodityId } = req.body;
      const { data: unit, error } = await supabase
        .from("storage_units")
        .insert({ name, location, capacityKg, commodityId, ownerId: req.userId })
        .select("*")
        .single();
      if (error) throw new AppError(error.message, 500);

      res.status(201).json({ message: "Storage unit created", storageUnit: unit });
    } catch (error) {
      next(error);
    }
  }
);

// ── List My Storage Units ──
router.get("/", async (req, res, next) => {
  try {
    const { data: units, error } = await supabase
      .from("storage_units")
      .select("*, commodity:commodities(*)")
      .eq("ownerId", req.userId)
      .order("createdAt", { ascending: false });
    if (error) throw new AppError(error.message, 500);

    res.json({ storageUnits: units });
  } catch (error) {
    next(error);
  }
});

// ── Get Single Storage Unit ──
router.get("/:id", async (req, res, next) => {
  try {
    const { data: unit, error } = await supabase
      .from("storage_units")
      .select("*, commodity:commodities(*)")
      .eq("id", req.params.id)
      .eq("ownerId", req.userId)
      .maybeSingle();
    if (error) throw new AppError(error.message, 500);
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
      const { name, location, capacityKg, currentStockKg, status, commodityId } = req.body;
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (location !== undefined) updates.location = location;
      if (capacityKg !== undefined) updates.capacityKg = capacityKg;
      if (currentStockKg !== undefined) updates.currentStockKg = currentStockKg;
      if (status !== undefined) updates.status = status;
      if (commodityId !== undefined) updates.commodityId = commodityId;

      const { data: unit, error } = await supabase
        .from("storage_units")
        .update(updates)
        .eq("id", req.params.id)
        .eq("ownerId", req.userId)
        .select("*")
        .single();
      if (error) throw new AppError(error.message, 500);
      if (!unit) throw new AppError("Storage unit not found", 404);

      res.json({ message: "Storage unit updated", storageUnit: unit });
    } catch (error) {
      next(error);
    }
  }
);

// ── Delete Storage Unit ──
router.delete("/:id", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("storage_units")
      .delete()
      .eq("id", req.params.id)
      .eq("ownerId", req.userId)
      .select("id");
    if (error) throw new AppError(error.message, 500);
    if (!data || data.length === 0) {
      throw new AppError("Storage unit not found", 404);
    }
    res.json({ message: "Storage unit deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
