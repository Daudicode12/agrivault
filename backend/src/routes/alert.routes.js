const { Router } = require("express");
const { supabase } = require("../config/supabase");
const { AppError } = require("../middleware/errorHandler");
const { authenticate } = require("../middleware/auth");

const router = Router();

router.use(authenticate);

// ── GET my alerts ──
router.get("/", async (req, res, next) => {
  try {
    const { unreadOnly, type, limit } = req.query;

    let query = supabase
      .from("agro_alerts")
      .select("*, storageUnit:storage_units(*)")
      .eq("userId", req.userId)
      .order("createdAt", { ascending: false })
      .limit(Math.min(parseInt(limit || "50", 10), 200));

    if (unreadOnly === "true") query = query.eq("isRead", false);
    if (type) query = query.eq("type", type);

    const { data: alerts, error } = await query;
    if (error) throw new AppError(error.message, 500);

    res.json({ alerts, count: alerts.length });
  } catch (error) {
    next(error);
  }
});

// ── Mark alert as read ──
router.patch("/:id/read", async (req, res, next) => {
  try {
    const { data: alert, error } = await supabase
      .from("agro_alerts")
      .update({ isRead: true })
      .eq("id", req.params.id)
      .eq("userId", req.userId)
      .select("*")
      .maybeSingle();
    if (error) throw new AppError(error.message, 500);
    if (!alert) throw new AppError("Alert not found", 404);

    res.json({ message: "Alert marked as read" });
  } catch (error) {
    next(error);
  }
});

// ── Mark all alerts as read ──
router.patch("/read-all", async (req, res, next) => {
  try {
    const { error } = await supabase
      .from("agro_alerts")
      .update({ isRead: true })
      .eq("userId", req.userId)
      .eq("isRead", false);
    if (error) throw new AppError(error.message, 500);

    res.json({ message: "All alerts marked as read" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
