/**
 * Scraper Routes
 *
 * Provides API endpoints to trigger and monitor market data scrapers.
 *
 * Routes:
 *   POST /api/scrapers/run           — Trigger a scraper run (auth required)
 *   GET  /api/scrapers/sources       — List available scraper sources
 *   GET  /api/scrapers/status        — Get last scrape run status
 */

const { Router } = require("express");
const path = require("path");
const { AppError } = require("../middleware/errorHandler");
const { authenticate } = require("../middleware/auth");

const scraperPath = path.resolve(__dirname, "../../../market-engine/scrapers");
const { runScrapers, SCRAPER_REGISTRY } = require(scraperPath);

const router = Router();

// Track last run result in memory
let lastRunResult = null;
let isRunning = false;

// ── GET /sources — List available scraper sources ──
router.get("/sources", (_req, res) => {
  const sources = Object.keys(SCRAPER_REGISTRY).map((name) => ({
    name,
    description: {
      knbs: "Kenya National Bureau of Statistics — CPI food prices, producer prices, statistical bulletins",
      eagc: "Eastern Africa Grain Council (RATIN) — Regional grain market prices across East Africa",
      fao: "FAO FPMA / GIEWS — Global food price monitoring with Kenya-specific data",
    }[name] || name,
  }));

  res.json({ sources });
});

// ── GET /status — Last scrape run status ──
router.get("/status", (_req, res) => {
  res.json({
    isRunning,
    lastRun: lastRunResult,
  });
});

// ── POST /run — Trigger a scraper run (auth required) ──
router.post("/run", authenticate, async (req, res, next) => {
  try {
    if (isRunning) {
      return res.status(409).json({
        status: "busy",
        message: "A scraper run is already in progress. Please wait.",
      });
    }

    const { sources = ["all"], dryRun = false } = req.body;

    // Validate sources
    const validSources = Object.keys(SCRAPER_REGISTRY);
    if (!sources.includes("all")) {
      const invalid = sources.filter((s) => !validSources.includes(s));
      if (invalid.length > 0) {
        throw new AppError(`Unknown scraper sources: ${invalid.join(", ")}. Available: ${validSources.join(", ")}`, 400);
      }
    }

    isRunning = true;

    // Run scrapers (this can take a while)
    const result = await runScrapers({ sources, dryRun });

    lastRunResult = {
      ...result,
      triggeredBy: req.userId,
      completedAt: new Date().toISOString(),
    };

    isRunning = false;

    res.json({
      status: "ok",
      message: `Scraper run complete. ${result.inserted} new entries ingested.`,
      result: lastRunResult,
    });
  } catch (error) {
    isRunning = false;
    next(error instanceof AppError ? error : new AppError(error.message, 500));
  }
});

module.exports = router;
