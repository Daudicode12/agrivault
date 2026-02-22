/**
 * Kenya National Bureau of Statistics (KNBS) Scraper
 *
 * Pulls commodity price data from the KNBS open data portal.
 *
 * Data sources:
 *  1. KNBS Open Data API (data.knbs.or.ke) — structured JSON/CSV download
 *  2. KNBS Monthly CPI & Food Prices bulletin pages
 *
 * The KNBS publishes:
 *  - Monthly "Consumer Price Indices and Inflation Rates" reports
 *  - Selected retail food prices by commodity and town
 *  - Producer prices for agricultural commodities
 *
 * Commodity price tables are published as datasets on their open data portal
 * and in PDF/Excel bulletins. This scraper targets the machine-readable
 * endpoints and falls back to HTML table scraping from bulletin pages.
 *
 * Reference:
 *  - https://www.knbs.or.ke/
 *  - https://data.knbs.or.ke/
 */

const cheerio = require("cheerio");
const https = require("https");
const BaseScraper = require("./base");

// KNBS SSL certificates are frequently misconfigured — allow self-signed
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// KNBS publishes food price data in monthly statistical bulletins.
// The open data portal (data.knbs.or.ke) provides dataset search APIs.
const KNBS_BASE = "https://www.knbs.or.ke";
const KNBS_DATA_API = "https://data.knbs.or.ke/api/3/action";

// Dataset IDs on the KNBS CKAN portal (these represent known agricultural
// price datasets — IDs may change if KNBS re-publishes).
const KNOWN_DATASETS = [
  "selected-food-prices",
  "producer-prices-agricultural-commodities",
  "consumer-price-index-food",
];

// Kenyan towns mapped to market names used in our system
const TOWN_MAP = {
  nairobi: "Nairobi",
  mombasa: "Mombasa",
  kisumu: "Kisumu",
  nakuru: "Nakuru",
  eldoret: "Eldoret",
  nyeri: "Nyeri",
  machakos: "Machakos",
  meru: "Meru",
  thika: "Thika",
  kitale: "Kitale",
  bungoma: "Bungoma",
  kakamega: "Kakamega",
  garissa: "Garissa",
  embu: "Embu",
  nanyuki: "Nanyuki",
  narok: "Narok",
  kericho: "Kericho",
  national: "National Average",
  kenya: "National Average",
};

class KNBSScraper extends BaseScraper {
  constructor(options = {}) {
    super("KNBS", { timeout: 45000, ...options });
  }

  /**
   * Safe HTTP GET with retry logic.
   * Overrides base to add KNBS-specific httpsAgent for SSL issues.
   */
  async get(url, config = {}) {
    return super.get(url, { httpsAgent, ...config });
  }

  /**
   * Main fetch — tries multiple strategies:
   *  1. CKAN API dataset search for CSV/JSON resources
   *  2. Fallback: scrape HTML tables from KNBS bulletin pages
   */
  async fetch() {
    console.log(`  [${this.name}] Fetching market data from KNBS...`);
    let entries = [];

    // Strategy 1: CKAN Open Data API
    try {
      const apiEntries = await this.fetchFromCKAN();
      entries.push(...apiEntries);
      console.log(`  [${this.name}] CKAN API: ${apiEntries.length} price entries`);
    } catch (err) {
      console.warn(`  [${this.name}] CKAN API unavailable: ${err.message}`);
    }

    // Strategy 2: HTML bulletin scrape
    if (entries.length === 0) {
      try {
        const bulletinEntries = await this.fetchFromBulletins();
        entries.push(...bulletinEntries);
        console.log(`  [${this.name}] Bulletin scrape: ${bulletinEntries.length} price entries`);
      } catch (err) {
        console.warn(`  [${this.name}] Bulletin scrape failed: ${err.message}`);
      }
    }

    // Strategy 3: fallback — KNBS known statistical tables
    if (entries.length === 0) {
      try {
        const tableEntries = await this.fetchFromStatsTables();
        entries.push(...tableEntries);
        console.log(`  [${this.name}] Stats tables: ${tableEntries.length} price entries`);
      } catch (err) {
        console.warn(`  [${this.name}] Stats tables failed: ${err.message}`);
      }
    }

    console.log(`  [${this.name}] Total: ${entries.length} entries collected`);
    return entries;
  }

  /* ─── Strategy 1: CKAN API ─────────────────────────────────── */

