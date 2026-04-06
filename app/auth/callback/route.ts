import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { sanitizeRedirectPath } from "@/lib/auth/safe-next";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeRedirectPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("missing_code")}`,
    );
  }

  const config = getSupabasePublicConfig();
  if (!config) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("supabase_not_configured")}`,
    );
  }

  let response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return response;
}
