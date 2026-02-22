# 🌱 Seeds Folder - Complete Explanation

## What is the Seeds Folder?

The `seeds` folder contains **database seeding scripts** that populate your database with initial data for development and testing.

**Location:** `backend/src/seeds/`

---

## 🎯 Purpose

### Why Do We Need Seeds?

1. **Quick Setup** - New developers can set up the database instantly
2. **Testing** - Provides consistent test data
3. **Development** - Work with realistic data immediately
4. **Demo** - Show the app with sample data
5. **Market Analysis** - Needs historical price data to work

---

## 📁 Files in the Seeds Folder

### 1. `seed.js` - Main Seeder
**What it does:**
- Creates 7 default commodities (Maize, Wheat, Rice, Beans, etc.)
- Creates a demo user account
- Creates a demo storage unit

**Run with:**
```bash
npm run seed
```

### 2. `seedMarketData.js` - Market Data Seeder
**What it does:**
- Generates 180 days of realistic price history
- Creates ~126 price records per commodity
- Simulates market fluctuations and seasonal patterns
- Adds county information to prices

**Run with:**
```bash
npm run seed:market
```

---

## 🔍 Detailed Breakdown

### `seed.js` - Main Seeder

#### Step 1: Seed Commodities
Creates 7 Kenyan staple crops with optimal storage conditions:

```javascript
{
  name: "Maize",
  category: "Grain",
  optimalTempMin: 10,      // Minimum safe temperature (°C)
  optimalTempMax: 15,      // Maximum safe temperature (°C)
  optimalHumidityMin: 12,  // Minimum safe humidity (%)
  optimalHumidityMax: 14,  // Maximum safe humidity (%)
  maxStorageDays: 365,     // How long it can be stored
  unit: "bag (90kg)"       // How it's measured
}
```

**Commodities Created:**
1. **Maize** - Grain, 365 days, 10-15°C, 12-14% humidity
2. **Wheat** - Grain, 365 days, 10-15°C, 11-13% humidity
3. **Rice** - Grain, 365 days, 15-20°C, 12-14% humidity
4. **Beans** - Legume, 180 days, 10-18°C, 12-15% humidity
5. **Sorghum** - Grain, 365 days, 10-15°C, 12-14% humidity
6. **Irish Potatoes** - Tuber, 90 days, 4-8°C, 85-95% humidity
7. **Coffee (dried)** - Cash Crop, 365 days, 15-20°C, 10-12% humidity

#### Step 2: Create Demo User
```javascript
Email: farmer@agrovault.dev
Password: password123
Name: Demo Farmer
Phone: +254700000000
Location: Nakuru, Kenya
```

**Why?** So you can login immediately without registering.

#### Step 3: Create Demo Storage Unit
```javascript
Name: "Barn A - Maize Storage"
Location: "-0.3031, 36.0800" (GPS coordinates)
Capacity: 5000 kg
Current Stock: 3200 kg
Commodity: Maize
Device ID: ESP32-001
API Key: dev_api_key_001
```

**Why?** So you can test storage features immediately.

---

### `seedMarketData.js` - Market Data Seeder

#### What It Generates

