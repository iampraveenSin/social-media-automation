import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";

export async function createServerSupabaseClient() {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and a publishable or anon key.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* ignore when called from a Server Component that cannot set cookies */
        }
      },
    },
  });
}
