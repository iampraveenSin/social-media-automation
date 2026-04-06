import { isFolderMime } from "@/lib/composer/media-types";
import {
  fetchDriveFileBuffer,
  getDriveFileMeta,
  sanitizeDriveFileId,
} from "@/lib/google/drive-file";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PublishMetaItem =
  | { kind: "drive"; fileId: string }
  | { kind: "upload"; storagePath: string };

export type ResolvedMedia = {
  buffer: ArrayBuffer;
  mimeType: string;
  filenameBase: string;
};

const MAX_MEDIA_BYTES = 45 * 1024 * 1024;

function assertStoragePathOwned(path: string, userId: string): boolean {
  const first = path.split("/")[0];
  return Boolean(first && first === userId && !path.includes(".."));
}

export async function resolvePublishMediaItems(
  supabase: SupabaseClient,
  userId: string,
  driveRefresh: string | null | undefined,
  items: PublishMetaItem[],
): Promise<
  { ok: true; resolved: ResolvedMedia[] } | { ok: false; error: string }
> {
  const resolved: ResolvedMedia[] = [];

  for (const item of items) {
    if (item.kind === "drive") {
      const id = sanitizeDriveFileId(item.fileId);
      if (!id) {
        return { ok: false, error: "Invalid Drive file id." };
      }
      if (!driveRefresh) {
        return {
          ok: false,
          error: "Connect Google Drive to use Drive files.",
        };
      }
      let meta;
      try {
        meta = await getDriveFileMeta(driveRefresh, id);
      } catch (e) {
        return {
          ok: false,
          error:
            e instanceof Error ? e.message : "Could not read Drive file info.",
        };
      }
      if (isFolderMime(meta.mimeType)) {
        return { ok: false, error: "Folders cannot be used." };
      }
      let body: { buffer: ArrayBuffer; contentType: string };
      try {
        body = await fetchDriveFileBuffer(driveRefresh, id);
      } catch (e) {
        return {
          ok: false,
          error:
            e instanceof Error ? e.message : "Could not download from Drive.",
        };
      }
      const mimeType = meta.mimeType || body.contentType;
      if (body.buffer.byteLength > MAX_MEDIA_BYTES) {
        return {
          ok: false,
          error: "One file is too large (max ~45 MB).",
        };
      }
      resolved.push({
        buffer: body.buffer,
        mimeType,
        filenameBase: meta.name,
      });
    } else {
      const path = item.storagePath.trim();
      if (!path || !assertStoragePathOwned(path, userId)) {
        return { ok: false, error: "Invalid upload path." };
      }
      const { data: blob, error: dlError } = await supabase.storage
        .from("post_media")
        .download(path);
      if (dlError || !blob) {
        return {
          ok: false,
          error:
            dlError?.message ||
            "Could not read uploaded file. Re-upload or check the post_media bucket.",
        };
      }
      const buffer = await blob.arrayBuffer();
      if (buffer.byteLength > MAX_MEDIA_BYTES) {
        return {
          ok: false,
          error: "One file is too large (max ~45 MB).",
        };
      }
      const mimeType = blob.type || "application/octet-stream";
      const base = path.split("/").pop() || "upload";
      resolved.push({
        buffer,
        mimeType,
        filenameBase: base,
      });
    }
  }

  return { ok: true, resolved };
}

/** Loads Drive + user row for publish/caption flows. */
export async function loadMediaContextForUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "You need to be signed in." };
  }
  const { data: driveRow } = await supabase
    .from("google_drive_accounts")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();
  const driveRefresh = driveRow?.refresh_token as string | null | undefined;
  return {
    ok: true as const,
    supabase,
    userId: user.id,
    driveRefresh,
  };
}
