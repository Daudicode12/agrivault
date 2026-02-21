const bcrypt = require("bcryptjs");
const { AppDataSource } = require("../config/database");
const { User } = require("../entities/User");
const { Commodity } = require("../entities/Commodity");
const { StorageUnit } = require("../entities/StorageUnit");
const { logger } = require("../utils/logger");

const seed = async () => {
  try {
    await AppDataSource.initialize();
    logger.info("Database connected for seeding...");

    const userRepo = AppDataSource.getRepository(User);
    const commodityRepo = AppDataSource.getRepository(Commodity);
    const unitRepo = AppDataSource.getRepository(StorageUnit);

    // ── Seed Commodities ──
    const commodities = [
      {
        name: "Maize",
        category: "Grain",
        optimalTempMin: 10,
        optimalTempMax: 15,
        optimalHumidityMin: 12,
        optimalHumidityMax: 14,
        maxStorageDays: 365,
        unit: "bag (90kg)",
      },
      {
        name: "Wheat",
        category: "Grain",
        optimalTempMin: 10,
        optimalTempMax: 15,
        optimalHumidityMin: 11,
        optimalHumidityMax: 13,
        maxStorageDays: 365,
        unit: "bag (90kg)",
      },
      {
        name: "Rice",
        category: "Grain",
        optimalTempMin: 15,
        optimalTempMax: 20,
        optimalHumidityMin: 12,
        optimalHumidityMax: 14,
        maxStorageDays: 365,
        unit: "bag (50kg)",
      },
      {
        name: "Beans",
        category: "Legume",
        optimalTempMin: 10,
        optimalTempMax: 18,
        optimalHumidityMin: 12,
        optimalHumidityMax: 15,
        maxStorageDays: 180,
        unit: "bag (90kg)",
      },
      {
        name: "Sorghum",
        category: "Grain",
        optimalTempMin: 10,
        optimalTempMax: 15,
        optimalHumidityMin: 12,
        optimalHumidityMax: 14,
        maxStorageDays: 365,
        unit: "bag (90kg)",
      },
      {
        name: "Irish Potatoes",
        category: "Tuber",
        optimalTempMin: 4,
        optimalTempMax: 8,
        optimalHumidityMin: 85,
        optimalHumidityMax: 95,
        maxStorageDays: 90,
        unit: "kg",
      },
      {
        name: "Coffee (dried)",
        category: "Cash Crop",
        optimalTempMin: 15,
        optimalTempMax: 20,
        optimalHumidityMin: 10,
        optimalHumidityMax: 12,
        maxStorageDays: 365,
        unit: "kg",
      },
    ];

    for (const c of commodities) {
      const exists = await commodityRepo.findOne({ where: { name: c.name } });
      if (!exists) {
        await commodityRepo.save(commodityRepo.create(c));
        logger.info(`Seeded commodity: ${c.name}`);
      }
    }

    // ── Seed Demo User ──
    const demoEmail = "farmer@agrovault.dev";
    let demoUser = await userRepo.findOne({ where: { email: demoEmail } });
    if (!demoUser) {
      demoUser = userRepo.create({
        fullName: "Demo Farmer",
        email: demoEmail,
        password: await bcrypt.hash("password123", 12),
        phone: "+254700000000",
        location: "Nakuru, Kenya",
        role: "farmer",
      });
      await userRepo.save(demoUser);
      logger.info("Seeded demo user: farmer@agrovault.dev / password123");
    }

    // ── Seed Demo Storage Unit ──
    const maize = await commodityRepo.findOne({ where: { name: "Maize" } });
    const existingUnit = await unitRepo.findOne({ where: { ownerId: demoUser.id, name: "Barn A - Maize Storage" } });
    if (!existingUnit && maize) {
      const unit = unitRepo.create({
        name: "Barn A - Maize Storage",
        location: "-0.3031, 36.0800",
        capacityKg: 5000,
        currentStockKg: 3200,
        status: "active",
        deviceId: "ESP32-001",
        deviceApiKey: "dev_api_key_001",
        ownerId: demoUser.id,
        commodityId: maize.id,
      });
      await unitRepo.save(unit);
      logger.info("Seeded storage unit: Barn A - Maize Storage");
    }

    logger.info("Seeding complete!");
    process.exit(0);
  } catch (error) {
    logger.error("Seed failed:", error);
    process.exit(1);
  }
};

seed();