  async fetchFromCKAN() {
    const entries = [];

    // Search for agricultural price datasets
    const searchUrl = `${KNBS_DATA_API}/package_search?q=food+prices+agricultural&rows=10`;
    const { data } = await this.get(searchUrl);

    const datasets = data?.result?.results || [];

    for (const dataset of datasets) {
      const resources = (dataset.resources || []).filter(
        (r) => r.format === "CSV" || r.format === "JSON" || r.format === "csv" || r.format === "json"
      );

      for (const resource of resources) {
        try {
          const parsed = await this.parseResource(resource);
          entries.push(...parsed);
        } catch (err) {
          console.warn(`  [${this.name}] Could not parse resource ${resource.id}: ${err.message}`);
        }
      }
    }

    // Also try known dataset IDs directly
    for (const dsId of KNOWN_DATASETS) {
      try {
        const { data } = await this.get(`${KNBS_DATA_API}/package_show?id=${dsId}`);
        const resources = (data?.result?.resources || []).filter(
          (r) => /csv|json/i.test(r.format)
        );
        for (const resource of resources) {
          try {
            const parsed = await this.parseResource(resource);
            entries.push(...parsed);
          } catch {
            /* skip individual resource errors */
          }
        }
      } catch {
        /* dataset may not exist */
      }
    }

    return this.deduplicate(entries);
  }

  async parseResource(resource) {
    const entries = [];
    const url = resource.url;
    if (!url) return entries;

    if (/json/i.test(resource.format)) {
      const { data } = await this.get(url);
      const records = Array.isArray(data) ? data : data?.records || data?.data || [];
      for (const rec of records) {
        const entry = this.normaliseRecord(rec);
        if (entry) entries.push(entry);
      }
    } else if (/csv/i.test(resource.format)) {
      const { data: csvText } = await this.get(url, { responseType: "text" });
      const parsed = this.parseCSV(csvText);
      for (const row of parsed) {
        const entry = this.normaliseRecord(row);
        if (entry) entries.push(entry);
      }
    }

    return entries;
  }

  /* ─── Strategy 2: Bulletin HTML scrape ─────────────────────── */

  async fetchFromBulletins() {
    const entries = [];

    // KNBS publishes monthly economic indicator bulletins
    const bulletinUrls = [
      `${KNBS_BASE}/publications/economic-survey/`,
      `${KNBS_BASE}/publications/statistical-abstract/`,
      `${KNBS_BASE}/download/leading-economic-indicators/`,
    ];

    for (const url of bulletinUrls) {
      try {
        const { data: html } = await this.get(url, { responseType: "text" });
        const $ = cheerio.load(html);

        // Look for HTML tables containing price data
        $("table").each((_i, table) => {
          const tableEntries = this.parseHTMLTable($, table);
          entries.push(...tableEntries);
        });
      } catch {
        /* page may not be accessible */
      }
    }

    return entries;
  }

