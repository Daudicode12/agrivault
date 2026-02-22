# Frontend Market Dashboard - Setup Guide

## ✅ What Was Added

### New Page: Market Dashboard
- **Location**: `/market-dashboard` (requires login)
- **Features**:
  - County filter dropdown (Nairobi, Kiambu, Nakuru, etc.)
  - Commodity filter dropdown (Maize, Beans, Coffee, etc.)
  - Time period selector (30, 90, 180, 365 days)
  - Price trend graph using Recharts
  - Current price summary cards
  - Sell/Hold recommendation with reasoning
  - Detailed market analysis (trend, forecast, seasonal)

### Files Created
- `frontend/src/pages/MarketDashboard.jsx` - Main dashboard component
- `frontend/src/pages/MarketDashboard.module.css` - Styles

### Files Modified
- `frontend/src/services/api.js` - Added `marketAPI.dashboard()` method
- `frontend/src/App.jsx` - Added `/market-dashboard` route
- `frontend/src/components/Sidebar.jsx` - Added "Market Dashboard" link

---

## 🚀 Quick Start

### 1. Install Dependencies (if not already done)
```bash
cd frontend
npm install
```

The project already has `recharts` installed for the price graph.

### 2. Start Frontend
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

### 3. Start Backend
```bash
cd ../backend
npm run dev
```

Backend runs on `http://localhost:3000`

### 4. Configure Proxy (if needed)

In `frontend/vite.config.js`, ensure proxy is set:

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
```

---

## 📱 How to Use

### Step 1: Login
1. Go to `http://localhost:5173`
2. Click "Sign In" in sidebar
3. Login with:
   - Email: `farmer@agrovault.dev`
   - Password: `password123`

### Step 2: Access Market Dashboard
1. After login, click "Market Dashboard" in sidebar
2. You'll see the dashboard with filters

### Step 3: Filter Data
1. **Select Commodity**: Choose from dropdown (Maize, Beans, etc.)
2. **Select County**: Choose "All Counties" or specific county
3. **Select Period**: Choose 30, 90, 180, or 365 days

### Step 4: View Results
- **Price Summary Cards**: Current, average, min/max prices
- **Recommendation Card**: SELL or HOLD with reasoning
- **Price Trend Graph**: Interactive line chart showing price history
- **Analysis Cards**: Trend, forecast, and seasonal insights
- **Reasoning Section**: Detailed explanations for the recommendation

---

## 🎨 UI Components

### Price Summary Cards
```
┌─────────────────┐  ┌─────────────────┐
│ Current Price   │  │ Average Price   │
│ KES 3,842.50    │  │ KES 3,750.25    │
│ Nairobi         │  │ 90 days         │
└─────────────────┘  └─────────────────┘
```

### Recommendation Card
```
┌────────────────────────────────────────┐
│ HOLD                    [moderate urgency] │
│                                            │
│ We recommend holding your Maize for now.  │
│ Prices typically peak around May...       │
│                                            │
│ Confidence: high  |  Score: -12.5         │
└────────────────────────────────────────┘
```

### Price Trend Graph
- Interactive line chart
- X-axis: Dates
- Y-axis: Prices (KES)
- Hover to see exact values
- Responsive design

---

## 🔧 API Integration

The dashboard calls:
```javascript
GET /api/market-analysis/dashboard?commodityId=<uuid>&county=Nairobi&days=90
```

Response structure:
```javascript
{
  status: "ok",
  commodity: { id, name, category, unit },
  county: "Nairobi",
  dataPoints: 126,
  priceSummary: { current, average, minimum, maximum },
  priceHistory: [{ date, price, market }],
  analysis: { trend, forecast, seasonal },
  recommendation: { action, urgency, summary, reasoning }
}
```

---

## 🎯 Features Breakdown

### 1. County Filtering
- Dropdown with 8 counties
- "All Counties" shows combined data
- Specific county shows only that county's prices

### 2. Commodity Selection
- Fetches all commodities from API
- Dropdown auto-selects first commodity
- Changes trigger new analysis

