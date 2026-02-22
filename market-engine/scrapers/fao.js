/**
 * FAO FPMA (Food Price Monitoring and Analysis) Scraper
 *
 * The Food and Agriculture Organization of the United Nations publishes
 * global food price data via FPMA and GIEWS.
 *
 * Data sources:
 *  - FAO FPMA API: https://fpma.fao.org/giews/fpmat4/#/
 *  - FAO GIEWS data: https://www.fao.org/giews/food-prices/
 *  - FAOSTAT bulk data: https://www.fao.org/faostat/en/#data
 *
 * This scraper filters for Kenya-specific food price data.
 */

const BaseScraper = require("./base");

const FAO_FPMA_API = "https://fpma.fao.org/giews/FoodPrices/api/v1";
const FAO_GIEWS = "https://www.fao.org/giews/food-prices";

// FAO commodity IDs for items we track (from FPMA system)
const FAO_COMMODITY_IDS = {
  56: "Maize",      // Maize (white) - wholesale
  57: "Maize",      // Maize (white) - retail
  60: "Wheat",      // Wheat - wholesale
  64: "Rice",       // Rice - retail
  68: "Beans",      // Beans - retail
  72: "Sorghum",    // Sorghum - wholesale
  236: "Irish Potatoes", // Potatoes - retail
};

// Kenya country code in FAO system
const KENYA_CODE = "KEN";
const KENYA_ID = 114;

class FAOScraper extends BaseScraper {
  constructor(options = {}) {
    super("FAO", { timeout: 45000, ...options });
  }

  async fetch() {
    console.log(`  [${this.name}] Fetching food prices from FAO FPMA...`);
    let entries = [];

    // Strategy 1: FPMA API
    try {
      const fpmaEntries = await this.fetchFromFPMA();
      entries.push(...fpmaEntries);
      console.log(`  [${this.name}] FPMA API: ${fpmaEntries.length} price entries`);
    } catch (err) {
      console.warn(`  [${this.name}] FPMA API failed: ${err.message}`);
    }

    // Strategy 2: GIEWS country page scrape
    if (entries.length === 0) {
      try {
        const giewsEntries = await this.fetchFromGIEWS();
        entries.push(...giewsEntries);
        console.log(`  [${this.name}] GIEWS: ${giewsEntries.length} price entries`);
      } catch (err) {
        console.warn(`  [${this.name}] GIEWS failed: ${err.message}`);
      }
    }

    console.log(`  [${this.name}] Total: ${entries.length} entries collected`);
    return entries;
  }

  /* ─── Strategy 1: FPMA API ─────────────────────────────────── */

  async fetchFromFPMA() {
    const entries = [];

    // FPMA provides time series data per commodity per country
    // Try various API endpoint patterns
    const apiUrls = [
      `${FAO_FPMA_API}/PriceSeries?countryiso3=${KENYA_CODE}&format=json`,
      `${FAO_FPMA_API}/Prices?countryiso3=${KENYA_CODE}&latest=true&format=json`,
      `${FAO_FPMA_API}/data/prices?country=${KENYA_ID}&limit=500`,
    ];

    for (const url of apiUrls) {
      try {
        const { data } = await this.get(url);
        const records = Array.isArray(data)
          ? data
          : data?.data || data?.results || data?.prices || data?.series || [];

        for (const rec of records) {
          const parsed = this.normaliseFPMARecord(rec);
          entries.push(...parsed);
        }

        if (entries.length > 0) break;
      } catch {
        /* try next URL */
      }
    }

    // Also try commodity-specific endpoints
    if (entries.length === 0) {
      for (const [commodityId, commodityName] of Object.entries(FAO_COMMODITY_IDS)) {
        try {
          const url = `${FAO_FPMA_API}/PriceSeries?countryiso3=${KENYA_CODE}&commodityid=${commodityId}&format=json`;
          const { data } = await this.get(url);
          const records = Array.isArray(data) ? data : data?.data || data?.series || [];

          for (const rec of records) {
            const parsed = this.normaliseFPMARecord(rec);
            entries.push(...parsed);
          }
        } catch {
          /* skip unavailable commodities */
        }
      }
    }

    return entries;
  }

