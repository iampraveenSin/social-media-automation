import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getPost, savePost, getAccountByUserId, getAccounts, getMediaItem } from "@/lib/store";
import { publishToInstagram, publishToFacebookPage, isPublicImageUrl, LOCALHOST_MEDIA_MESSAGE, buildCaptionWithHashtags } from "@/lib/instagram";
import type { InstagramMediaType } from "@/lib/instagram";
import { resolveVideoForPublish } from "@/lib/video";

/** Publish a single scheduled or failed post now (e.g. one that was never queued or stuck). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const post = await getPost(id, session.userId);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    if (post.status !== "scheduled" && post.status !== "failed") {
      return NextResponse.json(
        { error: "Post can only be published when status is scheduled or failed" },
        { status: 400 }
      );
    }

    await savePost({ ...post, status: "publishing" });
    const metaUserId = post.userId ?? "";
    let account = await getAccountByUserId(metaUserId);
    if (!account) {
      const accounts = await getAccounts(session.userId);
      account = accounts[0] ?? null;
    }
    if (!account) {
      await savePost({ ...post, status: "failed", error: "No Instagram account connected" });
      return NextResponse.json({ error: "No Instagram account connected" }, { status: 400 });
    }

    // Prefer media record URL when mediaId is set (e.g. converted video from schedule flow).
    let publishUrl = post.mediaUrl;
    let isVideo = post.mediaType === "video";
    if (post.mediaId) {
      const mediaItem = await getMediaItem(post.mediaId, session.userId);
      if (mediaItem?.url) {
        publishUrl = mediaItem.url;
        isVideo = mediaItem.mimeType?.startsWith("video/") ?? isVideo;
      }
    }
    if (!isPublicImageUrl(publishUrl)) {
      await savePost({ ...post, status: "failed", error: LOCALHOST_MEDIA_MESSAGE });
      return NextResponse.json({ error: LOCALHOST_MEDIA_MESSAGE }, { status: 400 });
    }

    const caption = buildCaptionWithHashtags(post.caption, post.hashtags ?? []);
    let instagramMediaType: InstagramMediaType = "image";
    if (isVideo) {
      try {
        const resolved = await resolveVideoForPublish(publishUrl);
        publishUrl = resolved.url;
        instagramMediaType = resolved.placement;
      } catch (videoErr) {
        const msg = videoErr instanceof Error ? videoErr.message : String(videoErr);
        await savePost({ ...post, status: "failed", error: msg });
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }
    const result = await publishToInstagram(
      account.instagramBusinessAccountId,
      account.accessToken,
      publishUrl,
      caption,
      instagramMediaType
    );

    if ("error" in result) {
      await savePost({ ...post, status: "failed", error: result.error });
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if (account.facebookPageId) {
      const fbResult = await publishToFacebookPage(
        account.facebookPageId,
        account.accessToken,
        publishUrl,
        caption,
        isVideo ? "video" : "image"
      );
      if ("error" in fbResult) {
        console.warn("Facebook Page post failed:", fbResult.error);
      }
    }

    const updated = await getPost(id, session.userId);
    if (updated) {
      await savePost({
        ...updated,
        status: "published",
        publishedAt: new Date().toISOString(),
        instagramMediaId: result.id,
      });
    }

    return NextResponse.json({ ok: true, status: "published" });
  } catch (e) {
    console.error("Publish post error:", e);
    return NextResponse.json({ error: "Publish failed" }, { status: 500 });
  }
}
