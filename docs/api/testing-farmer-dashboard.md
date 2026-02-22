# Testing the Farmer Market Dashboard

## Setup

### 1. Run Database Migration

```bash
cd backend
psql -h <supabase-host> -U postgres -d postgres -f src/migrations/add_county_to_market_data.sql
```

Or in Supabase SQL Editor, paste the contents of `src/migrations/add_county_to_market_data.sql`

### 2. Seed Market Data with Counties

```bash
npm run seed:market
```

This will generate 180 days of price history with county information for all commodities.

### 3. Start the Backend

```bash
npm run dev
```

---

## Testing with cURL

### Step 1: Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "farmer@agrovault.dev",
    "password": "password123"
  }'
```

**Copy the `token` from the response.**

### Step 2: Get Commodities

```bash
curl http://localhost:3000/api/commodities \
  -H "Authorization: Bearer <your-token>"
```

**Copy a `commodityId` (e.g., Maize UUID).**

### Step 3: Test Dashboard - All Counties

```bash
curl "http://localhost:3000/api/market-analysis/dashboard?commodityId=<commodity-uuid>&days=90" \
  -H "Authorization: Bearer <your-token>"
```

### Step 4: Test Dashboard - Specific County

```bash
curl "http://localhost:3000/api/market-analysis/dashboard?commodityId=<commodity-uuid>&county=Nairobi&days=90" \
  -H "Authorization: Bearer <your-token>"
```

### Step 5: Test with Different Counties

```bash
# Kiambu County
curl "http://localhost:3000/api/market-analysis/dashboard?commodityId=<commodity-uuid>&county=Kiambu" \
  -H "Authorization: Bearer <your-token>"

# Nakuru County
curl "http://localhost:3000/api/market-analysis/dashboard?commodityId=<commodity-uuid>&county=Nakuru" \
  -H "Authorization: Bearer <your-token>"
```

---

## Testing with Postman

### Collection Setup

1. Create a new collection: "AgroVault Farmer Dashboard"
2. Add environment variables:
   - `baseUrl`: `http://localhost:3000/api`
   - `token`: (will be set after login)
   - `commodityId`: (will be set after fetching commodities)

### Request 1: Login

```
POST {{baseUrl}}/auth/login
Body (JSON):
{
  "email": "farmer@agrovault.dev",
  "password": "password123"
}

Test Script:
pm.environment.set("token", pm.response.json().token);
```

### Request 2: Get Commodities

```
GET {{baseUrl}}/commodities
Headers:
  Authorization: Bearer {{token}}

Test Script:
const commodities = pm.response.json().commodities;
const maize = commodities.find(c => c.name === "Maize");
pm.environment.set("commodityId", maize.id);
```

### Request 3: Dashboard - All Counties

```
GET {{baseUrl}}/market-analysis/dashboard?commodityId={{commodityId}}&days=90
Headers:
  Authorization: Bearer {{token}}
```

### Request 4: Dashboard - Nairobi

```
GET {{baseUrl}}/market-analysis/dashboard?commodityId={{commodityId}}&county=Nairobi&days=90
Headers:
  Authorization: Bearer {{token}}
```

### Request 5: Dashboard - Kiambu

```
GET {{baseUrl}}/market-analysis/dashboard?commodityId={{commodityId}}&county=Kiambu&days=180
Headers:
  Authorization: Bearer {{token}}
```

---

## Expected Results

### All Counties (No Filter)

- **dataPoints**: ~126 records (180 days × 70% market days)
- **priceHistory**: Prices from Nairobi, Kiambu, Nakuru, Mombasa, Kisumu, etc.
- **priceSummary.currentMarket**: Random market from the list

### Nairobi County Only

- **dataPoints**: ~18 records (126 total ÷ 7 markets)
- **priceHistory**: Only prices from Nairobi market
- **priceSummary.currentMarket**: "Nairobi"

### Kiambu County Only

- **dataPoints**: ~18 records
- **priceHistory**: Only prices from Kiambu market
- **priceSummary.currentMarket**: "Kiambu"

---

## What to Check

### ✅ Price Summary
- Current price should be the latest in the dataset
- Average should be between min and max
- Currency should be "KES"

### ✅ Price History
- Array should be sorted by date (oldest to newest)
- Each entry should have: date, price, market, source
- If county filter is applied, all entries should be from that county

### ✅ Analysis
- **Trend direction**: "rising", "falling", or "stable"
- **Moving averages**: sma7 < sma14 < sma30 (if falling) or sma7 > sma14 > sma30 (if rising)
- **Momentum**: Positive % = rising, negative % = falling
- **Forecast**: Should show 30 predictions with confidence bands
- **Seasonal**: Should show peak/valley months for the commodity

### ✅ Recommendation
- **action**: SELL, CONSIDER_SELLING, HOLD, or STRONG_HOLD
- **urgency**: high, moderate, or low
- **summary**: Should be a complete sentence explaining the recommendation
- **reasoning**: Should have explanations for trend, forecast, and seasonal factors

---

## Troubleshooting

### "Insufficient market data"

**Cause**: Not enough price records for the selected county/commodity.

**Solution**: 
1. Run `npm run seed:market` to generate data
2. Try without county filter first
3. Reduce the `days` parameter

### "Commodity not found"

**Cause**: Invalid commodityId UUID.

**Solution**: 
1. Run `GET /api/commodities` to get valid IDs
2. Check that you're using the full UUID, not the name

### "Authentication required"

**Cause**: Missing or invalid JWT token.

**Solution**: 
1. Login again to get a fresh token
2. Check that the token is in the `Authorization: Bearer <token>` header

### Empty priceHistory array

**Cause**: No data for the specified filters.

**Solution**: 
1. Check that market data was seeded
2. Try a different county or remove the county filter
3. Increase the `days` parameter

---

## Sample Response Validation

A valid response should have:

```javascript
{
  status: "ok",
  commodity: { id, name, category, unit, maxStorageDays },
  county: string,
  dataPoints: number > 5,
  periodDays: number,
  priceSummary: {
    current: number,
    currentDate: ISO date string,
    currentMarket: string,
    average: number,
    minimum: number,
    maximum: number,
    currency: "KES"
  },
  priceHistory: Array (length > 5),
  analysis: {
    trend: { direction, movingAverages, momentum, volatility, priceRange },
    forecast: { direction, priceChangePct, horizonDays, reliability, predictions },
    seasonal: { currentMonth, seasonalSignal, peakMonths, valleyMonths, nextPeakMonth }
  },
  recommendation: {
    action: string,
    urgency: string,
    confidence: string,
    summary: string,
    compositeScore: number,
    reasoning: { trend, forecast, seasonal }
  },
  generatedAt: ISO date string
}
```

---

## Next Steps

After testing the API:

1. **Integrate with Flutter frontend** - Create a dashboard screen that calls this endpoint
2. **Add county dropdown** - Let farmers select their county from a list
3. **Add price charts** - Plot `priceHistory` with moving averages
4. **Show recommendation prominently** - Display the `summary` and `action` in a card
5. **Add manual price entry** - Let farmers contribute prices via `POST /api/market-data`
