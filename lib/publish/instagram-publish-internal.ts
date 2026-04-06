import {
  isCollageImageMime,
  isGifMime,
  isImageMime,
  isVideoMime,
} from "@/lib/composer/media-types";
import type { PublishMetaItem } from "@/lib/composer/publish-media";
import { resolvePublishMediaItems } from "@/lib/composer/publish-media";
import {
  publishInstagramCarousel,
  publishInstagramReelVideo,
  publishInstagramSingleImage,
} from "@/lib/meta/instagram-publish";
import {
  buildInstagramAccessibleMediaUrls,
  removeIgStagingPaths,
} from "@/lib/publish/instagram-image-urls";
import { insertPublishedPostRow } from "@/lib/publish/published-posts";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PublishInstagramResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const MAX_IMAGES = 10;

export async function publishToInstagramForUser(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    caption: string;
    items: PublishMetaItem[];
  },
): Promise<PublishInstagramResult> {
  const caption = typeof payload.caption === "string" ? payload.caption : "";
  const items = Array.isArray(payload.items) ? payload.items : [];

  if (items.length === 0) {
    return { ok: false, error: "Add media before publishing to Instagram." };
  }
  if (items.length > MAX_IMAGES) {
    return {
      ok: false,
      error: `Instagram supports up to ${MAX_IMAGES} images per carousel.`,
    };
  }

  const { data: metaRow } = await supabase
    .from("meta_accounts")
    .select(
      "selected_page_id, page_access_token, selected_page_name, instagram_account_id, instagram_username",
    )
    .eq("user_id", userId)
    .maybeSingle();

  const igUserId = metaRow?.instagram_account_id as string | null | undefined;
  const pageToken = metaRow?.page_access_token as string | null | undefined;
  const pageId = metaRow?.selected_page_id as string | null | undefined;
  const pageName =
    (metaRow?.selected_page_name as string | null | undefined) ?? null;
  const igUsername =
    (metaRow?.instagram_username as string | null | undefined) ?? null;

  if (!igUserId || !pageToken || !pageId) {
    return {
      ok: false,
      error:
        "Link an Instagram Business account to your Facebook Page, then reconnect Meta so we can publish to Instagram.",
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
  if ((hasVideo || hasGif) && resolved.length !== 1) {
    return {
      ok: false,
      error:
        "Instagram supports one video/GIF at a time (no mixed media posts).",
    };
  }
  if (
    !hasVideo &&
    !hasGif &&
    !resolved.every(
      (r) => isImageMime(r.mimeType) && isCollageImageMime(r.mimeType),
    )
  ) {
    return {
      ok: false,
      error: "Use one or more still images (JPEG/PNG/WebP) for Instagram.",
    };
  }

  const urlPack = await buildInstagramAccessibleMediaUrls(
    supabase,
    userId,
    items,
    resolved,
  );
  if (!urlPack.ok) {
    return { ok: false, error: urlPack.error };
  }

  const { urls, stagingPaths } = urlPack;
  const igCaption = caption.trim().slice(0, 2200);

  try {
    const pub = hasVideo || hasGif
      ? await publishInstagramReelVideo({
          igUserId,
          pageAccessToken: pageToken,
          videoUrl: urls[0]!,
          caption: igCaption,
        })
      : urls.length === 1
        ? await publishInstagramSingleImage({
            igUserId,
            pageAccessToken: pageToken,
            imageUrl: urls[0]!,
            caption: igCaption,
          })
        : await publishInstagramCarousel({
            igUserId,
            pageAccessToken: pageToken,
            imageUrls: urls,
            caption: igCaption,
          });

    if (!pub.ok) {
      return { ok: false, error: pub.error };
    }

    await insertPublishedPostRow(supabase, userId, {
      channel: "instagram",
      caption,
      status: "published",
      facebookPostId: null,
      facebookMediaId: null,
      instagramMediaId: pub.mediaId,
      mediaKind: hasVideo ? "video" : hasGif ? "gif" : urls.length === 1 ? "single_image" : "multi_image",
      mediaCount: hasVideo || hasGif ? 1 : urls.length,
      pageId,
      pageName,
      instagramUsername: igUsername,
    });

    return {
      ok: true,
      message:
        hasVideo
          ? "Published video Reel to Instagram."
          : hasGif
            ? "Published GIF as Reel to Instagram."
          : urls.length > 1
          ? `Published ${urls.length}-image carousel to Instagram.`
          : "Published to Instagram.",
    };
  } finally {
    await removeIgStagingPaths(supabase, stagingPaths);
  }
}
