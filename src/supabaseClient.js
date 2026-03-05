import { createClient } from '@supabase/supabase-js';

let supabase;

export const initSupabase = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/config');
    const config = await response.json();
    
    supabase = createClient(config.url, config.key);
    console.log("✅ Supabase Connected via Backend Config");
    return supabase;
  } catch (err) {
    console.error("❌ Failed to fetch config from backend", err);
  }
};

export { supabase };