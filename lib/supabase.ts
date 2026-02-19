import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Server-only Supabase client (service_role key). Use in API routes and worker only.
 * Never use Supabase from the frontend for Storage or DB — anon role hits RLS and will fail.
 * Architecture: Browser → API route → getSupabase() (service role) → Supabase → success.
 */
export function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export function isSupabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}
