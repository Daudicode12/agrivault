/**
 * Price Update Scheduler
 *
 * Runs daily price updates automatically using node-cron.
 * This keeps market data current without manual intervention.
 *
 * Usage: node src/seeds/priceScheduler.js
 * Or add to your main server.js to run alongside the API
 */

const cron = require("node-cron");
const { exec } = require("child_process");
const path = require("path");

console.log("AgroVault Price Update Scheduler");
console.log("=================================\n");

// Run daily at 10:00 AM
cron.schedule("0 10 * * *", () => {
  console.log(`[${new Date().toISOString()}] Running daily price update...`);
  
  const scriptPath = path.join(__dirname, "updateDailyPrices.js");
  
  exec(`node ${scriptPath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return;
    }
    console.log(stdout);
  });
});

console.log("Scheduler started. Daily price updates will run at 10:00 AM.");
console.log("Press Ctrl+C to stop.\n");

// Keep the process running
process.stdin.resume();
