const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { config } = require("./config/env");
const { logger } = require("./utils/logger");
const { verifyConnection } = require("./config/supabase");

// Route imports
const authRoutes = require("./routes/auth.routes");
const storageUnitRoutes = require("./routes/storageUnit.routes");
const commodityRoutes = require("./routes/commodity.routes");
const sensorRoutes = require("./routes/sensor.routes");
const marketDataRoutes = require("./routes/marketData.routes");
const alertRoutes = require("./routes/alert.routes");
const recommendationRoutes = require("./routes/recommendation.routes");
const marketAnalysisRoutes = require("./routes/marketAnalysis.routes");
const scraperRoutes = require("./routes/scraper.routes");
const weatherRoutes = require("./routes/weather.routes");

// Middleware imports
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

// ── Security & Parsing Middleware ──
app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiting ──
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", limiter);

// ── Health Check ──
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "agrovault-api",
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ──
app.use("/api/auth", authRoutes);
app.use("/api/storage-units", storageUnitRoutes);
app.use("/api/commodities", commodityRoutes);
app.use("/api/sensor-readings", sensorRoutes);
app.use("/api/market-data", marketDataRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/market-analysis", marketAnalysisRoutes);
app.use("/api/scrapers", scraperRoutes);
app.use("/api/weather", weatherRoutes);

// ── Error Handler that handles all the errors that may arise ──
app.use(errorHandler);

// ── Start Server ──
const startServer = async () => {
  try {
    await verifyConnection();
    logger.info("Supabase connection verified");

    app.listen(config.port, () => {
      logger.info(`AgroVault API running on port ${config.port} [${config.nodeEnv}]`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
