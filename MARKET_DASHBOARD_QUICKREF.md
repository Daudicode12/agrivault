# 🚀 Market Dashboard - Quick Reference

## Setup (5 minutes)

```bash
# 1. Backend - Run migration
# In Supabase SQL Editor:
ALTER TABLE agro_market_data ADD COLUMN county VARCHAR(100);
CREATE INDEX idx_market_data_county ON agro_market_data (county);

# 2. Seed data
cd backend && npm run seed:market

# 3. Start servers
npm run dev                    # Backend (port 3000)
cd ../frontend && npm run dev  # Frontend (port 5173)

# 4. Test
# Login: farmer@agrovault.dev / password123
# Navigate to: Market Dashboard
```

---

## API Endpoint

```javascript
GET /api/market-analysis/dashboard?commodityId=<uuid>&county=Nairobi&days=90
Authorization: Bearer <token>
```

---

## Frontend Usage

```javascript
import { marketAPI } from '../services/api';

const response = await marketAPI.dashboard({
  commodityId: selectedCommodityId,
  county: selectedCounty,
  days: 90
});

const dashboard = response.data;
```

---

## Response Structure

```javascript
{
  status: "ok",
  commodity: { id, name, category, unit },
  county: "Nairobi",
  dataPoints: 126,
  priceSummary: { current, average, minimum, maximum, currency },
  priceHistory: [{ date, price, market, source }],
  analysis: {
    trend: { direction, movingAverages, momentum, volatility },
    forecast: { direction, priceChangePct, predictions },
    seasonal: { currentMonth, seasonalSignal, peakMonths, nextPeakMonth }
  },
  recommendation: {
    action: "HOLD",
    urgency: "moderate",
    confidence: "high",
    summary: "We recommend holding...",
    compositeScore: -12.5,
    reasoning: { trend, forecast, seasonal }
  }
}
```

---

## Counties Supported

Nairobi, Kiambu, Nakuru, Mombasa, Kisumu, Uasin Gishu, Machakos

---

## Files Changed

**Backend:**
- `routes/marketAnalysis.routes.js` - Added dashboard endpoint
- `routes/marketData.routes.js` - Added county filter
- `seeds/seedMarketData.js` - Added county data
- `migrations/add_county_to_market_data.sql` - New migration

**Frontend:**
- `pages/MarketDashboard.jsx` - New page
- `pages/MarketDashboard.module.css` - Styles
- `services/api.js` - Added dashboard method
- `App.jsx` - Added route
- `components/Sidebar.jsx` - Added nav link

---

## Key Features

✅ County filtering  
✅ Commodity selection  
✅ Time period selector  
✅ Price trend graph (Recharts)  
✅ Sell/Hold recommendations  
✅ Market analysis (trend, forecast, seasonal)  
✅ Detailed reasoning  
✅ Mobile responsive  

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Insufficient data" | Run `npm run seed:market` |
| "Commodity not found" | Check UUID is correct |
| "Authentication required" | Login first |
| Graph not showing | Check recharts is installed |
| Backend error | Check migration ran |

---

## Documentation

📚 Full docs in `docs/` folder:
- `api/farmer-dashboard.md` - API reference
- `api/testing-farmer-dashboard.md` - Testing guide
- `FARMER_DASHBOARD_IMPLEMENTATION.md` - Details
- `FRONTEND_MARKET_DASHBOARD.md` - Frontend guide
- `IMPLEMENTATION_COMPLETE.md` - Summary

---

## Test URLs

```
Frontend: http://localhost:5173/market-dashboard
Backend:  http://localhost:3000/api/market-analysis/dashboard
```

---

## Quick Test

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"farmer@agrovault.dev","password":"password123"}' \
  | jq -r '.token')

# Get commodities
COMMODITY_ID=$(curl -s http://localhost:3000/api/commodities \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.commodities[0].id')

# Test dashboard
curl "http://localhost:3000/api/market-analysis/dashboard?commodityId=$COMMODITY_ID&county=Nairobi&days=90" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

**Status:** ✅ Complete and Ready for Production
