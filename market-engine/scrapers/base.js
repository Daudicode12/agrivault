/**
 * Market Data Scraper Interface
 *
 * All scrapers should follow this pattern.
 * Each source returns normalized MarketDataEntry objects.
 *
 * MarketDataEntry shape:
 * {
 *   commodityName: string,
 *   price: number,
 *   currency: string,
 *   market: string,
 *   source: string,
 *   recordedAt: Date,
 * }
 *
 * MarketScraper shape:
 * {
 *   name: string,
 *   fetch(): Promise<MarketDataEntry[]>,
 * }
 */

// TODO Day 6: Implement scrapers for:
// - Kenya National Bureau of Statistics API
// - FAO price data
// - EAGC market prices
// - Manual CSV import

module.exports = {};
