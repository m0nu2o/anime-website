import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  "https://tblbvrgzoovujszpztvr.supabase.co";

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRibGJ2cmd6b292dWpzenB6dHZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MDQ4MjgsImV4cCI6MjEwNDI4MDgyOH0.j7WbD_b35ydi1Y6znLW_70fV0OujP4lc-jwelK8Lono";

export const isSupabaseConfigured = true;

export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
