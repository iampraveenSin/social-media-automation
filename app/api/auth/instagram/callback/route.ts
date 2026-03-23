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

interface PageWithInstagram {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  igBusinessId: string;
  igUsername: string;
  igProfilePicture?: string;
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

  // Get the IG account IDs that were actually granted instagram_basic permission
  // (Facebook Login for Business may grant permissions for different IG accounts than the page's linked account)
  let grantedIgAccountIds: string[] = [];
  try {
    const debugUrl = `${META_GRAPH_BASE}/debug_token?input_token=${encodeURIComponent(pages[0].access_token)}&access_token=${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`;
    const debugRes = await fetch(debugUrl);
    const debugData = (await debugRes.json()) as {
      data?: {
        granular_scopes?: Array<{ scope: string; target_ids?: string[] }>;
      };
    };
    const igBasicScope = debugData.data?.granular_scopes?.find((s) => s.scope === "instagram_basic");
    if (igBasicScope?.target_ids) {
      grantedIgAccountIds = igBasicScope.target_ids;
    }
  } catch {
    // Non-blocking: continue without granted IDs
  }

  // Helper to fetch IG profile fields (username, picture, etc.)
  async function fetchIgProfile(igId: string, token: string): Promise<{ username?: string; profile_picture_url?: string }> {
    const url = `${META_GRAPH_BASE}/${igId}?fields=username,profile_picture_url&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    return (await res.json()) as { username?: string; profile_picture_url?: string };
  }

  // Collect ALL pages that have an Instagram Business Account linked
  const pagesWithIg: PageWithInstagram[] = [];

  for (const page of pages) {
    const pageToken = page.access_token;

    // 1) Try standard field
    const igAccountUrl = `${META_GRAPH_BASE}/${page.id}?fields=instagram_business_account&access_token=${pageToken}`;
    const igRes = await fetch(igAccountUrl);
    const igData = (await igRes.json()) as {
      instagram_business_account?: { id: string };
      error?: { message: string; code?: number };
    };

    let igBusinessId = igData.instagram_business_account?.id;

    // If the page has a linked IG account but it doesn't match the granted instagram_basic scope,
    // prefer the granted IG account (this fixes the mismatch from Facebook Login for Business)
    if (igBusinessId && grantedIgAccountIds.length > 0 && !grantedIgAccountIds.includes(igBusinessId)) {
      // Use the granted IG account instead — it's the one we actually have permission for
      igBusinessId = grantedIgAccountIds[0];
    }

    if (igBusinessId) {
      const profileData = await fetchIgProfile(igBusinessId, pageToken);
      pagesWithIg.push({
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: pageToken,
        igBusinessId,
        igUsername: profileData.username ?? "instagram",
        igProfilePicture: profileData.profile_picture_url,
      });
      continue;
    }

    // 2) Fallback: page_backed_instagram_accounts
    const backedUrl = `${META_GRAPH_BASE}/${page.id}/page_backed_instagram_accounts?fields=id,username&access_token=${pageToken}`;
    const backedRes = await fetch(backedUrl);
    const backedData = (await backedRes.json()) as {
      data?: Array<{ id: string; username?: string }>;
      error?: { message: string };
    };
    if (!backedData.error && backedData.data && backedData.data.length > 0) {
      pagesWithIg.push({
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: pageToken,
        igBusinessId: backedData.data[0].id,
        igUsername: backedData.data[0].username ?? "instagram",
      });
    }
  }

  if (pagesWithIg.length === 0) {
    const params = new URLSearchParams({
      error: "no_instagram_account",
      reason: "not_linked",
    });
    const pageNames = pages.map((p) => p.name);
    if (pageNames.length > 0) {
      params.set("pages", pageNames.slice(0, 3).join(", "));
    }
    return NextResponse.redirect(`${baseUrl}/dashboard?${params.toString()}`);
  }

  // If multiple pages have Instagram accounts, redirect to selection page
  if (pagesWithIg.length > 1) {
    // Store pages data in cookies (exclude access tokens from the public-facing cookie)
    const publicPages = pagesWithIg.map((p) => ({
      pageId: p.pageId,
      pageName: p.pageName,
      igBusinessId: p.igBusinessId,
      igUsername: p.igUsername,
      igProfilePicture: p.igProfilePicture,
    }));

    const response = NextResponse.redirect(`${baseUrl}/select-page`);
    // Store full data (with tokens) for the select-page API to use
    response.cookies.set("ig_pending_pages", encodeURIComponent(JSON.stringify(pagesWithIg)), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });
    response.cookies.set("ig_pending_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    response.cookies.set("ig_pending_user_id", meData.id ?? "user", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    // Also store public pages (no tokens) for the pages list endpoint
    response.cookies.set("ig_pending_pages_public", encodeURIComponent(JSON.stringify(publicPages)), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    return response;
  }

  // Single page with Instagram — auto-connect
  const selected = pagesWithIg[0];

  const igProfileUrl = `${META_GRAPH_BASE}/${selected.igBusinessId}?fields=username,name,biography,profile_picture_url,media_count&access_token=${selected.pageAccessToken}`;
  const profileRes = await fetch(igProfileUrl);
  const profileData = (await profileRes.json()) as { username?: string; name?: string; biography?: string; profile_picture_url?: string; media_count?: number };
  const username = profileData.username ?? "instagram";

  const newAccount = {
    id: uuidv4(),
    userId: meData.id ?? "user",
    appUserId: session.userId,
    instagramBusinessAccountId: selected.igBusinessId,
    facebookPageId: selected.pageId,
    facebookPageName: selected.pageName,
    username,
    profilePictureUrl: profileData.profile_picture_url,
    mediaCount: profileData.media_count,
    accessToken: selected.pageAccessToken,
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
