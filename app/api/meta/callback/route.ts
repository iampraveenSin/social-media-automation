import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/env/app-url";
import { getMetaAppConfig } from "@/lib/env/meta";
import {
  exchangeCodeForShortLivedUserToken,
  exchangeForLongLivedUserToken,
  getFacebookUserId,
} from "@/lib/meta/graph";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const appUrl = getAppUrl();
  const mainUrl = `${appUrl}/dashboard/main`;

  const url = new URL(request.url);
  if (url.searchParams.get("error")) {
    return NextResponse.redirect(`${mainUrl}?facebook=denied`);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expected = cookieStore.get("meta_oauth_state")?.value;

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(`${mainUrl}?facebook=error`);
  }

  const meta = getMetaAppConfig();
  if (!meta) {
    return NextResponse.redirect(`${mainUrl}?facebook=error`);
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/dashboard/main", appUrl));
  }

  const redirectUri = `${appUrl}/api/meta/callback`;

  try {
    const short = await exchangeCodeForShortLivedUserToken(
      code,
      redirectUri,
      meta.appId,
      meta.appSecret,
    );
    const long = await exchangeForLongLivedUserToken(
      short.accessToken,
      meta.appId,
      meta.appSecret,
    );
    const fbUserId = await getFacebookUserId(long.accessToken);
    const expiresAt =
      long.expiresIn != null
        ? new Date(Date.now() + long.expiresIn * 1000).toISOString()
        : null;

    const { error: upErr } = await supabase.from("meta_accounts").upsert(
      {
        user_id: user.id,
        facebook_user_id: fbUserId,
        user_access_token: long.accessToken,
        token_expires_at: expiresAt,
        selected_page_id: null,
        selected_page_name: null,
        page_access_token: null,
        instagram_account_id: null,
        instagram_username: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (upErr) {
      console.error(upErr);
      return NextResponse.redirect(`${mainUrl}?facebook=error`);
    }
    revalidatePath("/dashboard/main");
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(`${mainUrl}?facebook=error`);
  }

  const res = NextResponse.redirect(`${mainUrl}?facebook=connected`);
  res.cookies.delete("meta_oauth_state");
  return res;
}
