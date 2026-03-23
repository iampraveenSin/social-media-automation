import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getAccounts } from "@/lib/store";

const META_GRAPH_BASE = "https://graph.facebook.com/v25.0";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "not logged in" }, { status: 401 });

  const accounts = await getAccounts(session.userId);
  const account = accounts[0];
  if (!account) return NextResponse.json({ error: "no account" });

  const igId = account.instagramBusinessAccountId;
  const pageId = account.facebookPageId;
  const token = account.accessToken;

  // Test 1: Fetch IG profile with instagram_basic fields
  const profileUrl = `${META_GRAPH_BASE}/${igId}?fields=username,name,biography,profile_picture_url,media_count&access_token=${encodeURIComponent(token)}`;
  const profileRes = await fetch(profileUrl);
  const profileData = await profileRes.json();

  // Test 2: Try connected_instagram_account edge on the page
  let connectedIgData = null;
  if (pageId) {
    const connectedUrl = `${META_GRAPH_BASE}/${pageId}/connected_instagram_account?fields=id,username,profile_picture_url,media_count&access_token=${encodeURIComponent(token)}`;
    const connectedRes = await fetch(connectedUrl);
    connectedIgData = await connectedRes.json();
  }

  // Test 3: Check token debug info (granular scopes)
  const debugUrl = `${META_GRAPH_BASE}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`;
  const debugRes = await fetch(debugUrl);
  const debugData = await debugRes.json();

  // Test 4: Try fetching with the granted IG account ID from granular scopes
  let grantedIgProfile = null;
  const igBasicScope = debugData?.data?.granular_scopes?.find((s: any) => s.scope === "instagram_basic");
  if (igBasicScope?.target_ids?.[0] && igBasicScope.target_ids[0] !== igId) {
    const grantedId = igBasicScope.target_ids[0];
    const grantedUrl = `${META_GRAPH_BASE}/${grantedId}?fields=username,name,profile_picture_url,media_count&access_token=${encodeURIComponent(token)}`;
    const grantedRes = await fetch(grantedUrl);
    grantedIgProfile = { id: grantedId, ...(await grantedRes.json()) };
  }

  return NextResponse.json({
    storedAccount: {
      igBusinessAccountId: igId,
      facebookPageId: pageId,
      username: account.username,
      facebookPageName: (account as any).facebookPageName,
      profilePictureUrl: (account as any).profilePictureUrl,
      mediaCount: (account as any).mediaCount,
    },
    profileApiResponse: profileData,
    connectedInstagramAccount: connectedIgData,
    grantedIgProfile,
    tokenScopes: debugData?.data?.granular_scopes,
  });
}
