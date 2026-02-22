/**
 * Market Engine Configuration
 *
 * Connects to the same Supabase instance as the backend.
 */
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config({ path: require("path").resolve(__dirname, "../../backend/.env") });

const config = {
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || "",

  // Analysis defaults
  analysis: {
    smaWindows: [7, 14, 30],           // Simple Moving Average windows (days)
    emaSpan: 14,                        // Exponential Moving Average span
    forecastHorizonDays: 30,            // How far ahead to forecast
    volatilityWindow: 30,               // Days for volatility calculation
    seasonalityLookbackMonths: 12,      // How far back for seasonal patterns
    minDataPointsForAnalysis: 5,        // Minimum data points to run analysis
    minDataPointsForForecast: 14,       // Minimum data points for forecasting
  },

  // Cron schedules
  cron: {
    analysisSchedule: "0 */4 * * *",   // Run analysis every 4 hours
    forecastSchedule: "0 6 * * *",      // Run forecasts daily at 6 AM
  },
};

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  db: { schema: process.env.DB_SCHEMA || "public" },
  auth: { persistSession: false },
});

module.exports = { config, supabase };
