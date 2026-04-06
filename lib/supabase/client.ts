import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";

export function createBrowserSupabaseClient() {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and a publishable or anon key.",
    );
  }
  return createBrowserClient(config.url, config.anonKey);
}

export function tryCreateBrowserSupabaseClient() {
  const config = getSupabasePublicConfig();
  if (!config) return null;
  return createBrowserClient(config.url, config.anonKey);
}
