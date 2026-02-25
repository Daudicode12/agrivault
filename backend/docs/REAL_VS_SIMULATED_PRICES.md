# Market Data Sources - Real vs Simulated

## Current Status: Simulated Data

**The prices you see are currently SIMULATED (dummy data)**, not real market prices. They are:

✅ **Realistic** - Generated using proven financial algorithms
✅ **Useful for testing** - Allows farmers to learn the system
✅ **Consistent** - Follows seasonal patterns and market trends
❌ **Not actual prices** - Not from real markets

### Why Simulated Data?

During development and initial deployment, simulated data allows:
- Farmers to test the platform immediately
- System to work without external API dependencies
- Demonstration of all features (trends, forecasts, recommendations)
- No API costs or rate limits

---

## Getting Real Market Prices

To use **actual real-time market prices**, you need to integrate with data providers:

### Option 1: Kenyan Government Sources (FREE)

#### 1. Kenya National Bureau of Statistics (KNBS)
- **Website**: https://www.knbs.or.ke
- **Data**: Weekly commodity prices from major markets
- **Format**: PDF reports, Excel downloads
- **Cost**: FREE
- **Update**: Weekly

#### 2. Eastern Africa Grain Council (EAGC)
- **Website**: https://www.eagc.org
- **Data**: Grain prices across East Africa
- **Format**: API available for members
- **Cost**: Membership required
- **Update**: Daily/Weekly

#### 3. Regional Agricultural Trade Intelligence Network (RATIN)
- **Website**: https://ratin.net
- **Data**: Agricultural commodity prices
- **Format**: Web scraping or API
- **Cost**: FREE (web) / Paid (API)
- **Update**: Daily

### Option 2: Commercial Data Providers (PAID)

#### 1. Bloomberg API
- Real-time commodity prices globally
- Cost: $2,000+/month
- Best for: Large-scale operations

#### 2. Reuters Eikon
- Financial and commodity data
- Cost: $1,500+/month
- Best for: Professional traders

#### 3. Quandl (Nasdaq Data Link)
- Agricultural commodity data
- Cost: $50-500/month
- Best for: Small to medium operations

### Option 3: Manual Price Entry (FREE)

Farmers can manually enter prices they observe at local markets:
- Already implemented in AgroVault
- Endpoint: `POST /api/market-data`
- Farmers become data contributors
- Crowdsourced real prices

---

## How to Integrate Real Data Sources

### Step 1: Create a Scraper for KNBS

```javascript
// backend/market-engine/scrapers/knbs.js
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeKNBS() {
  const url = 'https://www.knbs.or.ke/download/commodity-prices/';
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  
  const prices = [];
  
  // Parse the HTML table
  $('table.commodity-prices tr').each((i, row) => {
    const cols = $(row).find('td');
    if (cols.length >= 4) {
      prices.push({
        commodity: $(cols[0]).text().trim(),
        market: $(cols[1]).text().trim(),
        price: parseFloat($(cols[2]).text().replace(/[^0-9.]/g, '')),
        date: $(cols[3]).text().trim(),
      });
    }
  });
  
  return prices;
}

module.exports = { scrapeKNBS };
```

### Step 2: Create a Scraper for EAGC

```javascript
// backend/market-engine/scrapers/eagc.js
const axios = require('axios');

async function fetchEAGC() {
  // EAGC API endpoint (requires API key)
  const response = await axios.get('https://api.eagc.org/prices', {
    headers: { 'Authorization': `Bearer ${process.env.EAGC_API_KEY}` }
  });
  
  return response.data.prices.map(p => ({
    commodity: p.commodity_name,
    market: p.market_name,
    county: p.county,
    price: p.price,
    date: p.recorded_date,
    source: 'EAGC',
  }));
}

module.exports = { fetchEAGC };
```

### Step 3: Schedule Real Data Collection

