import { NextRequest, NextResponse } from "next/server";
import { saveAccount } from "@/lib/store";
import { getSessionFromRequest } from "@/lib/auth";
import { inferNicheFromProfile } from "@/lib/openai";
import { v4 as uuidv4 } from "uuid";

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

  const pagesUrl = `${META_GRAPH_BASE}/me/accounts?fields=id,name,access_token&access_token=${accessToken}`;
  const pagesRes = await fetch(pagesUrl);
  const pagesData = (await pagesRes.json()) as {
    data?: Array<{ id: string; name: string; access_token: string }>;
    error?: { message: string; code?: number };
  };
  const pages = pagesData.data ?? [];
  if (pages.length === 0) {
    const params = new URLSearchParams({ error: "no_page" });
    if (pagesData.error?.message) {
      params.set("hint", pagesData.error.message.slice(0, 100));
    }
    return NextResponse.redirect(`${baseUrl}/dashboard?${params.toString()}`);
  }

  // Find the first page that has an Instagram Business Account linked
  let pageWithIg: { id: string; name: string; access_token: string } | null = null;
  let igBusinessId: string | null = null;
  const pageNames: string[] = [];

  for (const page of pages) {
    pageNames.push(page.name);
    const pageToken = page.access_token;

    // 1) Try standard field (works when Page is linked from Instagram / not only via Business Manager)
    const igAccountUrl = `${META_GRAPH_BASE}/${page.id}?fields=instagram_business_account&access_token=${pageToken}`;
    const igRes = await fetch(igAccountUrl);
    const igData = (await igRes.json()) as {
      instagram_business_account?: { id: string };
      error?: { message: string; code?: number };
    };
    if (!igData.error) {
      const id = igData.instagram_business_account?.id;
      if (id) {
        pageWithIg = page;
        igBusinessId = id;
        break;
      }
    }

    // 2) Fallback: page_backed_instagram_accounts (sometimes returns IG when instagram_business_account is empty)
    const backedUrl = `${META_GRAPH_BASE}/${page.id}/page_backed_instagram_accounts?fields=id,username&access_token=${pageToken}`;
    const backedRes = await fetch(backedUrl);
    const backedData = (await backedRes.json()) as {
      data?: Array<{ id: string; username?: string }>;
      error?: { message: string };
    };
    if (!backedData.error && backedData.data && backedData.data.length > 0) {
      pageWithIg = page;
      igBusinessId = backedData.data[0].id;
      break;
    }
  }

  if (!pageWithIg || !igBusinessId) {
    const params = new URLSearchParams({
      error: "no_instagram_account",
      reason: "not_linked",
    });
    if (pageNames.length > 0) {
      params.set("pages", pageNames.slice(0, 3).join(", "));
    }
    return NextResponse.redirect(`${baseUrl}/dashboard?${params.toString()}`);
  }

  const igProfileUrl = `${META_GRAPH_BASE}/${igBusinessId}?fields=username,name,biography&access_token=${pageWithIg.access_token}`;
  const profileRes = await fetch(igProfileUrl);
  const profileData = (await profileRes.json()) as { username?: string; name?: string; biography?: string };
  const username = profileData.username ?? "instagram";

  const newAccount = {
    id: uuidv4(),
    userId: meData.id ?? "user",
    appUserId: session.userId,
    instagramBusinessAccountId: igBusinessId,
    facebookPageId: pageWithIg.id,
    username,
    accessToken: pageWithIg.access_token,
    connectedAt: new Date().toISOString(),
  };
  await saveAccount(newAccount);

  try {
    const suggestedNiche = await inferNicheFromProfile({
      username: profileData.username ?? "",
      name: profileData.name,
      biography: profileData.biography,
    });
    await saveAccount({
      ...newAccount,
      suggestedNiche,
      analyzedAt: new Date().toISOString(),
    });
  } catch {
    // Non-blocking: niche can be analyzed later from dashboard
  }

  return NextResponse.redirect(`${baseUrl}/dashboard?connected=1`);
}
