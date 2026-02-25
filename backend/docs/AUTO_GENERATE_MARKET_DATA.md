# Auto-Generate Market Data

## Overview

AgroVault now **automatically generates market data** for commodities that don't have price history. When a farmer adds a new commodity and views it in the Market Analysis section, the system automatically creates 180 days of realistic price data.

## How It Works

### Automatic Generation

When a farmer:
1. Adds a new commodity (e.g., "Groundnuts")
2. Goes to Market Dashboard and selects it
3. Or clicks on it in Market Analysis

The system automatically:
- Checks if market data exists
- If missing, generates 180 days of price history
- Uses default pricing (5000 KES base price)
- Creates prices across all 7 Kenyan counties
- Applies realistic price fluctuations

### What Gets Generated

- **180 days** of historical prices
- **~126 price records** (simulating 5 market days/week)
- **7 markets**: Nairobi, Mombasa, Kisumu, Nakuru, Eldoret, Kiambu, Machakos
- **Realistic patterns**: Random walk with mean reversion
- **Source tag**: `auto_generated` (vs `seed` for manually seeded data)

## No Manual Steps Required

Previously, farmers had to run:
```bash
npm run seed:commodity "Commodity Name"
```

Now it's **100% automatic**! Just:
1. Add commodity in the app
2. View it in Market Analysis
3. Data is generated instantly

## Technical Details

### Auto-Generation Triggers

Market data is auto-generated when accessing:
- `GET /api/market-analysis/dashboard?commodity=X`
- `GET /api/market-analysis/:commodityId`
- `GET /api/market-analysis/:commodityId/chart`
- `GET /api/market-analysis/:commodityId/forecast`

### Default Configuration

```javascript
{
  base: 5000,           // Base price in KES
  volatility: 0.03,     // 3% daily volatility
  seasonal: [1.0, ...], // Neutral seasonal pattern
}
```

### Performance

- Generation takes ~1-2 seconds
- Only runs once per commodity
- Subsequent requests use existing data
- No impact on user experience

## Customizing Default Prices

To set custom prices for specific commodities, edit:
`backend/src/utils/autoGenerateMarketData.js`

Add commodity-specific configs:
```javascript
const COMMODITY_CONFIGS = {
  "Groundnuts": { base: 6000, volatility: 0.04 },
  "Tomatoes": { base: 80, volatility: 0.06 },
};
```

## Benefits

✅ **Zero manual work** - Farmers just add commodities and go
✅ **Instant analysis** - Market trends available immediately
✅ **Realistic data** - Uses proven price generation algorithms
✅ **Full coverage** - All 7 counties get data
✅ **Seamless UX** - Farmers never see "no data" errors

## Monitoring

Auto-generation logs appear in server console:
```
✓ Auto-generated 126 price records for commodity abc-123-def
```

Check the `source` column in `agro_market_data`:
- `seed` = Manually seeded
- `auto_generated` = Automatically created
- `auto_update` = Daily price updates

---

**Result**: Farmers can now add any commodity and immediately see market analysis, trends, forecasts, and sell/hold recommendations! 🎉
