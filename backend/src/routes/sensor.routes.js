const { Router } = require("express");
const { body, validationResult } = require("express-validator");
const { AppDataSource } = require("../config/database");
const { SensorReading } = require("../entities/SensorReading");
const { StorageUnit } = require("../entities/StorageUnit");
const { AppError } = require("../middleware/errorHandler");
const { authenticate, authenticateDevice } = require("../middleware/auth");
const { Between, LessThanOrEqual, MoreThanOrEqual } = require("typeorm");

const router = Router();
const readingRepo = () => AppDataSource.getRepository(SensorReading);
const unitRepo = () => AppDataSource.getRepository(StorageUnit);

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
      const unit = await unitRepo().findOne({ where: { id: storageUnitId } });
      if (!unit) {
        throw new AppError("Storage unit not found", 404);
      }

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

      const reading = readingRepo().create({
        temperature,
        humidity,
        storageUnitId,
        recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
        deviceId: unit.deviceId,
        batteryLevel,
        signalStrength,
      });
      await readingRepo().save(reading);

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
    const unit = await unitRepo().findOne({ where: { id: unitId, ownerId: req.userId } });
    if (!unit) {
      throw new AppError("Storage unit not found", 404);
    }

    const where = { storageUnitId: unitId };
    if (from && to) {
      where.recordedAt = Between(new Date(from), new Date(to));
    } else if (from) {
      where.recordedAt = MoreThanOrEqual(new Date(from));
    } else if (to) {
      where.recordedAt = LessThanOrEqual(new Date(to));
    }

    const readings = await readingRepo().find({
      where,
      order: { recordedAt: "DESC" },
      take: Math.min(parseInt(limit || "100", 10), 1000),
    });

    res.json({ readings, count: readings.length });
  } catch (error) {
    next(error);
  }
});

// ── GET latest reading for a storage unit ──
router.get("/unit/:unitId/latest", authenticate, async (req, res, next) => {
  try {
    const unit = await unitRepo().findOne({ where: { id: req.params.unitId, ownerId: req.userId } });
    if (!unit) {
      throw new AppError("Storage unit not found", 404);
    }

    const latest = await readingRepo().findOne({
      where: { storageUnitId: req.params.unitId },
      order: { recordedAt: "DESC" },
    });

    res.json({ reading: latest || null });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
