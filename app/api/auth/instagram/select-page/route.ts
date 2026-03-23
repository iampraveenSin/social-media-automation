import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getSessionFromRequest } from "@/lib/auth";
import { saveAccount } from "@/lib/store";
import { inferNicheFromProfile } from "@/lib/openai";
import {
  INSTAGRAM_PENDING_COOKIE,
  decodePendingInstagramConnect,
  fetchFacebookPages,
  findInstagramForPage,
} from "@/lib/instagram-connect-flow";

const META_GRAPH_BASE = "https://graph.facebook.com/v25.0";

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pendingRaw = request.cookies.get(INSTAGRAM_PENDING_COOKIE)?.value ?? null;
  const pending = decodePendingInstagramConnect(pendingRaw);
  if (!pending) return NextResponse.json({ error: "No pending Instagram connection" }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as { pageId?: string };
  const pageId = typeof body.pageId === "string" ? body.pageId : "";
  if (!pageId) return NextResponse.json({ error: "pageId is required" }, { status: 400 });

  const { pages, error } = await fetchFacebookPages(pending.accessToken);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const selectedPage = pages.find((p) => p.id === pageId);
  if (!selectedPage) return NextResponse.json({ error: "Selected page not found" }, { status: 400 });

  const { igBusinessId } = await findInstagramForPage(selectedPage.id, selectedPage.access_token);
  if (!igBusinessId) {
    return NextResponse.json(
      { error: "Selected page has no linked Instagram Business/Creator account." },
      { status: 400 }
    );
  }

  const igProfileUrl = `${META_GRAPH_BASE}/${igBusinessId}?fields=username,name,biography,profile_picture_url&access_token=${selectedPage.access_token}`;
  const profileRes = await fetch(igProfileUrl);
  const profileData = (await profileRes.json()) as {
    username?: string;
    name?: string;
    biography?: string;
    profile_picture_url?: string;
  };
  const username = profileData.username ?? "instagram";

  const newAccount = {
    id: uuidv4(),
    userId: pending.metaUserId,
    appUserId: session.userId,
    instagramBusinessAccountId: igBusinessId,
    facebookPageId: selectedPage.id,
    username,
    profilePictureUrl: profileData.profile_picture_url,
    userAccessToken: pending.accessToken,
    accessToken: selectedPage.access_token,
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
    // Non-blocking niche inference
  }

  const res = NextResponse.json({
    connected: true,
    username: newAccount.username,
    profilePictureUrl: newAccount.profilePictureUrl,
    selectedPageName: selectedPage.name,
  });
  res.headers.append(
    "Set-Cookie",
    `${INSTAGRAM_PENDING_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
  return res;
}

