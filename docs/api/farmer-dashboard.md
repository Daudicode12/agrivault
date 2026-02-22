# Farmer Market Dashboard API

## Overview

The Farmer Market Dashboard endpoint provides personalized market analysis filtered by county and commodity. Farmers can see full price history, trends, forecasts, and sell/hold recommendations for their specific location and crop.

---

## Endpoint

```
GET /api/market-analysis/dashboard
```

**Authentication:** Required (JWT Bearer token)

---

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `commodityId` | UUID | **Yes** | The commodity to analyze (e.g., Maize, Beans) |
| `county` | String | No | Filter prices by county (e.g., "Nairobi", "Kiambu") |
| `days` | Integer | No | Lookback period in days (default: 90, max: 365) |

---

## Example Requests

### 1. Get Maize prices in Nairobi County

```bash
curl -X GET "http://localhost:3000/api/market-analysis/dashboard?commodityId=<uuid>&county=Nairobi&days=90" \
  -H "Authorization: Bearer <your-jwt-token>"
```

### 2. Get all Beans prices (all counties)

```bash
curl -X GET "http://localhost:3000/api/market-analysis/dashboard?commodityId=<uuid>&days=180" \
  -H "Authorization: Bearer <your-jwt-token>"
```

---

## Response Format

### Success Response (200 OK)

```json
{
  "status": "ok",
  "commodity": {
    "id": "uuid",
    "name": "Maize",
    "category": "Grain",
    "unit": "bag (90kg)",
    "maxStorageDays": 365
  },
  "county": "Nairobi",
  "dataPoints": 126,
  "periodDays": 90,
  
  "priceSummary": {
    "current": 3842.50,
    "currentDate": "2024-02-22T10:00:00.000Z",
    "currentMarket": "Nairobi",
    "average": 3750.25,
    "minimum": 3580.00,
    "maximum": 3920.00,
    "currency": "KES"
  },

  "priceHistory": [
    {
      "date": "2023-11-25T10:00:00.000Z",
      "price": 3520.00,
      "market": "Nairobi",
      "source": "seed"
    },
    {
      "date": "2023-11-26T10:00:00.000Z",
      "price": 3545.00,
      "market": "Kiambu",
      "source": "manual"
    }
  ],

  "analysis": {
    "trend": {
      "direction": "rising",
      "movingAverages": {
        "sma7": 3810.25,
        "sma14": 3785.50,
        "sma30": 3720.00
      },
      "momentum": {
        "7day": 3.45,
        "14day": 5.20
      },
      "volatility": {
        "dailyVolatility": 1.85,
        "annualizedVolatility": 29.35
      },
      "priceRange": {
        "high": 3920.00,
        "low": 3580.00,
        "average": 3750.25
      }
    },
    "forecast": {
      "direction": "moderate_increase",
      "priceChangePct": 4.20,
      "horizonDays": 30,
      "reliability": "moderate",
      "predictions": [
        {
          "date": "2024-02-23",
          "predictedPrice": 3855.00,
          "confidence90": {
            "lower": 3780.00,
            "upper": 3930.00
          },
          "dayAhead": 1
        }
      ]
    },
    "seasonal": {
      "currentMonth": "February",
      "currentFactor": 1.0,
      "seasonalSignal": "neutral",
      "peakMonths": [
        { "month": "May", "factor": 1.1 },
        { "month": "April", "factor": 1.08 }
      ],
      "valleyMonths": [
        { "month": "September", "factor": 0.88 },
        { "month": "August", "factor": 0.9 }
      ],
      "nextPeakMonth": "March",
      "monthsUntilPeak": 1
    }
  },

  "recommendation": {
    "action": "HOLD",
    "urgency": "moderate",
    "confidence": "high",
    "summary": "We recommend holding your Maize for now. Prices typically peak around May, which is 3 month(s) away. Our forecast shows prices are likely to rise by 4.2% over the next 30 days.",
    "compositeScore": -12.5,
    "reasoning": {
      "trend": [
        "Price trend is rising — holding may yield better returns",
        "Strong upward momentum (6.2% in 7 days) — prices still climbing"
      ],
      "forecast": [
        "Forecast shows 4.2% price increase — consider holding"
      ],
      "seasonal": [
        "February typically has below-average prices — consider holding",
        "Prices typically peak in May (3 months away)"
      ]
    }
  },

  "generatedAt": "2024-02-22T12:00:00.000Z"
}
```

### Insufficient Data Response (200 OK)

```json
{
  "status": "insufficient_data",
  "message": "Insufficient market data for Maize in Nairobi. Only 3 records found.",
  "commodity": {
    "id": "uuid",
    "name": "Maize",
    "category": "Grain",
    "unit": "bag (90kg)",
    "maxStorageDays": 365
  },
  "county": "Nairobi",
  "priceHistory": [],
  "dataPoints": 3
}
```

### Error Response (400 Bad Request)

```json
{
  "error": "commodityId query parameter is required"
}
```