### 3. Time Period
- 30 days: Recent trends
- 90 days: Quarterly view (default)
- 180 days: Half-year analysis
- 365 days: Full year patterns

### 4. Price Graph
- Built with Recharts library
- Shows price over time
- Green line for price trend
- Tooltip on hover
- Responsive to screen size

### 5. Recommendation Display
- Color-coded: Green (HOLD), Red (SELL)
- Shows urgency level
- Human-readable summary
- Confidence score
- Detailed reasoning

---

## 🐛 Troubleshooting

### "Failed to load dashboard"
**Cause**: Backend not running or wrong URL

**Fix**:
```bash
# Check backend is running
cd backend && npm run dev

# Check proxy in vite.config.js
```

### "Insufficient market data"
**Cause**: No data for selected county/commodity

**Fix**:
```bash
# Seed market data
cd backend
npm run seed:market

# Or select "All Counties" in dropdown
```

### Graph not showing
**Cause**: Missing recharts dependency

**Fix**:
```bash
cd frontend
npm install recharts
```

### "Authentication required"
**Cause**: Not logged in

**Fix**: Click "Sign In" and login first

---

## 📊 Sample Data Flow

```
User selects:
  Commodity: Maize
  County: Nairobi
  Period: 90 days
       ↓
Frontend calls:
  GET /api/market-analysis/dashboard?commodityId=<uuid>&county=Nairobi&days=90
       ↓
Backend:
  1. Fetches 90 days of Nairobi Maize prices
  2. Runs trend analysis (SMA, momentum, volatility)
  3. Generates 30-day forecast
  4. Analyzes seasonal patterns
  5. Calculates sell/hold recommendation
       ↓
Frontend displays:
  - Price summary cards
  - Recommendation card (HOLD)
  - Price trend graph
  - Analysis details
  - Reasoning
```

---

## 🎨 Customization

### Change Graph Colors
In `MarketDashboard.jsx`:
```javascript
<Line 
  stroke="#10b981"  // Change to any color
  strokeWidth={2}
/>
```

### Add More Counties
In `MarketDashboard.jsx`:
```javascript
const COUNTIES = [
  'All Counties',
  'Nairobi',
  'Kiambu',
  'YourCounty',  // Add here
];
```

### Adjust Time Periods
```javascript
<select value={days} onChange={(e) => setDays(Number(e.target.value))}>
  <option value={7}>7 days</option>  // Add custom periods
  <option value={30}>30 days</option>
  <option value={90}>90 days</option>
</select>
```

---

## 📱 Mobile Responsive

The dashboard is fully responsive:
- Filters stack vertically on mobile
- Cards adapt to single column
- Graph scales to screen width
- Touch-friendly controls

---

## 🚀 Next Steps

### Phase 1: Testing ✅
- [x] Create Market Dashboard page
- [x] Add county/commodity filters
- [x] Implement price graph
- [x] Display recommendations
- [x] Add to navigation

### Phase 2: Enhancements
- [ ] Add export to PDF button
- [ ] Add price alerts setup
- [ ] Show multiple commodities comparison
- [ ] Add county price comparison chart
- [ ] Save favorite filters

### Phase 3: Advanced Features
- [ ] Real-time price updates (WebSocket)
- [ ] Push notifications for price peaks
- [ ] Historical comparison (year-over-year)
- [ ] Predictive alerts
- [ ] Social sharing of insights

---

## 📚 Documentation

- **API Reference**: `docs/api/farmer-dashboard.md`
- **Backend Testing**: `docs/api/testing-farmer-dashboard.md`
- **Implementation Details**: `docs/FARMER_DASHBOARD_IMPLEMENTATION.md`

---

## 💡 Tips

1. **Start with "All Counties"** to see maximum data
2. **Use 90 days** as default for good balance
3. **Check reasoning section** to understand recommendations
4. **Compare different counties** to find best selling location
5. **Monitor seasonal patterns** to plan harvest timing
