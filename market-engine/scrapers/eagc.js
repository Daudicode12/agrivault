/**
 * Eastern Africa Grain Council (EAGC) Scraper
 *
 * EAGC publishes regional grain market prices through their
 * Regional Agricultural Trade Intelligence Network (RATIN).
 *
 * Data source: https://rfratingdev.eagc.org/ (RATIN platform)
 * Also: https://www.eagc.org/
 *
 * RATIN provides:
 *  - Daily wholesale & retail grain prices across East African markets
 *  - Cross-border trade flow data
 *  - Market information for maize, wheat, rice, sorghum, beans
 */

const cheerio = require("cheerio");
const BaseScraper = require("./base");

const EAGC_BASE = "https://www.eagc.org";
const RATIN_BASE = "https://rfratingdev.eagc.org";

// RATIN API endpoints (known patterns)
const RATIN_ENDPOINTS = {
  prices: "/api/prices",
  markets: "/api/markets",
  commodities: "/api/commodities",
};

class EAGCScraper extends BaseScraper {
  constructor(options = {}) {
    super("EAGC", { timeout: 40000, ...options });
  }

  async fetch() {
    console.log(`  [${this.name}] Fetching grain prices from EAGC/RATIN...`);
    let entries = [];

    // Strategy 1: RATIN API
    try {
      const ratinEntries = await this.fetchFromRATIN();
      entries.push(...ratinEntries);
      console.log(`  [${this.name}] RATIN API: ${ratinEntries.length} price entries`);
    } catch (err) {
      console.warn(`  [${this.name}] RATIN API failed: ${err.message}`);
    }

    // Strategy 2: EAGC market info pages
    if (entries.length === 0) {
      try {
        const pageEntries = await this.fetchFromEAGCPages();
        entries.push(...pageEntries);
        console.log(`  [${this.name}] EAGC pages: ${pageEntries.length} price entries`);
      } catch (err) {
        console.warn(`  [${this.name}] EAGC pages failed: ${err.message}`);
      }
    }

    console.log(`  [${this.name}] Total: ${entries.length} entries collected`);
    return entries;
  }

  /* ─── Strategy 1: RATIN API ────────────────────────────────── */

  async fetchFromRATIN() {
    const entries = [];

    // Try to get Kenyan market prices from RATIN
    const urls = [
      `${RATIN_BASE}${RATIN_ENDPOINTS.prices}?country=Kenya`,
      `${RATIN_BASE}${RATIN_ENDPOINTS.prices}?country=kenya&period=monthly`,
      `${RATIN_BASE}/api/v1/prices?country_id=1&limit=500`, // alternative endpoint pattern
    ];

    for (const url of urls) {
      try {
        const { data } = await this.get(url);
        const records = Array.isArray(data)
          ? data
          : data?.data || data?.results || data?.prices || [];

        for (const rec of records) {
          const entry = this.normaliseRATINRecord(rec);
          if (entry) entries.push(entry);
        }

        if (entries.length > 0) break; // got data, stop trying other URLs
      } catch {
        /* try next URL pattern */
      }
    }

    return entries;
  }

  normaliseRATINRecord(rec) {
    const rawCommodity =
      rec.commodity || rec.commodity_name || rec.Commodity ||
      rec.product || rec.grain || "";
    const commodityName = this.normaliseCommodityName(rawCommodity);
    if (!commodityName) return null;

    // RATIN prices may be in USD — convert if needed
    let price = parseFloat(
      rec.price || rec.wholesale_price || rec.retail_price ||
      rec.average_price || rec.Price || 0
    );
    if (!price || isNaN(price)) return null;

    const currency = (rec.currency || "KES").toUpperCase();
    if (currency === "USD") {
      price = price * 130; // approximate KES/USD rate
    }

    const rawMarket =
      rec.market || rec.market_name || rec.Market ||
      rec.town || rec.location || "";

    // Filter to Kenya only
    const country = (rec.country || rec.Country || "").toLowerCase();
    if (country && !country.includes("kenya")) return null;

    const rawDate = rec.date || rec.price_date || rec.Date || rec.period || "";

    return {
      commodityName,
      price,
      currency: "KES",
      unit: this.guessUnit(rawCommodity, rec),
      market: this.normaliseMarket(rawMarket),
      source: "EAGC-RATIN",
      recordedAt: rawDate ? new Date(rawDate) : new Date(),
      metadata: {
        rawCommodity,
        rawMarket,
        originalCurrency: currency,
        priceType: rec.price_type || rec.type || "wholesale",
      },
    };
  }

