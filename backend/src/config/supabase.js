// creating the supabase client connection
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

// setting the environment variables
dotenv.config();

// creating the connection to the supabase database
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };