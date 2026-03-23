import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import {
  INSTAGRAM_PENDING_COOKIE,
  encodePendingInstagramConnect,
  fetchFacebookPages,
} from "@/lib/instagram-connect-flow";

const META_GRAPH_BASE = "https://graph.facebook.com/v25.0";

function originForLocalhost(origin: string): string {
  try {
    const u = new URL(origin);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") u.protocol = "http:";
    return u.origin;
  } catch {
    return origin;
  }
}

export async function GET(request: NextRequest) {
  const raw = (process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin).replace(/\/+$/, "");
  const baseUrl = originForLocalhost(raw);
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.redirect(`${baseUrl}/login?redirect=/dashboard`);
  }

  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${baseUrl}/dashboard?error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${baseUrl}/dashboard?error=no_code`);
  }

  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;
  const tokenUrl = `${META_GRAPH_BASE}/oauth/access_token?client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`;

  const tokenRes = await fetch(tokenUrl);
  const tokenData = (await tokenRes.json()) as { access_token?: string; error?: { message: string } };
  if (tokenData.error || !tokenData.access_token) {
    return NextResponse.redirect(`${baseUrl}/dashboard?error=token_failed`);
  }

  const longLivedUrl = `${META_GRAPH_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`;
  const longRes = await fetch(longLivedUrl);
  const longData = (await longRes.json()) as { access_token?: string };
  const accessToken = longData.access_token ?? tokenData.access_token;

  const meUrl = `${META_GRAPH_BASE}/me?fields=id,name&access_token=${accessToken}`;
  const meRes = await fetch(meUrl);
  const meData = (await meRes.json()) as { id?: string; name?: string; error?: { message: string } };
  if (meData.error) {
    return NextResponse.redirect(`${baseUrl}/dashboard?error=me_failed`);
  }

  const { pages, error: pagesError } = await fetchFacebookPages(accessToken);
  if (pages.length === 0) {
    const params = new URLSearchParams({ error: "no_page" });
    if (pagesError) {
      params.set("hint", pagesError.slice(0, 100));
    }
    return NextResponse.redirect(`${baseUrl}/dashboard?${params.toString()}`);
  }
  const pending = encodePendingInstagramConnect({
    accessToken,
    metaUserId: meData.id ?? "user",
  });
  const res = NextResponse.redirect(`${baseUrl}/dashboard?instagram_page_select=1`);
  res.headers.append(
    "Set-Cookie",
    `${INSTAGRAM_PENDING_COOKIE}=${pending}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
  );
  return res;
}
