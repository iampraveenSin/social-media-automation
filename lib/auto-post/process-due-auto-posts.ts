import { buildAutoPostCaption } from "@/lib/auto-post/build-auto-caption";
import {
  addCadenceToDate,
  type AutoCadence,
  isAutoCadence,
} from "@/lib/auto-post/cadence";
import { pickRandomDriveMedia } from "@/lib/google/drive-service";
import { publishToFacebookPageForUser } from "@/lib/publish/facebook-publish-internal";
import type { SupabaseClient } from "@supabase/supabase-js";

const BATCH = 5;
const RETRY_MS = 60 * 60 * 1000;

type AutoRow = {
  user_id: string;
  cadence: string;
  next_run_at: string;
  use_ai_caption: boolean;
  drive_folder_id: string | null;
};

export async function processDueAutoPosts(
  admin: SupabaseClient,
): Promise<{
  ok: boolean;
  processed: number;
  results: { userId: string; status: string; detail?: string }[];
}> {
  const nowIso = new Date().toISOString();
  const { data: due, error: fetchError } = await admin
    .from("auto_post_settings")
    .select("user_id, cadence, next_run_at, use_ai_caption, drive_folder_id")
    .eq("enabled", true)
    .not("next_run_at", "is", null)
    .lte("next_run_at", nowIso)
    .order("next_run_at", { ascending: true })
    .limit(BATCH);

  if (fetchError) {
    return { ok: true, processed: 0, results: [] };
  }

  const results: { userId: string; status: string; detail?: string }[] = [];

  for (const raw of due ?? []) {
    const row = raw as AutoRow;
    const cadence: AutoCadence = isAutoCadence(row.cadence)
      ? row.cadence
      : "daily";
    const prevNext = row.next_run_at;

    const { data: driveRow } = await admin
      .from("google_drive_accounts")
      .select("refresh_token")
      .eq("user_id", row.user_id)
      .maybeSingle();
    const refresh = driveRow?.refresh_token as string | undefined;
    if (!refresh) {
      await admin
        .from("auto_post_settings")
        .update({
          last_error: "Google Drive not connected.",
          next_run_at: new Date(Date.now() + RETRY_MS).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", row.user_id);
      results.push({
        userId: row.user_id,
        status: "skipped",
        detail: "no drive",
      });
      continue;
    }

    const file = await pickRandomDriveMedia(
      refresh,
      row.drive_folder_id?.trim() || null,
    );
    if (!file?.id) {
      await admin
        .from("auto_post_settings")
        .update({
          last_error:
            "No images or videos found in Drive (check folder ID or library).",
          next_run_at: new Date(Date.now() + RETRY_MS).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", row.user_id);
      results.push({
        userId: row.user_id,
        status: "skipped",
        detail: "no media",
      });
      continue;
    }

    const claimedNext = addCadenceToDate(
      new Date(prevNext),
      cadence,
    ).toISOString();
    const { data: claimed } = await admin
      .from("auto_post_settings")
      .update({
        next_run_at: claimedNext,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", row.user_id)
      .eq("enabled", true)
      .eq("next_run_at", prevNext)
      .select("user_id")
      .maybeSingle();

    if (!claimed) {
      continue;
    }

    let caption: string;
    try {
      caption = await buildAutoPostCaption(
        admin,
        row.user_id,
        refresh,
        file.id,
        row.use_ai_caption,
      );
    } catch {
      caption = "Auto post\n\n#automated";
    }

    let publishResult: Awaited<
      ReturnType<typeof publishToFacebookPageForUser>
    >;
    try {
      publishResult = await publishToFacebookPageForUser(
        admin,
        row.user_id,
        {
          caption,
          items: [{ kind: "drive", fileId: file.id }],
        },
        { publishSource: "auto" },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Publish threw.";
      publishResult = { ok: false, error: msg };
    }

    if (publishResult.ok) {
      results.push({ userId: row.user_id, status: "published" });
    } else {
      await admin
        .from("auto_post_settings")
        .update({
          last_error: publishResult.error.slice(0, 2000),
          next_run_at: new Date(Date.now() + RETRY_MS).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", row.user_id);
      results.push({
        userId: row.user_id,
        status: "failed",
        detail: publishResult.error,
      });
    }
  }

  return { ok: true, processed: results.length, results };
}