  parseHTMLTable($, table) {
    const entries = [];
    const headers = [];

    // Extract headers
    $(table)
      .find("thead tr th, thead tr td, tr:first-child th, tr:first-child td")
      .each((_i, el) => {
        headers.push($(el).text().trim().toLowerCase());
      });

    // Must have at least a commodity and price column
    const commodityCol = headers.findIndex(
      (h) => /commodity|product|item|crop/i.test(h)
    );
    const priceCol = headers.findIndex(
      (h) => /price|kes|value|amount/i.test(h)
    );

    if (commodityCol === -1 || priceCol === -1) return entries;

    const marketCol = headers.findIndex((h) => /market|town|city|location/i.test(h));
    const dateCol = headers.findIndex((h) => /date|month|period|year/i.test(h));

    // Extract rows
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

        const market = marketCol >= 0 ? this.normaliseMarket(cells[marketCol]) : "National Average";
        const recordedAt = dateCol >= 0 ? this.parseDate(cells[dateCol]) : new Date();

        entries.push({
          commodityName,
          price,
          currency: "KES",
          unit: this.guessUnit(rawCommodity),
          market,
          source: "KNBS",
          recordedAt,
          metadata: { rawCommodity, table: "bulletin" },
        });
      });

    return entries;
  }

  /* ─── Strategy 3: Known stats tables page ──────────────────── */

  async fetchFromStatsTables() {
    const entries = [];

    // KNBS statistcal tables URL patterns
    const tableUrls = [
      `${KNBS_BASE}/publications/?page_num=1&cat_id=0&topic_id=9`,  // Agriculture topic
      `${KNBS_BASE}/publications/?page_num=1&cat_id=0&topic_id=10`, // Prices topic
    ];

    for (const url of tableUrls) {
      try {
        const { data: html } = await this.get(url, { responseType: "text" });
        const $ = cheerio.load(html);

        // Look for downloadable CSV/Excel links on the publications page
        $("a[href]").each((_i, el) => {
          const href = $(el).attr("href") || "";
          if (/\.(csv|xlsx?)$/i.test(href)) {
            // We could download and parse these, but they're usually large Excel files
            // For now, log them for potential future use
            console.log(`  [${this.name}] Found downloadable: ${href}`);
          }
        });

        // Also parse any inline tables
        $("table").each((_i, table) => {
          const tableEntries = this.parseHTMLTable($, table);
          entries.push(...tableEntries);
        });
      } catch {
        /* page unavailable */
      }
    }

    return entries;
  }

  /* ─── Utility methods ──────────────────────────────────────── */

  normaliseRecord(rec) {
    // Try common field name patterns from KNBS data
    const rawCommodity =
      rec.commodity || rec.Commodity || rec.product || rec.Product ||
      rec.item || rec.Item || rec.crop || rec.Crop || rec.COMMODITY || "";

    const commodityName = this.normaliseCommodityName(rawCommodity);
    if (!commodityName) return null;

    const price = parseFloat(
      rec.price || rec.Price || rec.PRICE || rec.value || rec.Value ||
      rec.average_price || rec.retail_price || rec.wholesale_price || 0
    );
    if (!price || isNaN(price)) return null;

    const rawMarket =
      rec.market || rec.Market || rec.town || rec.Town ||
      rec.city || rec.City || rec.location || rec.Location || "";

    const rawDate =
      rec.date || rec.Date || rec.period || rec.Period ||
      rec.month || rec.Month || rec.year || rec.Year || "";

    return {
      commodityName,
      price,
      currency: rec.currency || "KES",
      unit: this.guessUnit(rawCommodity),
      market: this.normaliseMarket(rawMarket),
      source: "KNBS",
      recordedAt: rawDate ? this.parseDate(String(rawDate)) : new Date(),
      metadata: {
        rawCommodity,
        rawMarket,
        rawDate,
        originalRecord: rec,
      },
    };
  }

  normaliseMarket(raw) {
    const lower = (raw || "").toLowerCase().trim();
    for (const [pattern, name] of Object.entries(TOWN_MAP)) {
      if (lower.includes(pattern)) return name;
    }
    return raw || "National Average";
  }

  parseDate(str) {
    if (!str) return new Date();

    // Try ISO / standard date parse
    const d = new Date(str);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d;

    // Try "Month YYYY" format (e.g. "January 2026")
    const monthYear = str.match(
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{4})$/i
    );
    if (monthYear) {
      return new Date(`${monthYear[1]} 1, ${monthYear[2]}`);
    }

    // Try "YYYY" only
    const yearOnly = str.match(/^(\d{4})$/);
    if (yearOnly) return new Date(`${yearOnly[1]}-06-01`);

    return new Date();
  }

  guessUnit(rawCommodity) {
    const lower = (rawCommodity || "").toLowerCase();
    if (/kg|kilo/i.test(lower)) return "kg";
    if (/bag.*90/i.test(lower)) return "bag (90kg)";
    if (/bag.*50/i.test(lower)) return "bag (50kg)";
    if (/bag/i.test(lower)) return "bag (90kg)";
    if (/ton/i.test(lower)) return "tonne";

    // Default units by commodity
    const defaults = {
      Maize: "bag (90kg)",
      Wheat: "bag (90kg)",
      Beans: "bag (90kg)",
      Rice: "bag (50kg)",
      Sorghum: "bag (90kg)",
      "Irish Potatoes": "kg",
      "Coffee (dried)": "kg",
    };
    const name = this.normaliseCommodityName(rawCommodity);
    return defaults[name] || "kg";
  }

  parseCSV(csvText) {
    const lines = csvText.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      if (values.length !== headers.length) continue;

      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx];
      });
      rows.push(row);
    }

    return rows;
  }

  deduplicate(entries) {
    const seen = new Set();
    return entries.filter((e) => {
      const key = `${e.commodityName}|${e.market}|${e.price}|${e.recordedAt?.toISOString?.() || e.recordedAt}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

module.exports = KNBSScraper;
