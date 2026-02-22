/**
 * Scraper Runner & Data Ingestion Pipeline
 *
 * Orchestrates all scrapers, normalises their output, resolves commodity IDs
 * from the database, deduplicates entries, and inserts them into
 * agro_market_data in Supabase.
 *
 * Usage:
 *   node scrapers/run.js              — run all scrapers
 *   node scrapers/run.js --source=knbs — run only KNBS scraper
 *   node scrapers/run.js --dry-run    — scrape but don't insert
 */

const { supabase } = require("../src/config");
const KNBSScraper = require("./knbs");
const EAGCScraper = require("./eagc");
const FAOScraper = require("./fao");

// Registry of all available scrapers
const SCRAPER_REGISTRY = {
  knbs: () => new KNBSScraper(),
  eagc: () => new EAGCScraper(),
  fao: () => new FAOScraper(),
};

/**
 * Resolve commodity names to their UUIDs in agro_commodities.
 * Caches the mapping for the duration of the run.
 */
async function loadCommodityMap() {
  const { data, error } = await supabase
    .from("agro_commodities")
    .select("id, name");

  if (error) {
    console.error("Failed to load commodities:", error.message);
    return {};
  }

  const map = {};
  for (const c of data || []) {
    map[c.name.toLowerCase()] = c.id;
  }
  return map;
}

/**
 * Check if a price entry already exists (same commodity, market, source, date).
 */
async function isDuplicate(entry, commodityId) {
  const dateStr = entry.recordedAt instanceof Date
    ? entry.recordedAt.toISOString().split("T")[0]
    : String(entry.recordedAt).split("T")[0];

  const { data } = await supabase
    .from("agro_market_data")
    .select("id")
    .eq("commodityId", commodityId)
    .eq("source", entry.source)
    .eq("market", entry.market)
    .gte("recordedAt", `${dateStr}T00:00:00`)
    .lte("recordedAt", `${dateStr}T23:59:59`)
    .limit(1);

  return data && data.length > 0;
}

/**
 * Insert a batch of entries into agro_market_data.
 */
async function ingestEntries(entries, commodityMap, options = {}) {
  const { dryRun = false } = options;
  const stats = { inserted: 0, skipped: 0, duplicates: 0, errors: 0 };

  for (const entry of entries) {
    const commodityId = commodityMap[(entry.commodityName || "").toLowerCase()];

    if (!commodityId) {
      stats.skipped++;
      continue;
    }

    // Check for duplicates
    try {
      const dupe = await isDuplicate(entry, commodityId);
      if (dupe) {
        stats.duplicates++;
        continue;
      }
    } catch {
      // If duplicate check fails, attempt insert anyway
    }

    if (dryRun) {
      console.log(`  [DRY RUN] Would insert: ${entry.commodityName} @ KES ${entry.price} (${entry.market}, ${entry.source})`);
      stats.inserted++;
      continue;
    }

    const row = {
      price: entry.price,
      currency: entry.currency || "KES",
      market: entry.market,
      source: entry.source,
      recordedAt: entry.recordedAt instanceof Date
        ? entry.recordedAt.toISOString()
        : entry.recordedAt,
      commodityId,
    };

    const { error } = await supabase.from("agro_market_data").insert(row);

    if (error) {
      console.warn(`  Insert error for ${entry.commodityName}: ${error.message}`);
      stats.errors++;
    } else {
      stats.inserted++;
    }
  }

  return stats;
}

/**
 * Run specified scrapers and ingest the data.
 *
 * @param {object} options
 * @param {string[]} options.sources - scraper names to run, or ['all']
 * @param {boolean} options.dryRun - if true, print but don't insert
 * @returns {{ totalEntries, inserted, skipped, duplicates, errors, bySource }}
 */
