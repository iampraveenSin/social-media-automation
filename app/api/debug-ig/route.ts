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
  const token = account.accessToken;

  // Test 1: Fetch IG profile with instagram_basic fields
  const profileUrl = `${META_GRAPH_BASE}/${igId}?fields=username,name,biography,profile_picture_url,media_count&access_token=${encodeURIComponent(token)}`;
  const profileRes = await fetch(profileUrl);
  const profileData = await profileRes.json();

  // Test 2: Fetch IG profile with minimal fields
  const minimalUrl = `${META_GRAPH_BASE}/${igId}?fields=id,username&access_token=${encodeURIComponent(token)}`;
  const minimalRes = await fetch(minimalUrl);
  const minimalData = await minimalRes.json();

  // Test 3: Check token debug info
  const debugUrl = `${META_GRAPH_BASE}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`;
  const debugRes = await fetch(debugUrl);
  const debugData = await debugRes.json();

  return NextResponse.json({
    igBusinessAccountId: igId,
    storedUsername: account.username,
    storedPageName: (account as any).facebookPageName,
    profileApiResponse: profileData,
    minimalApiResponse: minimalData,
    tokenDebug: debugData,
  });
}
