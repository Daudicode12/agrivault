/**
 * BaseScraper — Abstract scraper interface
 *
 * Every market data scraper extends this class and implements:
 *   - fetch()  → returns normalized MarketDataEntry[]
 *
 * MarketDataEntry shape:
 * {
 *   commodityName: string,    // e.g. "Maize", "Beans", "Wheat"
 *   price: number,            // price in KES
 *   currency: string,         // "KES"
 *   unit: string,             // e.g. "kg", "bag (90kg)"
 *   market: string,           // e.g. "Nairobi", "Mombasa"
 *   source: string,           // e.g. "KNBS", "FAO", "EAGC"
 *   recordedAt: Date,         // when the price was recorded
 *   metadata?: object,        // any extra source-specific info
 * }
 */

const axios = require("axios");

class BaseScraper {
  constructor(name, options = {}) {
    this.name = name;
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 3;
    this.retryDelay = options.retryDelay || 2000;

    this.http = axios.create({
      timeout: this.timeout,
      headers: {
        "User-Agent":
          "AgroVault/1.0 (Agricultural Intelligence Platform; contact: admin@agrovault.co.ke)",
        Accept: "application/json, text/html, */*",
      },
    });
  }

  /**
   * Override in subclasses. Must return MarketDataEntry[].
   */
  async fetch() {
    throw new Error(`${this.name}: fetch() not implemented`);
  }

  /**
   * Safe HTTP GET with retry logic.
   */
  async get(url, config = {}) {
    let lastError;
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const res = await this.http.get(url, config);
        return res;
      } catch (err) {
        lastError = err;
        const status = err.response?.status;
        // Don't retry on 4xx client errors (except 429 rate limit)
        if (status && status >= 400 && status < 500 && status !== 429) throw err;

        if (attempt < this.retries) {
          const delay = this.retryDelay * attempt;
          console.log(`  [${this.name}] Attempt ${attempt} failed (${err.message}). Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    throw lastError;
  }

  /**
   * Normalise a commodity name to match our agro_commodities table.
   * Returns null if the commodity is not one we track.
   */
  normaliseCommodityName(raw) {
    const lower = (raw || "").toLowerCase().trim();

    const MAP = {
      // Maize variants
      maize: "Maize",
      corn: "Maize",
      "dry maize": "Maize",
      "maize (dry)": "Maize",
      "white maize": "Maize",

      // Wheat
      wheat: "Wheat",
      "wheat grain": "Wheat",

      // Beans
      beans: "Beans",
      "dry beans": "Beans",
      "kidney beans": "Beans",
      "common beans": "Beans",
      "red beans": "Beans",
      "mixed beans": "Beans",
      rosecoco: "Beans",

      // Rice
      rice: "Rice",
      "milled rice": "Rice",
      "rice (milled)": "Rice",
      pishori: "Rice",

      // Sorghum
      sorghum: "Sorghum",
      "sorghum grain": "Sorghum",

      // Irish Potatoes
      "irish potatoes": "Irish Potatoes",
      "irish potato": "Irish Potatoes",
      potatoes: "Irish Potatoes",
      potato: "Irish Potatoes",

      // Coffee
      coffee: "Coffee (dried)",
      "coffee (dried)": "Coffee (dried)",
      "dry coffee": "Coffee (dried)",
      "coffee cherry": "Coffee (dried)",
      arabica: "Coffee (dried)",
    };

    // Exact match first
    if (MAP[lower]) return MAP[lower];

    // Partial match
    for (const [pattern, name] of Object.entries(MAP)) {
      if (lower.includes(pattern)) return name;
    }

    return null; // not a commodity we track
  }

  sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

module.exports = BaseScraper;
