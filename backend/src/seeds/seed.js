const bcrypt = require("bcryptjs");
const { supabase } = require("../config/supabase");
const { logger } = require("../utils/logger");

const seed = async () => {
  try {
    logger.info("Starting seed via Supabase JS...");

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
      const { data: exists } = await supabase
        .from("commodities")
        .select("id")
        .eq("name", c.name)
        .maybeSingle();
      if (!exists) {
        const { error } = await supabase.from("commodities").insert(c);
        if (error) throw error;
        logger.info(`Seeded commodity: ${c.name}`);
      }
    }

    // ── Seed Demo User ──
    const demoEmail = "farmer@agrovault.dev";
    let { data: demoUser } = await supabase
      .from("users")
      .select("*")
      .eq("email", demoEmail)
      .maybeSingle();

    if (!demoUser) {
      const { data: newUser, error } = await supabase
        .from("users")
        .insert({
          fullName: "Demo Farmer",
          email: demoEmail,
          password: await bcrypt.hash("password123", 12),
          phone: "+254700000000",
          location: "Nakuru, Kenya",
          role: "farmer",
        })
        .select("*")
        .single();
      if (error) throw error;
      demoUser = newUser;
      logger.info("Seeded demo user: farmer@agrovault.dev / password123");
    }

    // ── Seed Demo Storage Unit ──
    const { data: maize } = await supabase
      .from("commodities")
      .select("id")
      .eq("name", "Maize")
      .maybeSingle();

    const { data: existingUnit } = await supabase
      .from("storage_units")
      .select("id")
      .eq("ownerId", demoUser.id)
      .eq("name", "Barn A - Maize Storage")
      .maybeSingle();

    if (!existingUnit && maize) {
      const { error } = await supabase.from("storage_units").insert({
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
      if (error) throw error;
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
