# KNBS Integration - Quick Start Guide

## Reality Check: KNBS Has NO Public API ❌

**Important**: Kenya National Bureau of Statistics (KNBS) does **NOT** provide a public API for commodity prices. You must use manual data import.

---

## How to Get KNBS Data

### Step 1: Visit KNBS Website

Go to: **https://www.knbs.or.ke**

Navigate to:
- Statistics → Agriculture → Commodity Prices
- Or: Downloads → Statistical Reports

### Step 2: Download Price Reports

Look for:
- "Weekly Market Prices"
- "Consumer Price Index (CPI)"
- "Agricultural Statistics"

Format: Usually PDF or Excel

### Step 3: Convert to CSV

If Excel:
1. Open in Excel/LibreOffice
2. Save As → CSV format
3. Ensure columns: Date, Commodity, Market, County, Price, Unit

If PDF:
1. Copy table data
2. Paste into Excel
3. Clean and format
4. Save as CSV

---

## Import KNBS Data into AgroVault

### Method 1: Using Import Tool (Recommended)

```bash
cd backend

# Import CSV file
node src/utils/importKNBSData.js data/knbs_prices.csv
```

**CSV Format Required:**
```csv
Date,Commodity,Market,County,Price,Unit
2025-02-25,Maize,Nairobi,Nairobi,3850,90kg bag
2025-02-25,Beans,Nakuru,Nakuru,8200,90kg bag
```

### Method 2: Test with Sample Data

```bash
# Import sample data (already included)
node src/utils/importKNBSData.js data/sample_knbs_prices.csv
```

---

## Alternative: Real-Time Data Sources

Since KNBS has no API, consider these alternatives:

### 1. RATIN (Regional Agricultural Trade Intelligence Network)

**Website**: https://ratin.net

**Contact for API Access:**
- Email: info@ratin.net
- Explain: Building farmer platform
- Request: API partnership

**What They Offer:**
- Real-time market prices
- Daily updates
- East Africa coverage
- Mobile app data

### 2. EAGC (Eastern Africa Grain Council)

**Website**: https://www.eagc.org

**How to Get API:**
1. Apply for membership: https://www.eagc.org/membership
2. Cost: ~$500-2000/year
3. Request API credentials after approval
4. Get API documentation

**What They Offer:**
- Daily grain prices
- API access
- Market analysis
- SMS alerts

### 3. Kenya Open Data Portal

**Website**: https://kenya.opendataforafrica.org

**Steps:**
1. Search: "commodity prices"
2. Download datasets (CSV/JSON)
3. Some datasets have API endpoints
4. Free but limited

---

## Recommended Workflow

### Weekly Routine (15 minutes)

**Every Monday:**
1. Visit KNBS website
2. Download latest price report
3. Convert to CSV
4. Run import: `node src/utils/importKNBSData.js data/latest.csv`
5. Verify in Market Dashboard

### Automation Options

**Option A: Hire Data Entry Assistant**
- Cost: ~$50/month
- Task: Weekly KNBS data entry
- Time: 30 minutes/week

**Option B: Partner with RATIN**
- Cost: Free (partnership) or paid
- Benefit: Automated daily updates
- Contact: info@ratin.net

**Option C: EAGC Membership**
- Cost: $500-2000/year
- Benefit: API access
- Best for: Serious operations

---

## CSV Format Guide

### Required Columns

| Column | Example | Notes |
|---|---|---|
| Date | 2025-02-25 | ISO format (YYYY-MM-DD) |
| Commodity | Maize | Must match your commodity names |
| Market | Nairobi | Market name |
| County | Nairobi | County name |
| Price | 3850 | Numeric only |
| Unit | 90kg bag | Optional |

### Commodity Name Matching

Your database commodities:
- Maize
- Wheat
- Rice
- Beans
- Sorghum
- Irish Potatoes
- Coffee (dried)

KNBS names must match exactly (case-insensitive).

---

## Testing the Import

### 1. Test with Sample Data

```bash
node src/utils/importKNBSData.js data/sample_knbs_prices.csv
```

Expected output:
```
=== KNBS Market Data Importer ===

Found 14 price records in CSV

Imported: 14

=== Import Complete ===
✓ Imported: 14
⚠ Skipped: 0
✗ Errors: 0

Total processed: 14
```

### 2. Verify in Database

Check Supabase:
```sql
SELECT * FROM agro_market_data 
WHERE source = 'KNBS' 
ORDER BY recordedAt DESC 
LIMIT 10;
```

### 3. View in Market Dashboard

1. Open AgroVault app
2. Go to Market Dashboard
3. Select commodity
4. Should see KNBS prices

---

## Troubleshooting

### "Unknown commodity" Error

**Problem**: CSV commodity name doesn't match database

**Solution**: 
1. Check your commodities: `SELECT name FROM agro_commodities;`
2. Update CSV to match exactly
3. Or add commodity in app first

### "Invalid price" Error

**Problem**: Price column has non-numeric characters

**Solution**:
1. Remove currency symbols (KES, Ksh)
2. Remove commas (3,850 → 3850)
3. Ensure decimal point (not comma)

### "Duplicate" Skipped

**Problem**: Price already exists for that date/market

**Solution**: This is normal! Import skips duplicates automatically.

---

## Next Steps

1. **Download KNBS data** from their website
2. **Convert to CSV** using the format above
3. **Run import tool** weekly
4. **Consider RATIN partnership** for automation
5. **Encourage farmers** to submit prices they observe

---

## Contact Information

**RATIN (Best for API):**
- Website: https://ratin.net
- Email: info@ratin.net
- Phone: Check website

**EAGC (Grain prices):**
- Website: https://www.eagc.org
- Email: info@eagc.org

**KNBS (Manual data):**
- Website: https://www.knbs.or.ke
- No API available

---

## Summary

✅ **What Works**: Manual CSV import from KNBS reports
✅ **What's Built**: Import tool ready to use
❌ **What Doesn't Exist**: KNBS public API
🔧 **Best Alternative**: Partner with RATIN for automated data

Start with weekly manual imports, then pursue RATIN partnership for automation!
