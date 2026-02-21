/**
 * Recurring auto-post: pick random media from Drive and publish on a schedule.
 * Used by the queue worker (processRecurrence) and by GET/POST /api/recurrence for nextRunAt.
 */

import { addDays, addMonths } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import type { RecurrenceFrequency, RecurrenceSettings } from "./types";
import { DEFAULT_POST_TIMES } from "./types";
import {
  getRecurrenceSettings,
  saveRecurrenceSettings,
  getDueRecurrenceSettings,
  getDriveAccount,
  saveDriveAccount,
  getAccounts,
  getDrivePostedRound,
  addDrivePostedRound,
  clearDrivePostedRound,
  saveMediaItem,
  savePost,
} from "./store";
import { refreshDriveAccessToken, listMediaInFolder, downloadDriveFile } from "./drive";
import { uploadToSupabaseStorage } from "./storage";
import { publishToInstagram, publishToFacebookPage, isPublicImageUrl, buildCaptionWithHashtags } from "./instagram";
import type { InstagramMediaType } from "./instagram";
import { resolveVideoForPublish } from "./video";
import type { MediaItem, ScheduledPost } from "./types";
import { isSupabaseConfigured } from "./supabase";

const DEFAULT_CAPTION = "Check this out ✨";
const DEFAULT_HASHTAGS = ["#content", "#post", "#share"];

/** Get next run date (no time of day). */
function getNextRunDate(frequency: RecurrenceFrequency, from: Date): Date {
  const d = new Date(from);
  switch (frequency) {
    case "daily":
      return addDays(d, 1);
    case "every_3_days":
      return addDays(d, 3);
    case "weekly":
      return addDays(d, 7);
    case "monthly":
      return addMonths(d, 1);
    default:
      return addDays(d, 1);
  }
}

/** Parse "HH:mm" and set on date; returns date. */
function setTimeOnDate(date: Date, timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const out = new Date(date);
  out.setHours(Number.isNaN(h) ? 9 : h, Number.isNaN(m) ? 0 : m, 0, 0);
  return out;
}

export function computeNextRunAt(frequency: RecurrenceFrequency, from: Date = new Date()): string {
  const times = DEFAULT_POST_TIMES;
  const result = computeNextRunAtWithTimes(frequency, from, times, 0);
  return result.nextRunAt;
}

/** Compute next run using post times so each post is at a different time (round-robin). */
export function computeNextRunAtWithTimes(
  frequency: RecurrenceFrequency,
  from: Date = new Date(),
  postTimes: string[] = DEFAULT_POST_TIMES,
  nextTimeIndex: number = 0
): { nextRunAt: string; nextTimeIndex: number } {
  const nextDate = getNextRunDate(frequency, from);
  const times = postTimes.length > 0 ? postTimes : DEFAULT_POST_TIMES;
  const idx = nextTimeIndex % times.length;
  const timeStr = times[idx] ?? "09:00";
  const withTime = setTimeOnDate(nextDate, timeStr);
  const newIndex = (nextTimeIndex + 1) % times.length;
  return { nextRunAt: withTime.toISOString(), nextTimeIndex: newIndex };
}

function mimeToExt(mimeType: string): string {
  if (mimeType.includes("png")) return ".png";
  if (mimeType.includes("gif")) return ".gif";
  if (mimeType.includes("webp")) return ".webp";
  if (mimeType.includes("mp4") || mimeType === "video/mp4") return ".mp4";
  if (mimeType.includes("quicktime") || mimeType.includes("mov")) return ".mov";
  if (mimeType.includes("webm")) return ".webm";
  return ".jpg";
}

/**
 * Process one user's recurring post: pick random media from Drive, publish to Instagram, advance nextRunAt.
 */
