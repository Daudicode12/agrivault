# 🌾 Commodities Management - User Guide

## Overview

The Commodities page allows farmers to create, view, edit, and delete commodity types. This is useful for adding custom crops that aren't in the default list.

---

## How to Access

1. Login to AgroVault
2. Click **"Commodities"** in the sidebar (under "My Farm" section)

---

## Features

### 1. View All Commodities
- See all available commodities in a grid layout
- Each card shows:
  - Commodity name
  - Category (Grain, Legume, Tuber, etc.)
  - Unit (bag, kg, etc.)
  - Optimal temperature range
  - Optimal humidity range
  - Maximum storage days

### 2. Add New Commodity
1. Click **"Add Commodity"** button
2. Fill in the form:
   - **Name*** (required) - e.g., "Tomatoes", "Onions"
   - **Category** - Select from dropdown
   - **Unit** - e.g., "crate", "kg", "bag (50kg)"
   - **Max Storage Days** - How long it can be stored
   - **Optimal Temperature** - Min and Max in °C
   - **Optimal Humidity** - Min and Max in %
3. Click **"Create Commodity"**

### 3. Edit Commodity
1. Click the **Edit icon** (pencil) on any commodity card
2. Update the fields
3. Click **"Update Commodity"**

### 4. Delete Commodity
1. Click the **Delete icon** (trash) on any commodity card
2. Confirm deletion
3. Commodity is permanently removed

---

## Form Fields Explained

### Required Fields
- **Name**: The commodity name (e.g., Maize, Beans, Tomatoes)

### Optional Fields
- **Category**: Type of crop
  - Grain (Maize, Wheat, Rice)
  - Legume (Beans, Peas)
  - Tuber (Potatoes, Cassava)
  - Cash Crop (Coffee, Tea)
  - Vegetable (Tomatoes, Cabbage)
  - Fruit (Mangoes, Bananas)

- **Unit**: How it's measured
  - bag (90kg)
  - bag (50kg)
  - kg
  - crate
  - sack

- **Max Storage Days**: Maximum safe storage period
  - Grains: 365 days
  - Tubers: 90-180 days
  - Vegetables: 7-30 days
  - Fruits: 7-21 days

- **Optimal Temperature**: Best storage temperature range
  - Cool crops: 4-10°C (Potatoes, Cabbage)
  - Moderate: 10-20°C (Grains, Legumes)
  - Warm: 20-25°C (Some fruits)

- **Optimal Humidity**: Best humidity range
  - Low: 10-15% (Grains, Legumes)
  - High: 85-95% (Tubers, Vegetables)

---

## Example: Adding Tomatoes

1. Click "Add Commodity"
2. Fill in:
   - Name: **Tomatoes**
   - Category: **Vegetable**
   - Unit: **crate**
   - Max Storage Days: **14**
   - Optimal Temp Min: **10**
   - Optimal Temp Max: **15**
   - Optimal Humidity Min: **85**
   - Optimal Humidity Max: **95**
3. Click "Create Commodity"
4. Tomatoes now appears in the list

---

## Why Add Custom Commodities?

### Benefits:
✅ **Track your specific crops** - Add crops not in the default list  
✅ **Set storage parameters** - Define optimal conditions for alerts  
✅ **Market analysis** - Use in Market Dashboard for price tracking  
✅ **Storage monitoring** - Link to storage units with sensors  

### Use Cases:
- **Vegetables**: Tomatoes, Onions, Cabbage, Carrots
- **Fruits**: Mangoes, Bananas, Avocados, Oranges
- **Specialty crops**: Tea, Sugarcane, Cotton, Pyrethrum
- **Local varieties**: Specific maize varieties, bean types

---

## Default Commodities

The system comes with 7 pre-configured commodities:

| Commodity | Category | Storage | Temp (°C) | Humidity (%) |
|-----------|----------|---------|-----------|--------------|
| Maize | Grain | 365 days | 10-15 | 12-14 |
| Wheat | Grain | 365 days | 10-15 | 11-13 |
| Rice | Grain | 365 days | 15-20 | 12-14 |
| Beans | Legume | 180 days | 10-18 | 12-15 |
| Sorghum | Grain | 365 days | 10-15 | 12-14 |
| Irish Potatoes | Tuber | 90 days | 4-8 | 85-95 |
| Coffee (dried) | Cash Crop | 365 days | 15-20 | 10-12 |

You can edit or delete these if needed.

---

## Tips

### ✅ Do This:
- Use clear, descriptive names
- Set realistic storage parameters
- Include units for clarity
- Research optimal conditions before setting them
- Test with small batches first

### ❌ Avoid This:
- Don't use duplicate names
- Don't leave temperature/humidity blank if you plan to use sensors
- Don't delete commodities that are linked to storage units
- Don't set unrealistic storage days

---

## Integration with Other Features

### Market Dashboard
- Custom commodities appear in the commodity dropdown
- Can track prices and get recommendations
- Seasonal patterns can be analyzed

### Storage Units
- Link storage units to custom commodities
- Sensor alerts use the optimal conditions you set
- Spoilage predictions based on storage parameters

### Alerts
- Temperature/humidity alerts triggered when outside optimal range
- Storage time alerts when approaching max storage days

---

## Troubleshooting

### "Commodity already exists"
**Solution**: Use a different name or edit the existing commodity

### Can't delete commodity
**Solution**: First remove it from any storage units using it

### Optimal conditions not working
**Solution**: Make sure you've set both min and max values

### Commodity not showing in Market Dashboard
**Solution**: Refresh the page or logout and login again

---

## Best Practices

1. **Research First**: Look up optimal storage conditions before adding
2. **Be Specific**: Use full names (e.g., "Cherry Tomatoes" vs "Tomatoes")
3. **Set Realistic Values**: Base on actual storage capabilities
4. **Document Units**: Be clear about measurement units
5. **Regular Updates**: Update parameters based on experience

---

## Example Commodities to Add

### Vegetables
- Tomatoes (crate, 14 days, 10-15°C, 85-95%)
- Onions (bag, 180 days, 0-5°C, 65-70%)
- Cabbage (head, 90 days, 0-5°C, 90-95%)
- Carrots (bag, 180 days, 0-5°C, 90-95%)

### Fruits
- Mangoes (crate, 21 days, 10-15°C, 85-90%)
- Bananas (bunch, 14 days, 13-15°C, 85-90%)
- Avocados (crate, 30 days, 5-13°C, 85-90%)

### Cash Crops
- Tea (kg, 365 days, 20-25°C, 60-65%)
- Sugarcane (ton, 7 days, 20-25°C, 70-75%)

---

## Need Help?

- Check the optimal conditions for your crop online
- Consult agricultural extension officers
- Test with small quantities first
- Monitor and adjust based on results

---

**Remember**: Proper commodity setup ensures accurate alerts and better storage management! 🌾
