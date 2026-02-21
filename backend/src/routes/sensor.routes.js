const { Router } = require("express");
const { body, validationResult } = require("express-validator");
const { supabase } = require("../config/supabase");
const { AppError } = require("../middleware/errorHandler");
const { authenticate, authenticateDevice } = require("../middleware/auth");

const router = Router();

// ── POST sensor reading (device auth via API key) ──
router.post(
  "/",
  authenticateDevice,
  [
    body("temperature").isNumeric().withMessage("Temperature is required (numeric)"),
    body("humidity").isNumeric().withMessage("Humidity is required (numeric)"),
    body("storageUnitId").isUUID().withMessage("Valid storage unit ID is required"),
    body("recordedAt").optional().isISO8601(),
    body("batteryLevel").optional().isNumeric(),
    body("signalStrength").optional().isInt(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const { temperature, humidity, storageUnitId, recordedAt, batteryLevel, signalStrength } = req.body;

      // Validate the storage unit exists and API key matches
      const { data: unit, error: unitErr } = await supabase
        .from("agro_storage_units")
        .select("id, deviceId, deviceApiKey")
        .eq("id", storageUnitId)
        .maybeSingle();
      if (unitErr) throw new AppError(unitErr.message, 500);
      if (!unit) throw new AppError("Storage unit not found", 404);

      if (unit.deviceApiKey && unit.deviceApiKey !== req.deviceApiKey) {
        throw new AppError("Invalid device API key for this storage unit", 403);
      }

      // Reject obvious outliers
      if (temperature < -40 || temperature > 80) {
        throw new AppError("Temperature out of valid range (-40 to 80°C)", 400);
      }
      if (humidity < 0 || humidity > 100) {
        throw new AppError("Humidity out of valid range (0 to 100%)", 400);
      }

      const { data: reading, error } = await supabase
        .from("agro_sensor_readings")
        .insert({
          temperature,
          humidity,
          storageUnitId,
          recordedAt: recordedAt ? new Date(recordedAt).toISOString() : new Date().toISOString(),
          deviceId: unit.deviceId,
          batteryLevel,
          signalStrength,
        })
        .select("*")
        .single();
      if (error) throw new AppError(error.message, 500);

      res.status(201).json({ message: "Sensor reading recorded", reading });
    } catch (error) {
      next(error);
    }
  }
);

// ── GET readings for a storage unit (user auth) ──
router.get("/unit/:unitId", authenticate, async (req, res, next) => {
  try {
    const { unitId } = req.params;
    const { from, to, limit } = req.query;

    // Verify ownership
    const { data: unit } = await supabase
      .from("agro_storage_units")
      .select("id")
      .eq("id", unitId)
      .eq("ownerId", req.userId)
      .maybeSingle();
    if (!unit) throw new AppError("Storage unit not found", 404);

    let query = supabase
      .from("agro_sensor_readings")
      .select("*")
      .eq("storageUnitId", unitId)
      .order("recordedAt", { ascending: false })
      .limit(Math.min(parseInt(limit || "100", 10), 1000));

    if (from) query = query.gte("recordedAt", new Date(from).toISOString());
    if (to) query = query.lte("recordedAt", new Date(to).toISOString());

    const { data: readings, error } = await query;
    if (error) throw new AppError(error.message, 500);

    res.json({ readings, count: readings.length });
  } catch (error) {
    next(error);
  }
});

// ── GET latest reading for a storage unit ──
router.get("/unit/:unitId/latest", authenticate, async (req, res, next) => {
  try {
    const { data: unit } = await supabase
      .from("agro_storage_units")
      .select("id")
      .eq("id", req.params.unitId)
      .eq("ownerId", req.userId)
      .maybeSingle();
    if (!unit) throw new AppError("Storage unit not found", 404);

    const { data: latest, error } = await supabase
      .from("agro_sensor_readings")
      .select("*")
      .eq("storageUnitId", req.params.unitId)
      .order("recordedAt", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new AppError(error.message, 500);

    res.json({ reading: latest || null });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