export async function processRecurrenceForUser(appUserId: string): Promise<{ ok: boolean; error?: string }> {
  const settings = await getRecurrenceSettings(appUserId);
  if (!settings?.enabled || !settings.nextRunAt) return { ok: false, error: "Recurrence not enabled or no next run" };

  const driveAccount = await getDriveAccount(appUserId);
  if (!driveAccount) return { ok: false, error: "Drive not connected" };

  let accessToken = driveAccount.accessToken;
  const fresh = await refreshDriveAccessToken(driveAccount.refreshToken);
  if (fresh) {
    accessToken = fresh;
    await saveDriveAccount(appUserId, { ...driveAccount, accessToken: fresh });
  }

  const accounts = await getAccounts(appUserId);
  const account = accounts[0] ?? null;
  if (!account) return { ok: false, error: "No Instagram account connected" };

  const folderId = settings.driveFolderId ?? driveAccount.folderId ?? "root";
  const listResult = await listMediaInFolder(accessToken, folderId);
  if (listResult.error || !listResult.files?.length) {
    const { nextRunAt, nextTimeIndex } = computeNextRunAtWithTimes(settings.frequency, new Date(), settings.postTimes ?? DEFAULT_POST_TIMES, settings.nextTimeIndex ?? 0);
    await saveRecurrenceSettings(appUserId, { ...settings, nextRunAt, nextTimeIndex });
    return { ok: false, error: "No media in Drive folder" };
  }

  const posted = await getDrivePostedRound(appUserId, folderId);
  let candidates = listResult.files.filter((f) => !posted.includes(f.id));
  if (candidates.length === 0) {
    await clearDrivePostedRound(appUserId, folderId);
    candidates = listResult.files;
  }
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  if (!chosen) {
    const { nextRunAt, nextTimeIndex } = computeNextRunAtWithTimes(settings.frequency, new Date(), settings.postTimes ?? DEFAULT_POST_TIMES, settings.nextTimeIndex ?? 0);
    await saveRecurrenceSettings(appUserId, { ...settings, nextRunAt, nextTimeIndex });
    return { ok: false, error: "No media to pick" };
  }

  const downloaded = await downloadDriveFile(accessToken, chosen.id);
  if (!downloaded) {
    const { nextRunAt, nextTimeIndex } = computeNextRunAtWithTimes(settings.frequency, new Date(), settings.postTimes ?? DEFAULT_POST_TIMES, settings.nextTimeIndex ?? 0);
    await saveRecurrenceSettings(appUserId, { ...settings, nextRunAt, nextTimeIndex });
    return { ok: false, error: "Failed to download from Drive" };
  }

  const ext = mimeToExt(downloaded.mimeType);
  const mediaId = uuidv4();
  const filename = `${mediaId}${ext}`;

  let mediaUrl: string;
  if (isSupabaseConfigured()) {
    const result = await uploadToSupabaseStorage(filename, downloaded.buffer, downloaded.mimeType);
    if (!result.url) {
      const { nextRunAt, nextTimeIndex } = computeNextRunAtWithTimes(settings.frequency, new Date(), settings.postTimes ?? DEFAULT_POST_TIMES, settings.nextTimeIndex ?? 0);
      await saveRecurrenceSettings(appUserId, { ...settings, nextRunAt, nextTimeIndex });
      return { ok: false, error: "Failed to upload media" };
    }
    mediaUrl = result.url;
    const item: MediaItem = {
      id: mediaId,
      filename,
      path: result.url,
      url: result.url,
      mimeType: downloaded.mimeType,
      uploadedAt: new Date().toISOString(),
      userId: appUserId,
      driveFileId: chosen.id,
    };
    await saveMediaItem(item);
  } else {
    return { ok: false, error: "Recurring posts require Supabase storage" };
  }

  if (!isPublicImageUrl(mediaUrl)) {
    const { nextRunAt, nextTimeIndex } = computeNextRunAtWithTimes(settings.frequency, new Date(), settings.postTimes ?? DEFAULT_POST_TIMES, settings.nextTimeIndex ?? 0);
    await saveRecurrenceSettings(appUserId, { ...settings, nextRunAt, nextTimeIndex });
    return { ok: false, error: "Media URL not publicly accessible" };
  }

  const caption = buildCaptionWithHashtags(DEFAULT_CAPTION, DEFAULT_HASHTAGS);
  const isVideo = downloaded.mimeType.startsWith("video/");
  let publishUrl = mediaUrl;
  let instagramMediaType: InstagramMediaType = "image";
  if (isVideo) {
    try {
      const resolved = await resolveVideoForPublish(mediaUrl);
      publishUrl = resolved.url;
      instagramMediaType = resolved.placement;
    } catch (videoErr) {
      const { nextRunAt, nextTimeIndex } = computeNextRunAtWithTimes(settings.frequency, new Date(), settings.postTimes ?? DEFAULT_POST_TIMES, settings.nextTimeIndex ?? 0);
      await saveRecurrenceSettings(appUserId, { ...settings, nextRunAt, nextTimeIndex });
      return { ok: false, error: videoErr instanceof Error ? videoErr.message : String(videoErr) };
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
    const { nextRunAt, nextTimeIndex } = computeNextRunAtWithTimes(settings.frequency, new Date(), settings.postTimes ?? DEFAULT_POST_TIMES, settings.nextTimeIndex ?? 0);
    await saveRecurrenceSettings(appUserId, { ...settings, nextRunAt, nextTimeIndex });
    return { ok: false, error: result.error };
  }

  if (account.facebookPageId) {
    const fbResult = await publishToFacebookPage(
      account.facebookPageId,
      account.accessToken,
      publishUrl,
      caption,
      isVideo ? "video" : "image"
    );
    if ("error" in fbResult) console.warn("[recurrence] Facebook post failed:", fbResult.error);
  }

  const postId = uuidv4();
  const now = new Date().toISOString();
  const post: ScheduledPost = {
    id: postId,
    mediaId,
    mediaUrl,
    caption: DEFAULT_CAPTION,
    hashtags: DEFAULT_HASHTAGS,
    mediaType: isVideo ? "video" : "image",
    scheduledAt: now,
    publishedAt: now,
    status: "published",
    userId: account.userId,
    appUserId,
    createdAt: now,
    instagramMediaId: result.id,
  };
  await savePost(post);
  await addDrivePostedRound(appUserId, folderId, [chosen.id]);

  const { nextRunAt, nextTimeIndex } = computeNextRunAtWithTimes(settings.frequency, new Date(), settings.postTimes ?? DEFAULT_POST_TIMES, settings.nextTimeIndex ?? 0);
  await saveRecurrenceSettings(appUserId, { ...settings, nextRunAt, nextTimeIndex });

  return { ok: true };
}

/**
 * Run recurring posts for all users that are due. Call from worker on an interval.
 */
export async function processRecurrence(): Promise<void> {
  const now = new Date();
  const due = await getDueRecurrenceSettings(now);
  for (const settings of due) {
    try {
      const out = await processRecurrenceForUser(settings.appUserId);
      if (out.ok) {
        console.log(`[recurrence] Posted for user ${settings.appUserId}; next at ${(await getRecurrenceSettings(settings.appUserId))?.nextRunAt}`);
      } else {
        console.warn(`[recurrence] Skipped user ${settings.appUserId}: ${out.error}`);
      }
    } catch (err) {
      console.error(`[recurrence] Error for user ${settings.appUserId}:`, err);
    }
  }
}
