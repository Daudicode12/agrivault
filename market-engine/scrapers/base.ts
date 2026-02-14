/**
 * Market Data Scraper Interface
 *
 * All scrapers should implement this interface.
 * Each source returns normalized MarketDataEntry objects.
 */

export interface MarketDataEntry {
  commodityName: string;
  price: number;
  currency: string;
  market: string;
  source: string;
  recordedAt: Date;
}

export interface MarketScraper {
  name: string;
  fetch(): Promise<MarketDataEntry[]>;
}

// TODO Day 6: Implement scrapers for:
// - Kenya National Bureau of Statistics API
// - FAO price data
// - EAGC market prices
// - Manual CSV import
