const { Router } = require("express");
const { AppError } = require("../middleware/errorHandler");
const { authenticate } = require("../middleware/auth");

const router = Router();

router.use(authenticate);

// ── GET recommendation for a storage unit ──

router.get("/:unitId", async (req, res, next) => {
  try {
    res.json({
      message: "Recommendation engine coming in Phase 3",
      unitId: req.params.unitId,
      recommendation: null,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
