import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables!");
}

// 1. Standard Client (Uses session/local storage)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. Admin Creation Client (IMPORTANT: persistSession: false)
// This prevents the browser from logging you into the new account you just created.
export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});