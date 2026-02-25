# KNBS Market Data Integration Guide

## Overview

**Kenya National Bureau of Statistics (KNBS)** publishes commodity price data, but they **DO NOT have a public API**. However, there are several ways to access their data:

---

## Option 1: KNBS Open Data Portal (RECOMMENDED)

### Access Method: Download CSV/Excel Files

**Website**: https://www.knbs.or.ke/download-statistics/

**Steps:**

1. **Visit KNBS Website**
   - Go to: https://www.knbs.or.ke
   - Navigate to: Statistics → Agriculture → Commodity Prices

2. **Download Price Reports**
   - Monthly Consumer Price Index (CPI) reports
   - Weekly Market Price Bulletins
   - Format: PDF, Excel, CSV

3. **Manual Process** (Current Reality)
   - Download files weekly/monthly
   - Parse Excel/CSV files
   - Import into AgroVault database

### What You Get:
- ✅ Official government data
- ✅ Free access
- ✅ Covers major commodities
- ❌ No API (manual download)
- ❌ Updated weekly/monthly (not real-time)

---

## Option 2: Kenya Open Data Portal

### Access Method: Bulk Data Downloads

**Website**: https://kenya.opendataforafrica.org/

**Steps:**

1. **Visit Portal**
   - Go to: https://kenya.opendataforafrica.org
   - Search: "commodity prices" or "agricultural prices"

2. **Download Datasets**
   - Format: CSV, JSON, XML
   - Historical data available
   - Can be automated with scripts

3. **API Access** (Limited)
   - Some datasets have API endpoints
   - Requires registration
   - Rate limits apply

### Example API Endpoint:
```
https://kenya.opendataforafrica.org/api/data?dataset=commodity-prices
```

---

## Option 3: Regional Agricultural Trade Intelligence Network (RATIN)

### Access Method: Web Scraping or Partnership

**Website**: https://ratin.net

**What They Offer:**
- Real-time market prices
- Multiple East African countries
- Mobile app with price data
- Partnership opportunities for bulk access

**Steps:**

1. **Visit RATIN Website**
   - Go to: https://ratin.net
   - Browse market prices

2. **Request API Access**
   - Contact: info@ratin.net
   - Explain your use case (farmer platform)
   - May require partnership agreement

3. **Alternative: Web Scraping**
   - Scrape public price pages
   - Respect robots.txt
   - Cache data appropriately

---

## Option 4: Eastern Africa Grain Council (EAGC)

### Access Method: Membership + API

**Website**: https://www.eagc.org

**What They Offer:**
- Daily grain prices
- Market analysis reports
- API access for members
- SMS price alerts

**Steps:**

1. **Apply for Membership**
   - Visit: https://www.eagc.org/membership
   - Choose membership tier
   - Cost: Varies by organization type

2. **Get API Credentials**
   - After approval, request API access
   - Receive API key and documentation

3. **Integrate API**
   - RESTful API
   - JSON responses
   - Daily updates

**Cost**: ~$500-2000/year depending on membership level

---

## Option 5: Partner with Local Market Associations

### Access Method: Direct Partnership

**Organizations:**
- Kenya Agricultural Commodity Exchange (KACE)
- County agricultural offices
- Farmer cooperatives
- Market traders associations

**Steps:**

1. **Identify Partners**
   - Contact county agricultural officers
   - Reach out to market associations
   - Connect with farmer cooperatives

2. **Propose Data Sharing**
   - Explain AgroVault platform
   - Offer mutual benefits (market visibility)
   - Negotiate data sharing agreement

3. **Set Up Data Collection**
   - SMS-based price reporting
   - WhatsApp groups
   - Mobile app submissions

---

## Practical Implementation for AgroVault

### Recommended Approach: Hybrid System

**Phase 1: Manual KNBS Data Import (Immediate)**
1. Download KNBS weekly reports
2. Parse Excel/CSV files
3. Import via admin interface

**Phase 2: Farmer Crowdsourcing (Already Built!)**
1. Farmers submit prices they observe
2. Validation through multiple submissions
3. Build community-sourced price database

**Phase 3: Automated Scraping (3-6 months)**
1. Build scrapers for public sources
2. Schedule daily/weekly runs
3. Validate and merge data

**Phase 4: API Partnerships (6-12 months)**
1. Partner with EAGC or RATIN
2. Integrate official APIs
3. Premium features for subscribers

---

## Implementation: Manual KNBS Import

I'll create a simple admin tool to import KNBS CSV files:

### Step 1: Download KNBS Data

Visit: https://www.knbs.or.ke/download-statistics/
Download: "Weekly Market Prices" (Excel/CSV format)

### Step 2: Convert to CSV

Example format:
```csv
Date,Commodity,Market,County,Price,Unit
2025-02-25,Maize,Nairobi,Nairobi,3850,90kg bag
2025-02-25,Beans,Nakuru,Nakuru,8200,90kg bag
2025-02-25,Rice,Mombasa,Mombasa,7500,50kg bag
```

### Step 3: Use Import Tool

I'll create an import endpoint for you.

---

## Cost Comparison

| Source | Cost | Update Frequency | API | Data Quality |
|---|---|---|---|---|
| **KNBS Manual** | FREE | Weekly | ❌ | ⭐⭐⭐⭐⭐ Official |
| **Kenya Open Data** | FREE | Monthly | ⚠️ Limited | ⭐⭐⭐⭐ Official |
| **RATIN** | FREE/Partnership | Daily | ⚠️ On request | ⭐⭐⭐⭐ Verified |
| **EAGC** | $500-2000/year | Daily | ✅ Yes | ⭐⭐⭐⭐⭐ Official |
| **Farmer Input** | FREE | Real-time | ✅ Built-in | ⭐⭐⭐ Crowdsourced |

---

## Recommendation for AgroVault

**Start with:**
1. ✅ **Farmer crowdsourcing** (already working)
2. ✅ **Manual KNBS imports** (weekly admin task)
3. ✅ **Simulated data as fallback** (already working)

**Grow to:**
1. 🔧 **RATIN partnership** (contact them)
2. 🔧 **Automated scrapers** (build over time)
3. 🔧 **EAGC membership** (when budget allows)

---

## Next Steps

1. **Contact RATIN**: Email info@ratin.net about partnership
2. **Download KNBS data**: Get latest weekly report
3. **Use import tool**: I'll create one for you
4. **Encourage farmers**: Promote price submission feature

Would you like me to:
1. Create a CSV import tool for KNBS data?
2. Build a web scraper for RATIN?
3. Set up EAGC API integration (if you have credentials)?

Let me know which approach you'd like to implement first!
