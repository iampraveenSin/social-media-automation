import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/env/app-url";
import { getMetaAppConfig, META_GRAPH_VERSION, META_OAUTH_SCOPES } from "@/lib/env/meta";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const meta = getMetaAppConfig();
  if (!meta) {
    return NextResponse.json(
      { error: "META_APP_ID and META_APP_SECRET are not configured." },
      { status: 500 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const appUrl = getAppUrl();
  if (!user) {
    return NextResponse.redirect(
      new URL("/login?next=/dashboard/main", appUrl),
    );
  }

  const state = randomBytes(32).toString("hex");
  const redirectUri = `${appUrl}/api/meta/callback`;

  const fb = new URL(
    `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`,
  );
  fb.searchParams.set("client_id", meta.appId);
  fb.searchParams.set("redirect_uri", redirectUri);
  fb.searchParams.set("state", state);
  fb.searchParams.set("response_type", "code");
  fb.searchParams.set("scope", META_OAUTH_SCOPES);

  const res = NextResponse.redirect(fb.toString());
  res.cookies.set("meta_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
