import type { SupabaseClient } from "@supabase/supabase-js";

export type PublishedPostMediaKind =
  | "video"
  | "gif"
  | "single_image"
  | "multi_image";

export type PublishedPostChannel = "facebook_page" | "instagram";

/** How the publish was triggered (stored inside media_summary JSON). */
export type PublishedPostSource = "manual" | "scheduled" | "auto";

export async function insertPublishedPostRow(
  supabase: SupabaseClient,
  userId: string,
  args: {
    channel: PublishedPostChannel;
    caption: string;
    status: "published" | "failed";
    facebookPostId: string | null;
    facebookMediaId: string | null;
    instagramMediaId: string | null;
    mediaKind: PublishedPostMediaKind;
    mediaCount: number;
    pageId: string;
    pageName: string | null;
    instagramUsername?: string | null;
    errorDetail?: string | null;
    /** Composer button vs queue vs auto-post tab */
    publishSource?: PublishedPostSource;
    /** Google Drive file ids used in this publish (Drive items only). */
    driveFileIds?: string[] | null;
    /** Reference ID for idempotency (scheduled post ID or auto-post timestamp) */
    referenceId?: string | null;
  },
): Promise<void> {
  const caption = args.caption.slice(0, 8000);
  const publishSource: PublishedPostSource = args.publishSource ?? "manual";
  const driveIds =
    args.driveFileIds?.filter((x) => typeof x === "string" && x.length > 0) ?? [];
  const { error } = await supabase.from("published_posts").insert({
    user_id: userId,
    channel: args.channel,
    caption: caption || null,
    status: args.status,
    facebook_post_id: args.facebookPostId,
    facebook_media_id: args.facebookMediaId,
    instagram_media_id: args.instagramMediaId,
    publish_source: publishSource,
    media_summary: {
      kind: args.mediaKind,
      count: args.mediaCount,
      page_id: args.pageId,
      page_name: args.pageName,
      instagram_username: args.instagramUsername ?? null,
      publish_source: publishSource,
      ...(driveIds.length > 0 ? { drive_file_ids: driveIds } : {}),
      ...(args.referenceId ? { reference_id: args.referenceId } : {}),
    },
    error_detail: args.errorDetail ?? null,
  });
  if (error) {
    console.error("[published_posts] insert failed:", error.message);
  }
}

/**
 * Check if a channel has already been published for a given reference ID.
 * Used for idempotency to prevent duplicate posts during retries.
 */
export async function getChannelPublishStatus(
  supabase: SupabaseClient,
  userId: string,
  referenceId: string,
  channel: PublishedPostChannel,
): Promise<{ published: boolean; status: string | null }> {
  const { data, error } = await supabase
    .from("published_posts")
    .select("status")
    .eq("user_id", userId)
    .eq("channel", channel)
    .eq("status", "published")
    .filter("media_summary", "cs", `{"reference_id":"${referenceId}"}`)
    .maybeSingle();

  if (error) {
    console.error("[published_posts] status check failed:", error.message);
    return { published: false, status: null };
  }

  return { published: !!data, status: data?.status ?? null };
}