```javascript
// backend/market-engine/src/realDataCollector.js
const cron = require('node-cron');
const { scrapeKNBS } = require('../scrapers/knbs');
const { fetchEAGC } = require('../scrapers/eagc');
const { supabase } = require('../../src/config/supabase');

// Run every day at 6 AM
cron.schedule('0 6 * * *', async () => {
  console.log('Fetching real market prices...');
  
  try {
    // Fetch from KNBS
    const knbsPrices = await scrapeKNBS();
    
    // Fetch from EAGC (if you have API key)
    // const eagcPrices = await fetchEAGC();
    
    // Map to your commodities
    for (const price of knbsPrices) {
      // Find commodity in your database
      const { data: commodity } = await supabase
        .from('agro_commodities')
        .select('id')
        .ilike('name', price.commodity)
        .maybeSingle();
      
      if (commodity) {
        // Insert real price
        await supabase.from('agro_market_data').insert({
          commodityId: commodity.id,
          price: price.price,
          market: price.market,
          county: price.county || 'Unknown',
          currency: 'KES',
          source: 'KNBS',
          recordedAt: new Date().toISOString(),
        });
      }
    }
    
    console.log(`✓ Imported ${knbsPrices.length} real prices`);
  } catch (error) {
    console.error('Error fetching real prices:', error);
  }
});

console.log('Real data collector started. Runs daily at 6 AM.');
```

### Step 4: Install Dependencies

```bash
cd backend
npm install axios cheerio
```

### Step 5: Start the Real Data Collector

```bash
node market-engine/src/realDataCollector.js
```

Or add to your main server:
```javascript
// In backend/src/server.js
require('../market-engine/src/realDataCollector');
```

---

## Hybrid Approach (RECOMMENDED)

Use **both simulated and real data**:

1. **Simulated data** - For commodities without real sources
2. **Real data** - When available from KNBS, EAGC, or farmer input
3. **Priority system** - Real data overrides simulated data

### Implementation

```javascript
// Mark data source in database
source: 'KNBS'           // Real data from KNBS
source: 'EAGC'           // Real data from EAGC
source: 'farmer_input'   // Real data from farmers
source: 'auto_generated' // Simulated data
source: 'seed'           // Development data

// Query prioritizes real data
SELECT * FROM agro_market_data 
WHERE commodityId = ? 
ORDER BY 
  CASE source
    WHEN 'KNBS' THEN 1
    WHEN 'EAGC' THEN 2
    WHEN 'farmer_input' THEN 3
    WHEN 'auto_generated' THEN 4
  END,
  recordedAt DESC
```

---

## Farmer-Contributed Prices (Already Implemented!)

Farmers can submit real prices they observe:

**Endpoint**: `POST /api/market-data`

**Request**:
```json
{
  "commodityId": "abc-123",
  "price": 3850,
  "market": "Nakuru Market",
  "county": "Nakuru",
  "currency": "KES"
}
```

This creates **crowdsourced real market data** from farmers themselves!

---

## Displaying Data Source to Farmers

Update the UI to show data source:

```jsx
// In MarketDashboard.jsx
<div className={styles.dataSource}>
  {dashboard.priceSummary.source === 'KNBS' && (
    <Badge variant="success">
      ✓ Real Data (KNBS)
    </Badge>
  )}
  {dashboard.priceSummary.source === 'auto_generated' && (
    <Badge variant="warning">
      ⚠ Simulated Data
    </Badge>
  )}
</div>
```

---

## Cost Comparison

| Source | Cost | Update Frequency | Coverage |
|---|---|---|---|
| **Simulated** | FREE | Real-time | All commodities |
| **KNBS** | FREE | Weekly | Major commodities |
| **EAGC** | Membership | Daily | Grains |
| **Farmer Input** | FREE | Real-time | User-submitted |
| **Bloomberg** | $2,000+/mo | Real-time | Global |

---

## Recommendation

**For MVP/Launch:**
1. ✅ Keep simulated data (already working)
2. ✅ Enable farmer price submissions (already implemented)
3. ✅ Add disclaimer: "Prices are estimates. Verify at local markets."

**For Production:**
1. Integrate KNBS scraper (FREE)
2. Add EAGC if budget allows
3. Prioritize real data over simulated
4. Show data source badges to farmers

**Long-term:**
1. Build partnerships with market associations
2. Crowdsource from farmer network
3. Consider commercial APIs for premium features

---

## Current Status Summary

🟡 **Simulated Data** - Realistic but not actual market prices
✅ **Farmer Input** - Real prices from farmers (already working)
🔴 **External APIs** - Not yet integrated (requires setup)

**Next Steps**: Integrate KNBS scraper for free real market data!
