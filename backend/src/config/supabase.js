// creating the supabase client connection
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

// setting the environment variables
dotenv.config();

// creating the connection to the supabase database
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// verifying the connection to the supabase database
const verifyConnection = async() =>{
    const { data, error } = await supabase.from("users").select("*").limit(1);
    if (error) {
        console.log("supabase connection error:", error);
        throw new Error("Failed to connect to Supabase");
    }
    console.log("supabase connection was successful");
    
}

module.exports = { supabase, verifyConnection };