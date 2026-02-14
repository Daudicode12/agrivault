import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "./env";
import { User } from "../entities/User";
import { StorageUnit } from "../entities/StorageUnit";
import { Commodity } from "../entities/Commodity";
import { SensorReading } from "../entities/SensorReading";
import { MarketData } from "../entities/MarketData";
import { Alert } from "../entities/Alert";
import { PredictionLog } from "../entities/PredictionLog";

export const AppDataSource = new DataSource({
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
  migrations: ["src/migrations/*.ts"],
});
