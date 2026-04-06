import type {
  PublishMetaItem,
  ResolvedMedia,
} from "@/lib/composer/publish-media";
import type { SupabaseClient } from "@supabase/supabase-js";

function extForMime(mime: string): string {
  if (mime === "image/gif") return "gif";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "video/mp4") return "mp4";
  if (mime === "video/quicktime") return "mov";
  if (mime === "video/webm") return "webm";
  if (mime.startsWith("video/")) return "mp4";
  return "jpg";
}

const SIGNED_TTL_SEC = 900;

/**
 * Builds HTTPS URLs Instagram can fetch (signed URLs on your Supabase bucket).
 * Supports image and video payloads.
 * Tracks staging paths under `.ig-staging/` for cleanup (Drive-sourced bytes).
 */
export async function buildInstagramAccessibleMediaUrls(
  supabase: SupabaseClient,
  userId: string,
  items: PublishMetaItem[],
  resolved: ResolvedMedia[],
): Promise<
  | { ok: true; urls: string[]; stagingPaths: string[] }
  | { ok: false; error: string }
> {
  if (items.length !== resolved.length) {
    return { ok: false, error: "Media list mismatch." };
  }

  const stagingPaths: string[] = [];
  const urls: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const r = resolved[i]!;

    try {
      if (item.kind === "upload") {
        const { data, error } = await supabase.storage
          .from("post_media")
          .createSignedUrl(item.storagePath, SIGNED_TTL_SEC);
        if (error || !data?.signedUrl) {
          return {
            ok: false,
            error: error?.message ?? "Could not sign upload URL for Instagram.",
          };
        }
        urls.push(data.signedUrl);
      } else {
        const ext = extForMime(r.mimeType);
        const path = `${userId}/.ig-staging/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("post_media")
          .upload(path, r.buffer, {
            contentType: r.mimeType || "image/jpeg",
            upsert: false,
          });
        if (upErr) {
          return {
            ok: false,
            error: upErr.message || "Could not stage Drive media for Instagram.",
          };
        }
        stagingPaths.push(path);
        const { data, error } = await supabase.storage
          .from("post_media")
          .createSignedUrl(path, SIGNED_TTL_SEC);
        if (error || !data?.signedUrl) {
          await supabase.storage.from("post_media").remove(stagingPaths);
          return {
            ok: false,
            error: error?.message ?? "Could not sign staged media URL.",
          };
        }
        urls.push(data.signedUrl);
      }
    } catch (e) {
      if (stagingPaths.length > 0) {
        await supabase.storage.from("post_media").remove(stagingPaths);
      }
      return {
        ok: false,
        error: e instanceof Error ? e.message : "URL build failed.",
      };
    }
  }

  return { ok: true, urls, stagingPaths };
}

export async function removeIgStagingPaths(
  supabase: SupabaseClient,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from("post_media").remove(paths);
  if (error) {
    console.error("[ig-staging] remove:", error.message);
  }
}
