import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";

function stripQuotes(s: string): string {
  const t = s.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1).trim();
  }
  return t;
}

/** Service-role client for cron / background jobs (bypasses RLS). */
export function createAdminSupabaseClient() {
  const url = stripQuotes(
    process.env.SUPABASE_URL?.trim() ||
      getSupabasePublicConfig()?.url ||
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
      "",
  );
  const key = stripQuotes(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "");
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
