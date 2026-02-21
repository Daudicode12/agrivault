const { DataSource } = require("typeorm");
const { config } = require("./env");
const { User } = require("../entities/User");
const { StorageUnit } = require("../entities/StorageUnit");
const { Commodity } = require("../entities/Commodity");
const { SensorReading } = require("../entities/SensorReading");
const { MarketData } = require("../entities/MarketData");
const { Alert } = require("../entities/Alert");
const { PredictionLog } = require("../entities/PredictionLog");

const AppDataSource = new DataSource({
  type: "postgres",
  url: config.db.url || undefined,
  host: config.db.url ? undefined : config.db.host,
  port: config.db.url ? undefined : config.db.port,
  username: config.db.url ? undefined : config.db.username,
  password: config.db.url ? undefined : config.db.password,
  database: config.db.url ? undefined : config.db.name,
  synchronize: config.nodeEnv === "development", // Auto-sync in dev only
  logging: config.nodeEnv === "development",
  ssl: {
    rejectUnauthorized: false, // Required for Supabase
  },
  entities: [User, StorageUnit, Commodity, SensorReading, MarketData, Alert, PredictionLog],
  migrations: ["src/migrations/*.js"],
});

module.exports = { AppDataSource };