async function runScrapers(options = {}) {
  const { sources = ["all"], dryRun = false } = options;

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║  AgroVault Market Data Scraper v1.0  ║");
  console.log("╚══════════════════════════════════════╝\n");
  console.log(`Mode: ${dryRun ? "DRY RUN (no database writes)" : "LIVE"}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  // Load commodity name → UUID mapping
  const commodityMap = await loadCommodityMap();
  const commodityCount = Object.keys(commodityMap).length;
  console.log(`Loaded ${commodityCount} commodities from database.\n`);

  if (commodityCount === 0) {
    console.error("No commodities in database. Seed commodities first.");
    return { totalEntries: 0, inserted: 0, skipped: 0, duplicates: 0, errors: 0 };
  }

  // Determine which scrapers to run
  const scraperNames =
    sources.includes("all")
      ? Object.keys(SCRAPER_REGISTRY)
      : sources.filter((s) => SCRAPER_REGISTRY[s]);

  console.log(`Running scrapers: ${scraperNames.join(", ")}\n`);

  const allEntries = [];
  const bySource = {};

  for (const name of scraperNames) {
    console.log(`── ${name.toUpperCase()} ${"─".repeat(36 - name.length)}`);
    const scraper = SCRAPER_REGISTRY[name]();

    try {
      const entries = await scraper.fetch();
      allEntries.push(...entries);
      bySource[name] = { fetched: entries.length, status: "ok" };
    } catch (err) {
      console.error(`  [${name}] Fatal error: ${err.message}`);
      bySource[name] = { fetched: 0, status: "error", error: err.message };
    }

    console.log("");
  }

  console.log(`\nTotal entries scraped: ${allEntries.length}`);

  // Deduplicate across sources (same commodity + market + date + similar price)
  const dedupedEntries = deduplicateEntries(allEntries);
  console.log(`After dedup: ${dedupedEntries.length} unique entries\n`);

  // Ingest
  console.log("─── Ingesting into database ───");
  const stats = await ingestEntries(dedupedEntries, commodityMap, { dryRun });

  console.log("\n╔═══════════ Summary ═══════════╗");
  console.log(`║ Fetched    : ${String(allEntries.length).padStart(6)}`);
  console.log(`║ Deduplicated: ${String(dedupedEntries.length).padStart(5)}`);
  console.log(`║ Inserted   : ${String(stats.inserted).padStart(6)}`);
  console.log(`║ Duplicates : ${String(stats.duplicates).padStart(6)}`);
  console.log(`║ Skipped    : ${String(stats.skipped).padStart(6)}`);
  console.log(`║ Errors     : ${String(stats.errors).padStart(6)}`);
  console.log("╚══════════════════════════════╝\n");

  return {
    totalEntries: allEntries.length,
    deduplicated: dedupedEntries.length,
    ...stats,
    bySource,
  };
}

/**
 * Remove duplicate entries across scrapers.
 * Keep the entry from the most authoritative source.
 */
function deduplicateEntries(entries) {
  const SOURCE_PRIORITY = { "KNBS": 1, "EAGC-RATIN": 2, "EAGC": 3, "FAO-FPMA": 4 };

  const buckets = new Map();

  for (const entry of entries) {
    const dateStr = entry.recordedAt instanceof Date
      ? entry.recordedAt.toISOString().split("T")[0]
      : String(entry.recordedAt).split("T")[0];
    const key = `${entry.commodityName}|${entry.market}|${dateStr}`;

    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, entry);
    } else {
      // Keep the one with higher source priority (lower number = higher priority)
      const existingPri = SOURCE_PRIORITY[existing.source] || 99;
      const newPri = SOURCE_PRIORITY[entry.source] || 99;
      if (newPri < existingPri) {
        buckets.set(key, entry);
      }
    }
  }

  return Array.from(buckets.values());
}

/* ─── CLI runner ─────────────────────────────────────────────── */

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  
  let sources = ["all"];
  const sourceArg = args.find((a) => a.startsWith("--source="));
  if (sourceArg) {
    sources = sourceArg.split("=")[1].split(",");
  }

  runScrapers({ sources, dryRun })
    .then((result) => {
      console.log("Scraper run complete.");
      process.exit(result.errors > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error("Fatal:", err);
      process.exit(1);
    });
}

module.exports = { runScrapers, SCRAPER_REGISTRY, loadCommodityMap, ingestEntries };
