/**
 * AgroVault Market Engine
 *
 * Collects commodity prices from external sources, runs price trend
 * analysis, forecasting, seasonality detection, and generates
 * sell / hold recommendations for farmers.
 *
 * Modules:
 * - analysis/trendAnalyzer  — SMA, EMA, momentum, volatility
 * - analysis/forecaster     — Linear regression + WMA price forecasting
 * - analysis/seasonality    — Monthly seasonal pattern detection
 * - analysis/recommendationEngine — Composite sell / hold scoring
 * - src/aggregator          — Orchestrates analysis for all commodities
 *
 * Schedules:
 * - Every 4 hours: Full market analysis run
 * - Daily at 06:00: Extended forecast generation
 */

const { CronJob } = require("cron");
const { config } = require("./config");
const { runFullAnalysis } = require("./aggregator");
const { runScrapers } = require("../scrapers/run");

console.log("AgroVault Market Engine v1.0");
console.log("============================");
console.log(`Analysis schedule : ${config.cron.analysisSchedule}`);
console.log(`Forecast schedule : ${config.cron.forecastSchedule}`);
console.log(`Scrape schedule   : ${config.cron.scrapeSchedule || "0 */6 * * *"}`);
console.log("");

// ── Scheduled analysis run (every 4 hours) ──
const analysisJob = new CronJob(config.cron.analysisSchedule, async () => {
  try {
    await runFullAnalysis();
  } catch (err) {
    console.error("Analysis cron error:", err.message);
  }
});

// ── Scheduled scraper run (every 6 hours) ──
const scrapeJob = new CronJob(config.cron.scrapeSchedule || "0 */6 * * *", async () => {
  try {
    console.log("\n=== Scheduled Scrape Run ===");
    await runScrapers({ sources: ["all"] });
  } catch (err) {
    console.error("Scraper cron error:", err.message);
  }
});

// ── CLI: run analysis immediately if called with --run ──
// ── CLI: run scrapers immediately if called with --scrape ──
const args = process.argv.slice(2);
if (args.includes("--scrape")) {
  console.log("Running scrapers now (--scrape flag detected)...\n");
  const dryRun = args.includes("--dry-run");
  let sources = ["all"];
  const sourceArg = args.find((a) => a.startsWith("--source="));
  if (sourceArg) sources = sourceArg.split("=")[1].split(",");

  runScrapers({ sources, dryRun })
    .then((result) => {
      console.log(`\nDone. ${result.inserted} entries ingested.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Fatal:", err);
      process.exit(1);
    });
} else if (args.includes("--run")) {
  console.log("Running analysis now (--run flag detected)...\n");
  runFullAnalysis()
    .then((results) => {
      console.log(`\nDone. ${results.length} commodities analyzed.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Fatal:", err);
      process.exit(1);
    });
} else {
  // Start cron schedules
  analysisJob.start();
  scrapeJob.start();
  console.log("Cron scheduler started. Waiting for next scheduled run...");
  console.log("Tip: run with --run to execute analysis, --scrape to run scrapers.\n");
}