  normaliseFPMARecord(rec) {
    const entries = [];

    // FPMA records may contain time series (array of date-price pairs)
    const rawCommodity =
      rec.commodity || rec.commodityname || rec.CommodityName ||
      rec.product || rec.item || "";

    let commodityName = this.normaliseCommodityName(rawCommodity);

    // Try mapping by commodity ID
    if (!commodityName && rec.commodityid) {
      commodityName = FAO_COMMODITY_IDS[rec.commodityid] || null;
    }
    if (!commodityName) return entries;

    // Handle time-series data
    const dataPoints = rec.datapoints || rec.data || rec.prices || rec.values;
    if (Array.isArray(dataPoints)) {
      for (const dp of dataPoints) {
        const price = parseFloat(dp.price || dp.value || dp.Value || dp[1] || 0);
        if (!price || isNaN(price)) continue;

        const date = dp.date || dp.Date || dp.period || dp[0];
        entries.push(this.buildEntry(commodityName, price, rec, date));
      }
    } else {
      // Single record
      const price = parseFloat(
        rec.price || rec.Price || rec.value || rec.Value || 0
      );
      if (price && !isNaN(price)) {
        const date = rec.date || rec.Date || rec.period || "";
        entries.push(this.buildEntry(commodityName, price, rec, date));
      }
    }

    return entries;
  }

  buildEntry(commodityName, price, rec, dateStr) {
    // FAO prices are often in USD — convert to KES
    let currency = (rec.currency || rec.Currency || "KES").toUpperCase();
    let kesPrice = price;

    if (currency === "USD") {
      kesPrice = price * 130;
      currency = "KES";
    }

    const rawMarket =
      rec.market || rec.marketname || rec.Market || rec.town || "";

    return {
      commodityName,
      price: Math.round(kesPrice * 100) / 100,
      currency: "KES",
      unit: rec.unit || this.getDefaultUnit(commodityName),
      market: rawMarket ? this.normaliseMarket(rawMarket) : "National Average",
      source: "FAO-FPMA",
      recordedAt: dateStr ? this.parseDate(String(dateStr)) : new Date(),
      metadata: {
        originalPrice: price,
        originalCurrency: rec.currency || "USD",
        commodityId: rec.commodityid,
        priceType: rec.pricetype || rec.type || "retail",
      },
    };
  }

  /* ─── Strategy 2: GIEWS page ───────────────────────────────── */

  async fetchFromGIEWS() {
    const entries = [];

    try {
      const url = `${FAO_GIEWS}/tool/public/#dataset=domestic`;
      const { data } = await this.get(url, { responseType: "text" });

      // GIEWS is a JS-heavy SPA — limited ability to scrape directly
      // but we can try to find any embedded JSON data
      const jsonMatch = data.match(/var\s+(?:prices|data|series)\s*=\s*(\[[\s\S]*?\]);/);
      if (jsonMatch) {
        try {
          const records = JSON.parse(jsonMatch[1]);
          for (const rec of records) {
            if ((rec.country || "").toLowerCase() !== "kenya") continue;
            const parsed = this.normaliseFPMARecord(rec);
            entries.push(...parsed);
          }
        } catch {
          /* JSON parse failed */
        }
      }
    } catch {
      /* page unavailable */
    }

    return entries;
  }

  /* ─── Helpers ──────────────────────────────────────────────── */

  normaliseMarket(raw) {
    const lower = (raw || "").toLowerCase().trim();
    const MAP = {
      nairobi: "Nairobi", mombasa: "Mombasa", kisumu: "Kisumu",
      nakuru: "Nakuru", eldoret: "Eldoret",
    };
    for (const [k, v] of Object.entries(MAP)) {
      if (lower.includes(k)) return v;
    }
    return raw || "National Average";
  }

  parseDate(str) {
    if (!str) return new Date();
    const d = new Date(str);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d;

    // "YYYY-MM" format
    const ym = str.match(/^(\d{4})-(\d{1,2})$/);
    if (ym) return new Date(parseInt(ym[1]), parseInt(ym[2]) - 1, 15);

    // "MM/YYYY"
    const my = str.match(/^(\d{1,2})\/(\d{4})$/);
    if (my) return new Date(parseInt(my[2]), parseInt(my[1]) - 1, 15);

    return new Date();
  }

  getDefaultUnit(commodityName) {
    const defaults = {
      Maize: "bag (90kg)", Wheat: "bag (90kg)", Beans: "bag (90kg)",
      Rice: "bag (50kg)", Sorghum: "bag (90kg)",
      "Irish Potatoes": "kg", "Coffee (dried)": "kg",
    };
    return defaults[commodityName] || "kg";
  }
}

module.exports = FAOScraper;
