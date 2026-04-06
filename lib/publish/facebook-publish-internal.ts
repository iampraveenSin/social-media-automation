import {
  isCollageImageMime,
  isGifMime,
  isImageMime,
  isVideoMime,
} from "@/lib/composer/media-types";
import type { PublishMetaItem } from "@/lib/composer/publish-media";
import { resolvePublishMediaItems } from "@/lib/composer/publish-media";
import {
  publishPageMultiPhotoFeed,
  publishPagePhoto,
  publishPageVideo,
} from "@/lib/meta/page-publish";
import { insertPublishedPostRow } from "@/lib/publish/published-posts";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PublishMetaResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const MAX_IMAGES = 10;

/**
 * Publishes composer media to the user's selected Facebook Page.
 * Caller must authorize `userId` (session or trusted cron).
 */
export async function publishToFacebookPageForUser(
  supabase: SupabaseClient,
  userId: string,
  payload: { caption: string; items: PublishMetaItem[] },
): Promise<PublishMetaResult> {
  const caption = typeof payload.caption === "string" ? payload.caption : "";
  const items = Array.isArray(payload.items) ? payload.items : [];

  if (items.length === 0) {
    return { ok: false, error: "Add at least one media item to publish." };
  }
  if (items.length > MAX_IMAGES) {
    return {
      ok: false,
      error: `At most ${MAX_IMAGES} images per post. Fewer for video.`,
    };
  }

  const { data: metaRow } = await supabase
    .from("meta_accounts")
    .select("selected_page_id, page_access_token, selected_page_name")
    .eq("user_id", userId)
    .maybeSingle();

  const pageId = metaRow?.selected_page_id as string | null | undefined;
  const pageToken = metaRow?.page_access_token as string | null | undefined;
  const pageName =
    (metaRow?.selected_page_name as string | null | undefined) ?? null;
  if (!pageId || !pageToken) {
    return {
      ok: false,
      error: "Connect Facebook and select a Page before publishing.",
    };
  }

  const { data: driveRow } = await supabase
    .from("google_drive_accounts")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();
  const driveRefresh = driveRow?.refresh_token as string | null | undefined;

  const resolvedResult = await resolvePublishMediaItems(
    supabase,
    userId,
    driveRefresh,
    items,
  );
  if (!resolvedResult.ok) {
    return { ok: false, error: resolvedResult.error };
  }
  const resolved = resolvedResult.resolved;

  const hasVideo = resolved.some((r) => isVideoMime(r.mimeType));
  const hasGif = resolved.some((r) => isGifMime(r.mimeType));
  const allCollageStill =
    resolved.length > 0 &&
    resolved.every(
      (r) => isCollageImageMime(r.mimeType) || isGifMime(r.mimeType),
    );

  if (hasVideo) {
    if (resolved.length !== 1) {
      return {
        ok: false,
        error: "Publish one video at a time.",
      };
    }
    const v = resolved[0]!;
    if (!isVideoMime(v.mimeType)) {
      return { ok: false, error: "Expected a video file." };
    }
    const out = await publishPageVideo({
      pageId,
      pageAccessToken: pageToken,
      buffer: v.buffer,
      mimeType: v.mimeType,
      filenameBase: v.filenameBase,
      description: caption,
    });
    if (!out.ok) return { ok: false, error: out.error };
    await insertPublishedPostRow(supabase, userId, {
      channel: "facebook_page",
      caption,
      status: "published",
      facebookPostId: null,
      facebookMediaId: out.videoId ?? null,
      instagramMediaId: null,
      mediaKind: "video",
      mediaCount: 1,
      pageId,
      pageName,
    });
    return {
      ok: true,
      message: out.videoId
        ? `Video submitted (id ${out.videoId}). Processing can take a minute on Facebook.`
        : "Video submitted. Processing can take a minute on Facebook.",
    };
  }

  if (hasGif) {
    if (resolved.length !== 1) {
      return {
        ok: false,
        error: "GIF posts must use a single GIF file.",
      };
    }
    const g = resolved[0]!;
    const out = await publishPagePhoto({
      pageId,
      pageAccessToken: pageToken,
      buffer: g.buffer,
      mimeType: g.mimeType,
      filenameBase: g.filenameBase,
      message: caption,
    });
    if (!out.ok) return { ok: false, error: out.error };
    await insertPublishedPostRow(supabase, userId, {
      channel: "facebook_page",
      caption,
      status: "published",
      facebookPostId: out.postId ?? null,
      facebookMediaId: out.photoId,
      instagramMediaId: null,
      mediaKind: "gif",
      mediaCount: 1,
      pageId,
      pageName,
    });
    return {
      ok: true,
      message: out.postId
        ? `Published to your Page (post ${out.postId}).`
        : "Published GIF to your Page.",
    };
  }

  if (!allCollageStill || !resolved.every((r) => isImageMime(r.mimeType))) {
    return {
      ok: false,
      error: "Only images, one GIF, or one video can be published together.",
    };
  }

  const allStill = resolved.every((r) => isCollageImageMime(r.mimeType));
  if (!allStill) {
    return {
      ok: false,
      error:
        "Use one GIF alone, or multiple still images (not GIF) in one post.",
    };
  }

  if (resolved.length === 1) {
    const p = resolved[0]!;
    const out = await publishPagePhoto({
      pageId,
      pageAccessToken: pageToken,
      buffer: p.buffer,
      mimeType: p.mimeType,
      filenameBase: p.filenameBase,
      message: caption,
    });
    if (!out.ok) return { ok: false, error: out.error };
    await insertPublishedPostRow(supabase, userId, {
      channel: "facebook_page",
      caption,
      status: "published",
      facebookPostId: out.postId ?? null,
      facebookMediaId: out.photoId,
      instagramMediaId: null,
      mediaKind: "single_image",
      mediaCount: 1,
      pageId,
      pageName,
    });
    return {
      ok: true,
      message: out.postId
        ? `Published to your Page (post ${out.postId}).`
        : "Published photo to your Page.",
    };
  }

  const out = await publishPageMultiPhotoFeed({
    pageId,
    pageAccessToken: pageToken,
    message: caption,
    photos: resolved.map((r) => ({
      buffer: r.buffer,
      mimeType: r.mimeType,
      filenameBase: r.filenameBase,
    })),
  });
  if (!out.ok) return { ok: false, error: out.error };
  await insertPublishedPostRow(supabase, userId, {
    channel: "facebook_page",
    caption,
    status: "published",
    facebookPostId: out.postId ?? null,
    facebookMediaId: null,
    instagramMediaId: null,
    mediaKind: "multi_image",
    mediaCount: resolved.length,
    pageId,
    pageName,
  });
  return {
    ok: true,
    message: out.postId
      ? `Published ${resolved.length} photos (post ${out.postId}).`
      : `Published ${resolved.length} photos to your Page.`,
  };
}
