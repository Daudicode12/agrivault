/**
 * KNBS Market Data CSV Importer
 * 
 * Import commodity prices from KNBS CSV files
 * 
 * CSV Format:
 * Date,Commodity,Market,County,Price,Unit
 * 2025-02-25,Maize,Nairobi,Nairobi,3850,90kg bag
 * 
 * Usage: node src/utils/importKNBSData.js path/to/file.csv
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { supabase } = require('../config/supabase');

async function importKNBSData(csvFilePath) {
  console.log('\n=== KNBS Market Data Importer ===\n');
  
  // Read CSV file
  if (!fs.existsSync(csvFilePath)) {
    console.error(`Error: File not found: ${csvFilePath}`);
    process.exit(1);
  }
  
  const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
  
  // Parse CSV
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  
  console.log(`Found ${records.length} price records in CSV\n`);
  
  // Fetch all commodities
  const { data: commodities } = await supabase
    .from('agro_commodities')
    .select('id, name');
  
  const commodityMap = {};
  commodities.forEach(c => {
    commodityMap[c.name.toLowerCase()] = c.id;
  });
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const record of records) {
    try {
      // Find commodity
      const commodityName = record.Commodity || record.commodity;
      const commodityId = commodityMap[commodityName.toLowerCase()];
      
      if (!commodityId) {
        console.log(`⚠ Skipped: Unknown commodity "${commodityName}"`);
        skipped++;
        continue;
      }
      
      // Parse price
      const priceStr = record.Price || record.price;
      const price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
      
      if (isNaN(price) || price <= 0) {
        console.log(`⚠ Skipped: Invalid price "${priceStr}" for ${commodityName}`);
        skipped++;
        continue;
      }
      
      // Parse date
      const dateStr = record.Date || record.date;
      const recordedAt = new Date(dateStr);
      
      if (isNaN(recordedAt.getTime())) {
        console.log(`⚠ Skipped: Invalid date "${dateStr}"`);
        skipped++;
        continue;
      }
      
      // Check for duplicate
      const { data: existing } = await supabase
        .from('agro_market_data')
        .select('id')
        .eq('commodityId', commodityId)
        .eq('market', record.Market || record.market)
        .eq('recordedAt', recordedAt.toISOString())
        .maybeSingle();
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Insert
      const { error } = await supabase
        .from('agro_market_data')
        .insert({
          commodityId,
          price,
          currency: 'KES',
          market: record.Market || record.market,
          county: record.County || record.county,
          source: 'KNBS',
          recordedAt: recordedAt.toISOString(),
        });
      
      if (error) {
        console.error(`✗ Error importing ${commodityName}: ${error.message}`);
        errors++;
      } else {
        imported++;
        if (imported % 10 === 0) {
          process.stdout.write(`\rImported: ${imported}`);
        }
      }
      
    } catch (err) {
      console.error(`✗ Error processing record:`, err.message);
      errors++;
    }
  }
  
  console.log(`\n\n=== Import Complete ===`);
  console.log(`✓ Imported: ${imported}`);
  console.log(`⚠ Skipped: ${skipped}`);
  console.log(`✗ Errors: ${errors}`);
  console.log(`\nTotal processed: ${records.length}\n`);
  
  process.exit(0);
}

// Command line usage
const csvFile = process.argv[2];

if (!csvFile) {
  console.log('Usage: node src/utils/importKNBSData.js path/to/file.csv');
  console.log('\nCSV Format:');
  console.log('Date,Commodity,Market,County,Price,Unit');
  console.log('2025-02-25,Maize,Nairobi,Nairobi,3850,90kg bag');
  process.exit(1);
}

importKNBSData(csvFile).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