For **each commodity**, it creates **180 days** of price history with:
- Realistic price fluctuations
- Seasonal patterns (Kenya's agricultural calendar)
- Multiple markets (Nairobi, Mombasa, Kisumu, etc.)
- County information
- ~70% market days (simulates 5 days/week markets)

#### How It Works

**1. Base Prices (KES)**
```javascript
Maize: 3,800 per bag (90kg)
Wheat: 4,200 per bag (90kg)
Rice: 7,500 per bag (50kg)
Beans: 8,500 per bag (90kg)
Sorghum: 3,200 per bag (90kg)
Irish Potatoes: 55 per kg
Coffee: 450 per kg
```

**2. Seasonal Patterns**
Based on Kenya's two rainy seasons:
- **Long rains** (Mar-May) → Harvest Jun-Aug → Prices DROP
- **Short rains** (Oct-Dec) → Harvest Jan-Feb → Prices DROP
- **Lean season** (Mar-May, Nov-Dec) → Low supply → Prices PEAK

Example for Maize:
```javascript
January:   0.98 (2% below average)
February:  1.00 (average)
March:     1.05 (5% above average) ← Lean season
April:     1.08 (8% above average) ← Peak
May:       1.10 (10% above average) ← Peak
June:      1.03 (3% above average)
July:      0.95 (5% below average)
August:    0.90 (10% below average) ← Post-harvest
September: 0.88 (12% below average) ← Lowest
October:   0.93 (7% below average)
November:  0.98 (2% below average)
December:  1.02 (2% above average)
```

**3. Price Simulation Algorithm**
```javascript
// For each day:
1. Get seasonal factor for current month
2. Calculate seasonal price = base × seasonal_factor
3. Add random fluctuation (volatility)
4. Apply mean reversion (prices gravitate toward seasonal norm)
5. Ensure price doesn't drop below 50% of base
6. Round to 2 decimal places
7. 70% chance of recording (simulate market days)
```

**4. Markets & Counties**
Each price is assigned to a random market:
```javascript
Nairobi → Nairobi County
Mombasa → Mombasa County
Kisumu → Kisumu County
Nakuru → Nakuru County
Eldoret → Uasin Gishu County
Kiambu → Kiambu County
Machakos → Machakos County
```

#### Example Output

For **Maize** over 180 days:
```
~126 price records created (180 days × 70% market days)

Sample records:
Date: 2023-11-25, Price: 3,520 KES, Market: Nairobi, County: Nairobi
Date: 2023-11-26, Price: 3,545 KES, Market: Kisumu, County: Kisumu
Date: 2023-11-28, Price: 3,580 KES, Market: Nakuru, County: Nakuru
...
Date: 2024-05-20, Price: 4,180 KES, Market: Nairobi, County: Nairobi (Peak!)
...
Date: 2024-09-15, Price: 3,350 KES, Market: Mombasa, County: Mombasa (Low!)
```

---

## 🚀 How to Use

### First Time Setup

```bash
# 1. Create database tables (in Supabase SQL Editor)
# Run: backend/supabase-schema-public.sql

# 2. Seed commodities and demo user
cd backend
npm run seed

# 3. Seed market price data
npm run seed:market

# 4. Start the server
npm run dev

# 5. Login with demo account
# Email: farmer@agrovault.dev
# Password: password123
```

### Re-seeding

If you want to reset the data:

```bash
# Re-seed commodities and demo user
npm run seed

# Re-seed market data (deletes old seed data first)
npm run seed:market
```

---

## 📊 What Gets Created

### After `npm run seed`:
- ✅ 7 commodities in `agro_commodities` table
- ✅ 1 demo user in `agro_users` table
- ✅ 1 demo storage unit in `agro_storage_units` table

### After `npm run seed:market`:
- ✅ ~882 price records in `agro_market_data` table
  - 7 commodities × 126 records each
  - 180 days of history
  - Multiple markets and counties

---

## 🎯 Why This Data is Important

### For Development
- **Instant setup** - No manual data entry
- **Consistent data** - Everyone has the same test data
- **Realistic scenarios** - Prices behave like real markets

### For Testing
- **Market Dashboard** - Needs price history to show graphs
- **Recommendations** - Needs data to analyze trends
- **Forecasting** - Needs historical data to predict future
- **Seasonal Analysis** - Needs year-round data

### For Demo
- **Show features** - Demonstrate the app with real-looking data
- **Impress users** - Professional demo with charts and insights
- **Quick onboarding** - New users see value immediately

---

## 🔧 Technical Details

### Gaussian Random Walk
The price simulation uses a **Gaussian random walk** with **mean reversion**:

```javascript
function gaussianRandom() {
  // Box-Muller transform for normal distribution
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Price calculation
drift = (seasonalPrice - currentPrice) × 0.05  // Pull toward seasonal norm
shock = gaussianRandom() × volatility × basePrice  // Random fluctuation
newPrice = currentPrice + drift + shock
```

**Result:** Prices fluctuate randomly but stay near seasonal averages.

### Volatility Levels
Different commodities have different volatility:
```javascript
Maize: 3% (stable)
Wheat: 2.5% (very stable)
Rice: 2% (very stable)
Beans: 4% (more volatile)
Sorghum: 3% (stable)
Irish Potatoes: 5% (most volatile - perishable)
Coffee: 2% (stable - cash crop)
```

### Batch Insertion
Prices are inserted in batches of 50 to avoid overwhelming the database:
```javascript
for (let i = 0; i < entries.length; i += 50) {
  const batch = entries.slice(i, i + 50);
  await supabase.from("agro_market_data").insert(batch);
}
```

---

## 📝 Package.json Scripts

```json
{
  "scripts": {
    "seed": "node src/seeds/seed.js",
    "seed:market": "node src/seeds/seedMarketData.js"
  }
}
```

**Why separate scripts?**
- `seed` is quick (creates ~10 records)
- `seed:market` is slower (creates ~882 records)
- You might want to re-seed market data without touching commodities

---

## 🎓 Learning Points

### 1. Idempotent Seeding
The seeders check if data exists before inserting:
```javascript
const { data: exists } = await supabase
  .from("agro_commodities")
  .select("id")
  .eq("name", "Maize")
  .maybeSingle();

if (!exists) {
  // Only insert if doesn't exist
  await supabase.from("agro_commodities").insert(commodity);
}
```

**Why?** You can run `npm run seed` multiple times safely.

### 2. Password Hashing
Demo user password is hashed before storage:
```javascript
password: await bcrypt.hash("password123", 12)
```

**Why?** Never store plain text passwords, even in seeds.

### 3. Realistic Data
Market data uses actual Kenyan agricultural patterns:
- Real base prices (as of 2024)
- Real seasonal patterns (long/short rains)
- Real markets (Nairobi, Mombasa, etc.)

**Why?** Makes the demo more convincing and useful.

---

## 🚨 Common Issues

### "Commodities not found"
**Problem:** Running `seed:market` before `seed`

**Solution:**
```bash
npm run seed        # Run this first
npm run seed:market # Then this
```

### "Table does not exist"
**Problem:** Database tables not created

**Solution:** Run the SQL schema in Supabase first:
```bash
# In Supabase SQL Editor, run:
backend/supabase-schema-public.sql
```

### "Duplicate key error"
**Problem:** Trying to insert data that already exists

**Solution:** The seeders handle this automatically. If you see this, there might be a bug.

---

## 📚 Summary

### `seed.js`
- **Purpose:** Create initial commodities, demo user, demo storage unit
- **When:** Run once during setup
- **Time:** ~2 seconds
- **Records:** ~10

### `seedMarketData.js`
- **Purpose:** Generate realistic price history for market analysis
- **When:** Run after `seed.js`
- **Time:** ~10-15 seconds
- **Records:** ~882 (7 commodities × 126 prices)

### Why Seeds Matter
✅ **Fast setup** - Database ready in seconds  
✅ **Consistent data** - Everyone has same test data  
✅ **Realistic demo** - Professional-looking charts and insights  
✅ **Market analysis works** - Needs historical data  
✅ **Easy testing** - No manual data entry  

**Without seeds:** You'd have to manually create commodities, register users, create storage units, and enter hundreds of price records. **With seeds:** Just run two commands! 🎉
