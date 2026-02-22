const { Router } = require("express");
const { AppError } = require("../middleware/errorHandler");
const { authenticate } = require("../middleware/auth");
const { getStorageUnitRecommendation } = require("../services/marketAnalysis.service");

const router = Router();

router.use(authenticate);

// ── GET recommendation for a storage unit ──
router.get("/:unitId", async (req, res, next) => {
  try {
    const result = await getStorageUnitRecommendation(req.params.unitId, req.userId);

    if (result.error) {
      return res.json({
        status: "insufficient_data",
        message: result.error,
        unitId: req.params.unitId,
        ...result,
      });
    }

    res.json({
      status: "ok",
      ...result,
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
});

module.exports = router;
