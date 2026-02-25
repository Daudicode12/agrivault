# Market Data Update System

## Quick Start

```bash
# One-time setup
npm run seed              # Create commodities & demo user
npm run seed:market       # Generate 180 days of price history

# Daily updates
npm run update:prices     # Add today's prices (run once per day)
```

## Scripts

### 1. Initial Historical Data
```bash
npm run seed:market
```
Generates 180 days of historical prices ending today.

### 2. Daily Price Updates
```bash
npm run update:prices
```
Adds 2-4 new price entries per commodity for today. Safe to run multiple times (skips if today's data exists).

### 3. Automatic Scheduler
```bash
node src/seeds/priceScheduler.js
```
Runs daily updates automatically at 10:00 AM.

## Troubleshooting

**Prices not showing?**
```bash
npm run update:prices
```

**Dates stuck on old date?**
```bash
npm run seed:market    # Re-seeds with current dates
npm run update:prices  # Adds today's prices
```

**Force refresh today's prices:**
```sql
DELETE FROM agro_market_data WHERE recordedAt >= CURRENT_DATE;
```
Then run `npm run update:prices`
