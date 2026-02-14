import { Router, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { Alert } from "../entities/Alert";
import { AppError } from "../middleware/errorHandler";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
const alertRepo = () => AppDataSource.getRepository(Alert);

router.use(authenticate);

// ── GET my alerts ──
router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { unreadOnly, type, limit } = req.query;

    const where: any = { userId: req.userId };
    if (unreadOnly === "true") where.isRead = false;
    if (type) where.type = type;

    const alerts = await alertRepo().find({
      where,
      relations: ["storageUnit"],
      order: { createdAt: "DESC" },
      take: Math.min(parseInt((limit as string) || "50", 10), 200),
    });

    res.json({ alerts, count: alerts.length });
  } catch (error) {
    next(error);
  }
});

// ── Mark alert as read ──
router.patch("/:id/read", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const alert = await alertRepo().findOne({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!alert) {
      throw new AppError("Alert not found", 404);
    }

    alert.isRead = true;
    await alertRepo().save(alert);

    res.json({ message: "Alert marked as read" });
  } catch (error) {
    next(error);
  }
});

// ── Mark all alerts as read ──
router.patch("/read-all", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await alertRepo().update({ userId: req.userId, isRead: false }, { isRead: true });
    res.json({ message: "All alerts marked as read" });
  } catch (error) {
    next(error);
  }
});

export default router;
