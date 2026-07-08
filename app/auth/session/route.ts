import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";

type SessionRequestBody = {
  access_token?: unknown;
  refresh_token?: unknown;
};

export async function POST(request: NextRequest) {
  const config = getSupabasePublicConfig();
  if (!config) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  let body: SessionRequestBody;
  try {
    body = (await request.json()) as SessionRequestBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { access_token, refresh_token } = body ?? {};
  if (typeof access_token !== "string" || typeof refresh_token !== "string") {
    return NextResponse.json(
      { ok: false, error: "missing_tokens" },
      { status: 400 },
    );
  }

  const response = NextResponse.json({ ok: true });

  try {
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
            if (Array.isArray(value)) {
              response.headers.set(key, value.join(", "));
            } else if (typeof value === "string") {
              response.headers.set(key, value);
            }
          });
        },
      },
    });

    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (error) {
      console.error("/auth/session setSession failed");
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return response;
  } catch (error) {
    console.error("/auth/session unexpected error");
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
