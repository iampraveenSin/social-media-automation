import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/env/app-url";
import { createGoogleOAuth2Client } from "@/lib/google/oauth-factory";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { email?: string };
  return data.email ?? null;
}

export async function GET(request: Request) {
  const appUrl = getAppUrl();
  const mainUrl = `${appUrl}/dashboard/main`;

  const url = new URL(request.url);
  if (url.searchParams.get("error")) {
    return NextResponse.redirect(`${mainUrl}?google=denied`);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expected = cookieStore.get("google_oauth_state")?.value;

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(`${mainUrl}?google=error`);
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/dashboard/main", appUrl));
  }

  try {
    const oauth2 = createGoogleOAuth2Client();
    const { tokens } = await oauth2.getToken(code);
    if (!tokens.access_token) {
      return NextResponse.redirect(`${mainUrl}?google=error`);
    }

    let refreshToken = tokens.refresh_token ?? null;
    if (!refreshToken) {
      const { data: existing } = await supabase
        .from("google_drive_accounts")
        .select("refresh_token")
        .eq("user_id", user.id)
        .maybeSingle();
      refreshToken = existing?.refresh_token ?? null;
    }

    if (!refreshToken) {
      return NextResponse.redirect(`${mainUrl}?google=no_refresh`);
    }

    const email = await fetchGoogleEmail(tokens.access_token);

    const { error: upErr } = await supabase.from("google_drive_accounts").upsert(
      {
        user_id: user.id,
        refresh_token: refreshToken,
        email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (upErr) {
      console.error(upErr);
      return NextResponse.redirect(`${mainUrl}?google=error`);
    }

    revalidatePath("/dashboard/main");
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(`${mainUrl}?google=error`);
  }

  const res = NextResponse.redirect(`${mainUrl}?google=connected`);
  res.cookies.delete("google_oauth_state");
  return res;
}
