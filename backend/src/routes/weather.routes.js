/**
 * Weather Routes
 *
 * Provides weather data for storage unit locations.
 *
 * Routes:
 *   GET /api/weather/location?q=Nakuru     — Weather for a named location
 *   GET /api/weather/storage/:unitId       — Weather for a storage unit's location (auth)
 */

const { Router } = require("express");
const { supabase } = require("../config/supabase");
const { AppError } = require("../middleware/errorHandler");
const { authenticate } = require("../middleware/auth");
const {
  getWeatherForLocation,
  assessStorageRisk,
} = require("../services/weather.service");

const router = Router();

// ── GET /location — Weather for a named location ──
router.get("/location", async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) throw new AppError("Location query (q) is required", 400);

    const weather = await getWeatherForLocation(q);
    if (!weather) {
      throw new AppError(`Could not fetch weather for "${q}"`, 503);
    }

    res.json({ location: q, weather });
  } catch (error) {
    next(error);
  }
});

// ── GET /storage/:unitId — Weather for a storage unit's location (auth) ──
router.get("/storage/:unitId", authenticate, async (req, res, next) => {
  try {
    const { unitId } = req.params;

    // Get storage unit with commodity info
    const { data: unit, error } = await supabase
      .from("agro_storage_units")
      .select("id, name, location, commodity:agro_commodities(*)")
      .eq("id", unitId)
      .eq("ownerId", req.userId)
      .maybeSingle();

    if (error) throw new AppError(error.message, 500);
    if (!unit) throw new AppError("Storage unit not found", 404);

    if (!unit.location) {
      return res.json({
        storageUnit: { id: unit.id, name: unit.name, location: null },
        weather: null,
        message: "No location set for this storage unit. Update the location to see weather data.",
      });
    }

    const weather = await getWeatherForLocation(unit.location);
    if (!weather) {
      throw new AppError(`Could not fetch weather for "${unit.location}"`, 503);
    }

    // Assess storage risk if commodity has optimal conditions defined
    const risk = unit.commodity
      ? assessStorageRisk(weather, unit.commodity)
      : null;

    res.json({
      storageUnit: {
        id: unit.id,
        name: unit.name,
        location: unit.location,
        commodity: unit.commodity?.name || null,
      },
      weather,
      storageRisk: risk,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
