/**
 * Scrapers Index
 *
 * Exports all scrapers and the runner for use by the market engine
 * and backend API routes.
 */

const BaseScraper = require("./base");
const KNBSScraper = require("./knbs");
const EAGCScraper = require("./eagc");
const FAOScraper = require("./fao");
const { runScrapers, SCRAPER_REGISTRY, loadCommodityMap, ingestEntries } = require("./run");

module.exports = {
  BaseScraper,
  KNBSScraper,
  EAGCScraper,
  FAOScraper,
  runScrapers,
  SCRAPER_REGISTRY,
  loadCommodityMap,
  ingestEntries,
};
