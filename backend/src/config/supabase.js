const { createClient } = require("@supabase/supabase-js");
const { config } = require("./env");

// Create Supabase client targeting the agrovault schema
const supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
  db: { schema: "agrovault" },
  auth: { persistSession: false },
});

/**
 * Verify the Supabase connection by querying a table.
 */
const verifyConnection = async () => {
  const { error } = await supabase.from("commodities").select("id").limit(1);
  if (error) throw new Error(`Supabase connection failed: ${error.message}`);
};

module.exports = { supabase, verifyConnection };