### Error Response (404 Not Found)

```json
{
  "error": "Commodity not found"
}
```

---

## Response Fields Explained

### priceSummary
- **current**: Latest recorded price
- **currentDate**: When the latest price was recorded
- **currentMarket**: Which market reported the latest price
- **average**: Mean price over the period
- **minimum**: Lowest price in the period
- **maximum**: Highest price in the period
- **currency**: Price currency (KES = Kenyan Shillings)

### priceHistory
Array of all price records for charting. Each entry includes:
- **date**: When the price was recorded
- **price**: Price value
- **market**: Market/location name
- **source**: Data source ("seed", "manual", "scraper")

### analysis.trend
- **direction**: "rising", "falling", or "stable"
- **movingAverages**: SMA7, SMA14, SMA30 (smoothed price trends)
- **momentum**: 7-day and 14-day percentage change
- **volatility**: Price fluctuation metrics
- **priceRange**: High, low, and average for the period

### analysis.forecast
- **direction**: "strong_increase", "moderate_increase", "stable", "moderate_decrease", "strong_decrease"
- **priceChangePct**: Expected % change over horizon
- **horizonDays**: Forecast period (30 days)
- **reliability**: "high", "moderate", or "low" based on R²
- **predictions**: Day-by-day predicted prices with confidence bands

### analysis.seasonal
- **currentMonth**: Current calendar month
- **currentFactor**: Seasonal multiplier (>1 = above average, <1 = below average)
- **seasonalSignal**: "strong_sell", "sell", "neutral", "hold", "strong_hold"
- **peakMonths**: Best months to sell (highest prices)
- **valleyMonths**: Worst months to sell (lowest prices)
- **nextPeakMonth**: Next upcoming peak month
- **monthsUntilPeak**: How long to wait for peak prices

### recommendation
- **action**: "SELL", "CONSIDER_SELLING", "HOLD", or "STRONG_HOLD"
- **urgency**: "high", "moderate", or "low"
- **confidence**: "high", "moderate", or "low" (based on data quality)
- **summary**: Human-readable recommendation text
- **compositeScore**: Weighted score (-100 to +100, positive = sell, negative = hold)
- **reasoning**: Detailed explanations for each factor

---

## Usage in Frontend

### Step 1: Get Commodities List

```javascript
const response = await fetch('/api/commodities', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { commodities } = await response.json();
```

### Step 2: Let Farmer Select Commodity and County

```javascript
// User selects from dropdown:
const selectedCommodityId = "uuid-of-maize";
const selectedCounty = "Nairobi"; // Optional
```

### Step 3: Fetch Dashboard Data

```javascript
const params = new URLSearchParams({
  commodityId: selectedCommodityId,
  county: selectedCounty,
  days: 90
});

const response = await fetch(`/api/market-analysis/dashboard?${params}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const dashboard = await response.json();
```

### Step 4: Display in UI

```javascript
if (dashboard.status === 'ok') {
  // Show price summary
  console.log(`Current Price: ${dashboard.priceSummary.currency} ${dashboard.priceSummary.current}`);
  
  // Show recommendation
  console.log(`Recommendation: ${dashboard.recommendation.action}`);
  console.log(`Summary: ${dashboard.recommendation.summary}`);
  
  // Plot price history chart
  const chartData = dashboard.priceHistory.map(p => ({
    x: new Date(p.date),
    y: p.price
  }));
  
  // Show trend indicators
  console.log(`Trend: ${dashboard.analysis.trend.direction}`);
  console.log(`7-day momentum: ${dashboard.analysis.trend.momentum['7day']}%`);
  
} else {
  console.log(dashboard.message); // Insufficient data
}
```

---

## Kenyan Counties Supported

The system supports all 47 Kenyan counties. Common ones in the seed data:

- Nairobi
- Kiambu
- Nakuru
- Mombasa
- Kisumu
- Uasin Gishu (Eldoret)
- Machakos

Farmers can filter by any county name (case-insensitive partial match).

---

## Data Requirements

- **Minimum 5 price records** needed for basic analysis
- **14+ records** recommended for reliable forecasting
- **30+ records** for high-confidence recommendations

If insufficient data exists for the selected county/commodity combination, the API returns a helpful message and suggests trying a broader filter (e.g., remove county filter).

---

## Related Endpoints

- `GET /api/commodities` - List all available commodities
- `GET /api/market-data?commodityId=<id>&county=<name>` - Raw price data
- `POST /api/market-data` - Submit manual price entry
- `GET /api/recommendations/:unitId` - Storage-specific recommendation

---

## Notes

1. **County filtering is optional** - omit the `county` parameter to see prices from all counties
2. **Recommendations are general** - for storage-specific advice (considering spoilage risk), use `/api/recommendations/:unitId`
3. **Data is cached** - market analysis runs every 4 hours via cron, but dashboard queries are real-time
4. **Authentication required** - farmers must be logged in to access their dashboard
