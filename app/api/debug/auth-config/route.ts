import { getSupabasePublicConfig } from "@/lib/env/supabase-public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasValue(v: string | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Safe runtime diagnostics for production debugging.
 * Does not return secret values, only presence/metadata flags.
 */
export async function GET() {
  const config = getSupabasePublicConfig();

  return Response.json({
    ok: true,
    nowIso: new Date().toISOString(),
    env: {
      NEXT_PUBLIC_SUPABASE_URL: hasValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: hasValue(
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      ),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: hasValue(
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      ),
      SUPABASE_URL: hasValue(process.env.SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: hasValue(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    derived: {
      supabasePublicConfigured: config !== null,
      selectedPublicKeyType: hasValue(
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      )
        ? "publishable"
        : hasValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
          ? "anon"
          : "none",
    },
    deployment: {
      VERCEL_ENV: process.env.VERCEL_ENV ?? null,
      VERCEL_URL: process.env.VERCEL_URL ?? null,
      VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    },
  });
}
