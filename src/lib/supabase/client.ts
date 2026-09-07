import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tblbvrgzoovujszpztvr.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRibGJ2cmd6b292dWpzenB6dHZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MDQ4MjgsImV4cCI6MjEwNDI4MDgyOH0.j7WbD_b35ydi1Y6znLW_70fV0OujP4lc-jwelK8Lono";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
