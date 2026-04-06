import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/env/app-url";
import { getGoogleClientConfig, GOOGLE_OAUTH_SCOPES } from "@/lib/env/google";
import { createGoogleOAuth2Client } from "@/lib/google/oauth-factory";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!getGoogleClientConfig()) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not set." },
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
  const oauth2 = createGoogleOAuth2Client();
  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [...GOOGLE_OAUTH_SCOPES],
    state,
    include_granted_scopes: true,
  });

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
