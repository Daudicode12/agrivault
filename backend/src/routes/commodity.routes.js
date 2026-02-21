const { Router } = require("express");
const { body, validationResult } = require("express-validator");
const { supabase } = require("../config/supabase");
const { AppError } = require("../middleware/errorHandler");
const { authenticate } = require("../middleware/auth");

const router = Router();

// ── List All Commodities (public) ──
router.get("/", async (_req, res, next) => {
  try {
    const { data: commodities, error } = await supabase
      .from("commodities")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw new AppError(error.message, 500);
    res.json({ commodities });
  } catch (error) {
    next(error);
  }
});

// ── Get Single Commodity ──
router.get("/:id", async (req, res, next) => {
  try {
    const { data: commodity, error } = await supabase
      .from("commodities")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();
    if (error) throw new AppError(error.message, 500);
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
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const { data: existing } = await supabase
        .from("commodities")
        .select("id")
        .eq("name", req.body.name)
        .maybeSingle();
      if (existing) {
        throw new AppError("Commodity already exists", 409);
      }

      const { data: commodity, error } = await supabase
        .from("commodities")
        .insert(req.body)
        .select("*")
        .single();
      if (error) throw new AppError(error.message, 500);

      res.status(201).json({ message: "Commodity created", commodity });
    } catch (error) {
      next(error);
    }
  }
);

// ── Update Commodity ──
router.put("/:id", authenticate, async (req, res, next) => {
  try {
    const { data: commodity, error } = await supabase
      .from("commodities")
      .update(req.body)
      .eq("id", req.params.id)
      .select("*")
      .single();
    if (error) throw new AppError(error.message, 500);
    if (!commodity) throw new AppError("Commodity not found", 404);

    res.json({ message: "Commodity updated", commodity });
  } catch (error) {
    next(error);
  }
});

// ── Delete Commodity ──
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("commodities")
      .delete()
      .eq("id", req.params.id)
      .select("id");
    if (error) throw new AppError(error.message, 500);
    if (!data || data.length === 0) {
      throw new AppError("Commodity not found", 404);
    }
    res.json({ message: "Commodity deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
