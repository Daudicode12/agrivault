# ✅ Updated: Commodity Name Support

## What Changed

The Market Dashboard now accepts **commodity names** instead of UUIDs, making it much easier for farmers to use.

---

## New API Usage

### Before (UUID required):
```bash
GET /api/market-analysis/dashboard?commodityId=a1b2c3d4-5678-90ab-cdef-1234567890ab&county=Nairobi
```

### After (Name accepted):
```bash
GET /api/market-analysis/dashboard?commodity=Maize&county=Nairobi
```

---

## Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `commodity` | String | ✅ Yes | Commodity name (case-insensitive) | `Maize`, `maize`, `MAIZE` |
| `county` | String | ❌ No | County name | `Nairobi`, `Kiambu` |
| `days` | Integer | ❌ No | Lookback period (default: 90) | `30`, `90`, `180`, `365` |

---

## Supported Commodity Names

- **Maize**
- **Wheat**
- **Rice**
- **Beans**
- **Sorghum**
- **Irish Potatoes**
- **Coffee** (or "Coffee (dried)")

Names are **case-insensitive**, so `maize`, `Maize`, and `MAIZE` all work.

---

## Example Requests

### 1. Get Maize prices in Nairobi
```bash
curl "http://localhost:3000/api/market-analysis/dashboard?commodity=Maize&county=Nairobi&days=90" \
  -H "Authorization: Bearer <token>"
```

### 2. Get Beans prices (all counties)
```bash
curl "http://localhost:3000/api/market-analysis/dashboard?commodity=Beans&days=180" \
  -H "Authorization: Bearer <token>"
```

### 3. Case-insensitive search
```bash
# All of these work:
?commodity=maize
?commodity=Maize
?commodity=MAIZE
```

---

## Error Handling

### Invalid Commodity Name
```json
{
  "error": "Commodity \"Tomatoes\" not found. Available: Maize, Wheat, Rice, Beans, Sorghum, Irish Potatoes, Coffee"
}
```

### Missing Commodity Parameter
```json
{
  "error": "commodity query parameter is required"
}
```

---

## Frontend Usage

### Before (UUID):
```javascript
const params = {
  commodityId: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
  county: 'Nairobi'
};
```

### After (Name):
```javascript
const params = {
  commodity: 'Maize',  // Simple name!
  county: 'Nairobi'
};
```

### React Component:
```javascript
// Dropdown now uses names
<select value={selectedCommodity} onChange={(e) => setSelectedCommodity(e.target.value)}>
  {commodities.map((c) => (
    <option key={c.id} value={c.name}>{c.name}</option>
  ))}
</select>

// API call uses the name directly
const response = await marketAPI.dashboard({
  commodity: selectedCommodity,  // "Maize", "Beans", etc.
  county: selectedCounty,
  days: 90
});
```

---

## Benefits

✅ **Easier for farmers** - No need to know UUIDs  
✅ **More intuitive** - Use familiar crop names  
✅ **Case-insensitive** - Works with any capitalization  
✅ **Better error messages** - Shows available commodities  
✅ **Simpler frontend code** - No ID mapping needed  

---

## Testing

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"farmer@agrovault.dev","password":"password123"}' \
  | jq -r '.token')

# Test with commodity name
curl "http://localhost:3000/api/market-analysis/dashboard?commodity=Maize&county=Nairobi&days=90" \
  -H "Authorization: Bearer $TOKEN" | jq

# Test case-insensitive
curl "http://localhost:3000/api/market-analysis/dashboard?commodity=maize&county=Kiambu" \
  -H "Authorization: Bearer $TOKEN" | jq

# Test invalid commodity
curl "http://localhost:3000/api/market-analysis/dashboard?commodity=Tomatoes" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Migration Guide

If you have existing code using `commodityId`, update it:

### Backend:
```javascript
// Old
const { commodityId } = req.query;

// New
const { commodity } = req.query;
```

### Frontend:
```javascript
// Old
const params = { commodityId: selectedCommodityId };

// New
const params = { commodity: selectedCommodityName };
```

---

## Files Changed

- ✅ `backend/src/routes/marketAnalysis.routes.js` - Accept commodity name
- ✅ `frontend/src/pages/MarketDashboard.jsx` - Use commodity name

---

## Backward Compatibility

The old `commodityId` parameter is **no longer supported**. All requests must use `commodity` (name) instead.

If you need to support both, you can modify the backend to check for either parameter:

```javascript
const { commodity, commodityId } = req.query;
if (!commodity && !commodityId) {
  throw new AppError("commodity parameter is required", 400);
}
```

---

## Quick Reference

```
Old: ?commodityId=<uuid>
New: ?commodity=<name>

Examples:
  ?commodity=Maize
  ?commodity=Beans
  ?commodity=Coffee
```

**Status:** ✅ Implemented and Ready
