import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getAccounts } from "@/lib/store";

const META_GRAPH_BASE = "https://graph.facebook.com/v25.0";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await getAccounts(session.userId);
  const account = accounts[0];
  if (!account) return NextResponse.json({ error: "No Instagram account connected" }, { status: 400 });

  const profileUrl = `${META_GRAPH_BASE}/${account.instagramBusinessAccountId}?fields=id,username,name,biography,profile_picture_url&access_token=${encodeURIComponent(
    account.accessToken
  )}`;
  const profileRes = await fetch(profileUrl, { cache: "no-store" });
  const profileData = (await profileRes.json()) as {
    id?: string;
    username?: string;
    name?: string;
    biography?: string;
    profile_picture_url?: string;
    error?: { message?: string };
  };
  if (!profileRes.ok || profileData.error) {
    const msg = profileData.error?.message ?? "";
    if (msg.includes("(#10)") || msg.toLowerCase().includes("permission")) {
      return NextResponse.json(
        {
          error:
            "Missing Instagram Basic/profile permission for this app/account. Ensure instagram_basic is approved/granted and reconnect.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: profileData.error?.message ?? "Failed to fetch Instagram profile" },
      { status: 400 }
    );
  }

  const mediaUrl = `${META_GRAPH_BASE}/${account.instagramBusinessAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=24&access_token=${encodeURIComponent(
    account.accessToken
  )}`;
  const mediaRes = await fetch(mediaUrl, { cache: "no-store" });
  const mediaData = (await mediaRes.json()) as {
    data?: Array<{
      id?: string;
      caption?: string;
      media_type?: string;
      media_url?: string;
      thumbnail_url?: string;
      permalink?: string;
      timestamp?: string;
    }>;
    error?: { message?: string };
  };
  if (!mediaRes.ok || mediaData.error) {
    const msg = mediaData.error?.message ?? "";
    if (msg.includes("(#10)") || msg.toLowerCase().includes("permission")) {
      return NextResponse.json(
        {
          error:
            "Missing permission to read Instagram media for this app/account. Verify instagram_basic/related permissions and reconnect.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: mediaData.error?.message ?? "Failed to fetch Instagram media" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    profile: {
      id: profileData.id ?? account.instagramBusinessAccountId,
      username: profileData.username ?? account.username,
      name: profileData.name ?? "",
      biography: profileData.biography ?? "",
      profilePictureUrl: profileData.profile_picture_url ?? account.profilePictureUrl ?? null,
    },
    media: (mediaData.data ?? []).filter((m) => !!m.id).map((m) => ({
      id: m.id as string,
      caption: m.caption ?? "",
      mediaType: m.media_type ?? "IMAGE",
      mediaUrl: m.media_url,
      thumbnailUrl: m.thumbnail_url,
      permalink: m.permalink,
      timestamp: m.timestamp,
    })),
  });
}

