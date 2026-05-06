import { buildAutoPostCaption } from "@/lib/auto-post/build-auto-caption";
import {
  addCadenceInTimeZone,
  type AutoCadence,
  isAutoCadence,
} from "@/lib/auto-post/cadence";
import { normalizeAutoPostChannel } from "@/lib/auto-post/channel";
import { normalizeAutoPostNextRunTimeMode } from "@/lib/auto-post/next-run-time-mode";
import { pickNextSmartRunUtc } from "@/lib/auto-post/smart-run-time";
import type { PublishMetaItem } from "@/lib/composer/publish-media";
import { pickRandomDriveMedia } from "@/lib/google/drive-service";
import { publishToFacebookPageForUser } from "@/lib/publish/facebook-publish-internal";
import { publishToInstagramForUser } from "@/lib/publish/instagram-publish-internal";
import type { SupabaseClient } from "@supabase/supabase-js";

const BATCH = 5;
const RETRY_MS = 60 * 60 * 1000;

type AutoRow = {
  user_id: string;
  cadence: string;
  next_run_at: string;
  use_ai_caption: boolean;
  drive_folder_id: string | null;
  channel?: string | null;
  next_run_time_mode?: string | null;
  schedule_timezone?: string | null;
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
    .select(
      "user_id, cadence, next_run_at, use_ai_caption, drive_folder_id, channel, next_run_time_mode, schedule_timezone",
    )
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

    const tz = row.schedule_timezone?.trim() || "UTC";
    const afterCadence = addCadenceInTimeZone(
      new Date(prevNext),
      cadence,
      tz,
    );
    const ch = normalizeAutoPostChannel(row.channel);
    const timeMode = normalizeAutoPostNextRunTimeMode(row.next_run_time_mode);
    const claimedNext =
      timeMode === "smart"
        ? pickNextSmartRunUtc({
            channel: ch,
            earliest: afterCadence,
            timeZone: tz,
          }).toISOString()
        : afterCadence.toISOString();
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

    const channel = normalizeAutoPostChannel(row.channel);
    const items: PublishMetaItem[] = [{ kind: "drive", fileId: file.id }];
    const payload = { caption, items };

    let facebookResult: Awaited<
      ReturnType<typeof publishToFacebookPageForUser>
    > | null = null;
    let instagramResult: Awaited<
      ReturnType<typeof publishToInstagramForUser>
    > | null = null;

    if (channel !== "instagram") {
      try {
        facebookResult = await publishToFacebookPageForUser(
          admin,
          row.user_id,
          payload,
          { publishSource: "auto" },
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Publish threw.";
        facebookResult = { ok: false, error: msg };
      }
    }

    if (channel !== "facebook") {
      try {
        instagramResult = await publishToInstagramForUser(
          admin,
          row.user_id,
          payload,
          { publishSource: "auto" },
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Publish threw.";
        instagramResult = { ok: false, error: msg };
      }
    }

    const facebookOk = facebookResult ? facebookResult.ok : true;
    const instagramOk = instagramResult ? instagramResult.ok : true;
    const allOk = facebookOk && instagramOk;

    if (allOk) {
      results.push({ userId: row.user_id, status: "published" });
    } else {
      const detail = [facebookResult, instagramResult]
        .filter((x): x is { ok: false; error: string } => Boolean(x && !x.ok))
        .map((x) => x.error)
        .join(" | ");
      await admin
        .from("auto_post_settings")
        .update({
          last_error: detail.slice(0, 2000),
          next_run_at: new Date(Date.now() + RETRY_MS).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", row.user_id);
      results.push({
        userId: row.user_id,
        status: "failed",
        detail,
      });
    }
  }

  return { ok: true, processed: results.length, results };
}
