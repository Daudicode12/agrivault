import { Router, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(authenticate);

// ── GET recommendation for a storage unit ──
// TODO: Implement in Phase 3 (Day 14) — Combined Decision Intelligence Engine
router.get("/:unitId", async (req: AuthRequest, res: Response, next: NextFunction) => {
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

export default router;
