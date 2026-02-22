# 🌾 Farmer Market Dashboard - Quick Reference

## New Feature: County-Filtered Market Analysis

Farmers can now view market prices and recommendations filtered by their county and commodity.

---

## 🚀 Quick Start

### 1. Run Migration
```bash
# In Supabase SQL Editor, run:
ALTER TABLE agro_market_data ADD COLUMN county VARCHAR(100);
CREATE INDEX idx_market_data_county ON agro_market_data (county);
```

### 2. Seed Data
```bash
cd backend
npm run seed:market
```

### 3. Test API
```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"farmer@agrovault.dev","password":"password123"}' \
  | jq -r '.token')

# Get Maize prices in Nairobi
curl "http://localhost:3000/api/market-analysis/dashboard?commodityId=<uuid>&county=Nairobi&days=90" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 📍 API Endpoint

```
GET /api/market-analysis/dashboard
```

**Query Parameters:**
- `commodityId` (required) - UUID of commodity
- `county` (optional) - Filter by county name
- `days` (optional) - Lookback period (default: 90)

**Authentication:** JWT Bearer token required

---

## 📊 Response Includes

✅ **Price Summary** - Current, average, min, max prices  
✅ **Full Price History** - All records for charting  
✅ **Trend Analysis** - Moving averages, momentum, volatility  
✅ **Price Forecast** - 30-day predictions with confidence bands  
✅ **Seasonal Patterns** - Peak/valley months  
✅ **Sell/Hold Recommendation** - Actionable advice with reasoning  

---

## 🗺️ Supported Counties

- Nairobi
- Kiambu
- Nakuru
- Mombasa
- Kisumu
- Uasin Gishu (Eldoret)
- Machakos

---

## 📱 Frontend Integration

```dart
// Fetch dashboard data
final response = await http.get(
  Uri.parse('$baseUrl/market-analysis/dashboard')
    .replace(queryParameters: {
      'commodityId': selectedCommodityId,
      'county': selectedCounty,
      'days': '90',
    }),
  headers: {'Authorization': 'Bearer $token'},
);

final dashboard = DashboardData.fromJson(jsonDecode(response.body));

// Display recommendation
Text('${dashboard.recommendation.action}'); // SELL or HOLD
Text('${dashboard.recommendation.summary}'); // Human-readable advice
```

---

## 📚 Documentation

- **Full API Reference**: `docs/api/farmer-dashboard.md`
- **Testing Guide**: `docs/api/testing-farmer-dashboard.md`
- **Implementation Details**: `docs/FARMER_DASHBOARD_IMPLEMENTATION.md`

---

## ✨ Example Response

```json
{
  "status": "ok",
  "commodity": { "name": "Maize" },
  "county": "Nairobi",
  "priceSummary": {
    "current": 3842.50,
    "average": 3750.25,
    "currency": "KES"
  },
  "recommendation": {
    "action": "HOLD",
    "urgency": "moderate",
    "summary": "We recommend holding your Maize. Prices typically peak around May..."
  }
}
```
