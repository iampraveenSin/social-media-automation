import { buildAutoPostCaption } from "@/lib/auto-post/build-auto-caption";
import {
  addCadenceInTimeZone,
  type AutoCadence,
  isAutoCadence,
} from "@/lib/auto-post/cadence";
import type { AutoPostChannel } from "@/lib/auto-post/channel";
import { normalizeAutoPostChannel } from "@/lib/auto-post/channel";
import { normalizeAutoPostNextRunTimeMode } from "@/lib/auto-post/next-run-time-mode";
import { pickNextSmartRunUtc } from "@/lib/auto-post/smart-run-time";
import { bakeCollageSharpFromResolved } from "@/lib/composer/bake-collage-sharp";
import { isCollageImageMime } from "@/lib/composer/media-types";
import type { PublishMetaItem } from "@/lib/composer/publish-media";
import { resolvePublishMediaItems } from "@/lib/composer/publish-media";
import {
  loadDriveAccountForPick,
  saveDrivePickCountAfterPick,
} from "@/lib/google/drive-pick-account";
import {
  effectiveDriveRowMime,
  nextDrivePickRotation,
  pickRandomDrivePublishFiles,
} from "@/lib/google/drive-service";
import { normalizeResolvedStillImagesForMeta } from "@/lib/media/normalize-still-for-meta";
import { fetchPublishedDriveFileIdsSet } from "@/lib/publish/fetch-published-drive-file-ids";
import { publishToFacebookPageForUser } from "@/lib/publish/facebook-publish-internal";
import { publishToInstagramForUser } from "@/lib/publish/instagram-publish-internal";
import { publishWithChannelIdempotency } from "@/lib/publish/channel-idempotency";
import { getChannelPublishStatus } from "@/lib/publish/published-posts";
import type { SupabaseClient } from "@supabase/supabase-js";

const BATCH = 5;
const RETRY_MS = 60 * 60 * 1000;
/** Hold `next_run_at` while we fetch Drive + publish so overlapping crons cannot double-post. */
const LEASE_MS = 25 * 60 * 1000;
const PUBLISH_ATTEMPTS = 3;
const PUBLISH_RETRY_DELAY_MS = 2500;
const AUTO_REFERENCE_MARKER = "auto_reference_id=";

type AutoRow = {
  user_id: string;
  cadence: string;
  next_run_at: string;
  use_ai_caption: boolean;
  drive_folder_id: string | null;
  channel?: string | null;
  next_run_time_mode?: string | null;
  schedule_timezone?: string | null;
  last_error?: string | null;
};

export function resolveAutoPostReferenceId(
  userId: string,
  scheduledSlot: string,
  lastError?: string | null,
): string {
  const match = lastError?.match(/\[auto_reference_id=([^\]]+)\]/);
  return match?.[1] ?? `auto-${userId}-${scheduledSlot}`;
}

function formatAutoPostLastError(detail: string, referenceId: string): string {
  return `[${AUTO_REFERENCE_MARKER}${referenceId}] ${detail}`;
}

