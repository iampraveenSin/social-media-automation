import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { saveAccount } from "@/lib/store";
import { inferNicheFromProfile } from "@/lib/openai";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

const META_GRAPH_BASE = "https://graph.facebook.com/v25.0";

/**
 * POST /api/auth/instagram/select-page
 * Body: { pageId: string }
 * Completes the Instagram connection using the selected Facebook Page.
 */
export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { pageId } = (await request.json()) as { pageId?: string };
  if (!pageId) return NextResponse.json({ error: "pageId is required" }, { status: 400 });

  const cookieStore = await cookies();
  const pendingRaw = cookieStore.get("ig_pending_pages")?.value;
  const pendingToken = cookieStore.get("ig_pending_token")?.value;
  const pendingUserId = cookieStore.get("ig_pending_user_id")?.value;

  if (!pendingRaw || !pendingToken || !pendingUserId) {
    return NextResponse.json({ error: "No pending page data. Please reconnect Instagram." }, { status: 400 });
  }

  let pages: Array<{
    pageId: string;
    pageName: string;
    pageAccessToken: string;
    igBusinessId: string;
    igUsername: string;
  }>;
  try {
    pages = JSON.parse(decodeURIComponent(pendingRaw));
  } catch {
    return NextResponse.json({ error: "Invalid pending page data" }, { status: 400 });
  }

  const selected = pages.find((p) => p.pageId === pageId);
  if (!selected) {
    return NextResponse.json({ error: "Selected page not found" }, { status: 404 });
  }

  // Fetch full profile for the selected Instagram account
  const igProfileUrl = `${META_GRAPH_BASE}/${selected.igBusinessId}?fields=username,name,biography,profile_picture_url,media_count&access_token=${selected.pageAccessToken}`;
  const profileRes = await fetch(igProfileUrl);
  const profileData = (await profileRes.json()) as {
    username?: string;
    name?: string;
    biography?: string;
    profile_picture_url?: string;
    media_count?: number;
  };

  const newAccount = {
    id: uuidv4(),
    userId: pendingUserId,
    appUserId: session.userId,
    instagramBusinessAccountId: selected.igBusinessId,
    facebookPageId: selected.pageId,
    facebookPageName: selected.pageName,
    username: profileData.username ?? selected.igUsername,
    profilePictureUrl: profileData.profile_picture_url,
    mediaCount: profileData.media_count,
    accessToken: selected.pageAccessToken,
    connectedAt: new Date().toISOString(),
  };
  await saveAccount(newAccount);

  // Infer niche in background
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
    // Non-blocking
  }

  // Clear pending cookies
  cookieStore.delete("ig_pending_pages");
  cookieStore.delete("ig_pending_token");
  cookieStore.delete("ig_pending_user_id");

  return NextResponse.json({ success: true });
}
