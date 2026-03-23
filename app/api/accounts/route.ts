import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getAccounts, saveAccount } from "@/lib/store";

const META_GRAPH_BASE = "https://graph.facebook.com/v25.0";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ connected: false }, { status: 401 });
  try {
    const accounts = await getAccounts(session.userId);
    const account = accounts[0] ?? null;
    if (!account) return NextResponse.json({ connected: false });

    // Lazy profile refresh: if profile data is missing, try to fetch it now
    // This handles the case where instagram_basic was granted for a different IG account
    // than the one stored, or when the callback couldn't fetch profile data in time
    if (!account.profilePictureUrl && account.accessToken) {
      try {
        let igId = account.instagramBusinessAccountId;
        let username = account.username;
        let profilePictureUrl: string | undefined;
        let mediaCount: number | undefined;

        // First try fetching with the stored IG account ID
        const profileUrl = `${META_GRAPH_BASE}/${igId}?fields=username,profile_picture_url,media_count&access_token=${encodeURIComponent(account.accessToken)}`;
        const profileRes = await fetch(profileUrl);
        const profileData = (await profileRes.json()) as { username?: string; profile_picture_url?: string; media_count?: number };

        if (profileData.username) {
          username = profileData.username;
          profilePictureUrl = profileData.profile_picture_url;
          mediaCount = profileData.media_count;
        } else {
          // Profile fetch failed — check debug_token for the correct IG account
          const debugUrl = `${META_GRAPH_BASE}/debug_token?input_token=${encodeURIComponent(account.accessToken)}&access_token=${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`;
          const debugRes = await fetch(debugUrl);
          const debugData = (await debugRes.json()) as {
            data?: { granular_scopes?: Array<{ scope: string; target_ids?: string[] }> };
          };
          const igBasicScope = debugData.data?.granular_scopes?.find((s) => s.scope === "instagram_basic");
          const grantedId = igBasicScope?.target_ids?.[0];

          if (grantedId && grantedId !== igId) {
            const grantedUrl = `${META_GRAPH_BASE}/${grantedId}?fields=username,profile_picture_url,media_count&access_token=${encodeURIComponent(account.accessToken)}`;
            const grantedRes = await fetch(grantedUrl);
            const grantedData = (await grantedRes.json()) as { username?: string; profile_picture_url?: string; media_count?: number };

            if (grantedData.username) {
              igId = grantedId;
              username = grantedData.username;
              profilePictureUrl = grantedData.profile_picture_url;
              mediaCount = grantedData.media_count;
            }
          }
        }

        // Save updated profile data back to database
        if (profilePictureUrl || username !== account.username) {
          await saveAccount({
            ...account,
            instagramBusinessAccountId: igId,
            username,
            profilePictureUrl,
            mediaCount,
          });

          return NextResponse.json({
            connected: true,
            username,
            profilePictureUrl: profilePictureUrl ?? null,
            facebookPageName: account.facebookPageName ?? null,
            mediaCount: mediaCount ?? null,
            suggestedNiche: account.suggestedNiche ?? null,
          });
        }
      } catch {
        // Non-blocking: return what we have
      }
    }

    return NextResponse.json({
      connected: true,
      username: account.username,
      profilePictureUrl: account.profilePictureUrl ?? null,
      facebookPageName: account.facebookPageName ?? null,
      mediaCount: account.mediaCount ?? null,
      suggestedNiche: account.suggestedNiche ?? null,
    });
  } catch (e) {
    return NextResponse.json({ connected: false }, { status: 500 });
  }
}