async function publishAutoToChannels(
  admin: SupabaseClient,
  userId: string,
  channel: AutoPostChannel,
  payload: {
    caption: string;
    items: PublishMetaItem[];
    publishedDriveFileIds?: string[] | null;
  },
  referenceId: string,
): Promise<{
  facebookResult: Awaited<
    ReturnType<typeof publishToFacebookPageForUser>
  > | null;
  instagramResult: Awaited<
    ReturnType<typeof publishToInstagramForUser>
  > | null;
}> {
  const opts = { publishSource: "auto" as const, referenceId };

  return publishWithChannelIdempotency({
    channel,
    userId,
    referenceId,
    payload,
    logPrefix: `[auto:${userId}]`,
    attempts: PUBLISH_ATTEMPTS,
    retryDelayMs: PUBLISH_RETRY_DELAY_MS,
    getChannelPublishStatus: (statusUserId, statusReferenceId, statusChannel) =>
      getChannelPublishStatus(
        admin,
        statusUserId,
        statusReferenceId,
        statusChannel,
      ),
    publishFacebook: (publishPayload) =>
      publishToFacebookPageForUser(admin, userId, publishPayload, opts),
    publishInstagram: (publishPayload) =>
      publishToInstagramForUser(admin, userId, publishPayload, opts),
  });
}

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
      "user_id, cadence, next_run_at, use_ai_caption, drive_folder_id, channel, next_run_time_mode, schedule_timezone, last_error",
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
    const referenceId = resolveAutoPostReferenceId(
      row.user_id,
      prevNext,
      row.last_error,
    );

    const { refreshToken: refresh, pickCount: prevPickCount } =
      await loadDriveAccountForPick(admin, row.user_id);
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

    const leaseUntil = new Date(Date.now() + LEASE_MS).toISOString();

    const { data: leased } = await admin
      .from("auto_post_settings")
      .update({
        next_run_at: leaseUntil,
        last_error: formatAutoPostLastError("Processing.", referenceId),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", row.user_id)
      .eq("enabled", true)
      .eq("next_run_at", prevNext)
      .select("user_id")
      .maybeSingle();

    if (!leased) {
      continue;
    }

    const excludeIds = await fetchPublishedDriveFileIdsSet(admin, row.user_id);
    const { nextCount, forceSingle } = nextDrivePickRotation(prevPickCount);
    const picked = await pickRandomDrivePublishFiles(
      refresh,
      row.drive_folder_id?.trim() || null,
      { excludeIds, forceSingle },
    );
    if (picked.length === 0) {
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

    await saveDrivePickCountAfterPick(admin, row.user_id, nextCount);

    const sourceDriveIds = picked.map((f) => f.id);

    let caption: string;
    try {
      caption = await buildAutoPostCaption(
        admin,
        row.user_id,
        refresh,
        sourceDriveIds,
        row.use_ai_caption,
      );
    } catch {
      caption = "Auto post\n\n#automated";
    }

    const isMultiCollage =
      picked.length >= 2 &&
      picked.every((f) =>
        isCollageImageMime(effectiveDriveRowMime(f)),
      );

    let payload: {
      caption: string;
      items: PublishMetaItem[];
      publishedDriveFileIds?: string[] | null;
    } = {
      caption,
      items: picked.map((f) => ({ kind: "drive" as const, fileId: f.id })),
    };

    if (isMultiCollage) {
      const driveItems: PublishMetaItem[] = picked.map((f) => ({
        kind: "drive" as const,
        fileId: f.id,
      }));
      const resolvedResult = await resolvePublishMediaItems(
        admin,
        row.user_id,
        refresh,
        driveItems,
      );
      if (resolvedResult.ok) {
        const norm = await normalizeResolvedStillImagesForMeta(
          resolvedResult.resolved,
        );
        if (norm.ok) {
          const png = await bakeCollageSharpFromResolved(
            norm.resolved,
            picked.length,
          );
          if (png) {
            const path = `${row.user_id}/${crypto.randomUUID()}-auto-collage.png`;
            const { error: upErr } = await admin.storage
              .from("post_media")
              .upload(path, png, {
                contentType: "image/png",
                upsert: false,
              });
            if (!upErr) {
              payload = {
                caption,
                items: [{ kind: "upload", storagePath: path }],
                publishedDriveFileIds: sourceDriveIds,
              };
            }
          }
        }
      }
    }

    const channel = normalizeAutoPostChannel(row.channel);

    const { facebookResult, instagramResult } = await publishAutoToChannels(
      admin,
      row.user_id,
      channel,
      payload,
      referenceId,
    );

    const facebookOk = facebookResult ? facebookResult.ok : true;
    const instagramOk = instagramResult ? instagramResult.ok : true;
    const allOk = facebookOk && instagramOk;

    if (allOk) {
      await admin
        .from("auto_post_settings")
        .update({
          next_run_at: claimedNext,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", row.user_id);
      results.push({ userId: row.user_id, status: "published" });
    } else {
      const detail = [facebookResult, instagramResult]
        .filter((x): x is { ok: false; error: string } => Boolean(x && !x.ok))
        .map((x) => x.error)
        .join(" | ");
      await admin
        .from("auto_post_settings")
        .update({
          last_error: formatAutoPostLastError(detail, referenceId).slice(
            0,
            2000,
          ),
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