  /* ─── Strategy 2: EAGC website scrape ──────────────────────── */

  async fetchFromEAGCPages() {
    const entries = [];

    const urls = [
      `${EAGC_BASE}/market-information/`,
      `${EAGC_BASE}/market-prices/`,
      `${EAGC_BASE}/grain-prices/`,
    ];

    for (const url of urls) {
      try {
        const { data: html } = await this.get(url, { responseType: "text" });
        const $ = cheerio.load(html);

        $("table").each((_i, table) => {
          const rows = this.parseTable($, table);
          entries.push(...rows);
        });
      } catch {
        /* page unavailable */
      }
    }

    return entries;
  }

  parseTable($, table) {
    const entries = [];
    const headers = [];

    $(table)
      .find("thead tr th, thead tr td, tr:first-child th, tr:first-child td")
      .each((_i, el) => {
        headers.push($(el).text().trim().toLowerCase());
      });

    const commodityCol = headers.findIndex((h) => /commodity|crop|grain|product/i.test(h));
    const priceCol = headers.findIndex((h) => /price|kes|value/i.test(h));
    if (commodityCol === -1 || priceCol === -1) return entries;

    const marketCol = headers.findIndex((h) => /market|town|city/i.test(h));
    const dateCol = headers.findIndex((h) => /date|period|month/i.test(h));

    $(table)
      .find("tbody tr, tr")
      .slice(1)
      .each((_i, tr) => {
        const cells = [];
        $(tr)
          .find("td")
          .each((_j, td) => cells.push($(td).text().trim()));

        if (cells.length <= Math.max(commodityCol, priceCol)) return;

        const rawCommodity = cells[commodityCol];
        const commodityName = this.normaliseCommodityName(rawCommodity);
        if (!commodityName) return;

        const price = parseFloat(cells[priceCol]?.replace(/[^0-9.]/g, ""));
        if (!price || isNaN(price)) return;

        entries.push({
          commodityName,
          price,
          currency: "KES",
          unit: this.guessUnit(rawCommodity),
          market: marketCol >= 0 ? this.normaliseMarket(cells[marketCol]) : "National Average",
          source: "EAGC",
          recordedAt: dateCol >= 0 ? new Date(cells[dateCol]) : new Date(),
          metadata: { rawCommodity },
        });
      });

    return entries;
  }

  normaliseMarket(raw) {
    const lower = (raw || "").toLowerCase().trim();
    const MAP = {
      nairobi: "Nairobi",
      mombasa: "Mombasa",
      kisumu: "Kisumu",
      nakuru: "Nakuru",
      eldoret: "Eldoret",
      kitale: "Kitale",
      bungoma: "Bungoma",
    };
    for (const [k, v] of Object.entries(MAP)) {
      if (lower.includes(k)) return v;
    }
    return raw || "National Average";
  }

  guessUnit(rawCommodity, rec = {}) {
    if (rec.unit) return rec.unit;
    const lower = (rawCommodity || "").toLowerCase();
    if (/kg/i.test(lower)) return "kg";
    if (/bag.*90/i.test(lower)) return "bag (90kg)";
    if (/bag/i.test(lower)) return "bag (90kg)";
    if (/ton/i.test(lower)) return "tonne";

    // EAGC default: grain traded in 90kg bags
    const name = this.normaliseCommodityName(rawCommodity);
    const defaults = {
      Maize: "bag (90kg)", Wheat: "bag (90kg)", Beans: "bag (90kg)",
      Rice: "bag (50kg)", Sorghum: "bag (90kg)",
      "Irish Potatoes": "kg", "Coffee (dried)": "kg",
    };
    return defaults[name] || "kg";
  }
}

module.exports = EAGCScraper;
