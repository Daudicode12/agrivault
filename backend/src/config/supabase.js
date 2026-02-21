const { createClient } = require("@supabase/supabase-js");
const { config } = require("./env");

// DB_SCHEMA defaults to "public". Set to "agrovault" once the schema is
// exposed in Supabase Dashboard → Settings → API → Extra API Schemas.
const DB_SCHEMA = process.env.DB_SCHEMA || "public";

// Create Supabase client targeting the chosen schema
const supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
  db: { schema: DB_SCHEMA },
  auth: { persistSession: false },
});

/**
 * Verify the Supabase connection by querying a table.
 * Warns (but does not crash) if tables are not yet created.
 */
const verifyConnection = async () => {
  const { data, error } = await supabase.from("agro_commodities").select("id").limit(1);
  if (error) {
    if (error.message.includes("schema cache") || error.code === "PGRST204") {
      console.warn(
        "⚠ Supabase tables not found. Run the SQL in supabase-schema-public.sql first."
      );
      return; // allow server to start so routes can be tested once tables exist
    }
    throw new Error(`Supabase connection failed: ${error.message}`);
  }
};

module.exports = { supabase, verifyConnection };
