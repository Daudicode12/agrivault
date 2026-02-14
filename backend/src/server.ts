import "reflect-metadata";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config/env";
import { AppDataSource } from "./config/database";
import { logger } from "./utils/logger";

// Route imports
import authRoutes from "./routes/auth.routes";
import storageUnitRoutes from "./routes/storageUnit.routes";
import commodityRoutes from "./routes/commodity.routes";
import sensorRoutes from "./routes/sensor.routes";
import marketDataRoutes from "./routes/marketData.routes";
import alertRoutes from "./routes/alert.routes";
import recommendationRoutes from "./routes/recommendation.routes";

// Middleware imports
import { errorHandler } from "./middleware/errorHandler";

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

// ── Error Handler (must be last) ──
app.use(errorHandler);

// ── Start Server ──
const startServer = async () => {
  try {
    await AppDataSource.initialize();
    logger.info("Database connected successfully (Supabase)");

    app.listen(config.port, () => {
      logger.info(`AgroVault API running on port ${config.port} [${config.nodeEnv}]`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;
