import { google } from "googleapis";
import { isCameraRawFilename } from "@/lib/composer/camera-raw";
import { inferMimeFromFilename } from "@/lib/composer/infer-mime-from-filename";
import {
  isCollageImageMime,
  isGifMime,
  isVideoMime,
} from "@/lib/composer/media-types";
import { createGoogleOAuth2Client } from "@/lib/google/oauth-factory";

const FOLDER_MIME = "application/vnd.google-apps.folder";

export function sanitizeDriveFolderId(folderId: string | null | undefined): string {
  const id = folderId?.trim() || "root";
  if (id === "root") return "root";
  if (/^[a-zA-Z0-9_-]+$/.test(id)) return id;
  return "root";
}

const MEDIA_OR_FOLDER =
  "mimeType contains 'image/' or mimeType contains 'video/'";

export function buildDriveListQuery(folderId: string): string {
  const id = sanitizeDriveFolderId(folderId);
  const parent = id === "root" ? "root" : id;
  return `'${parent}' in parents and trashed = false and (mimeType = '${FOLDER_MIME}' or ${MEDIA_OR_FOLDER})`;
}

export async function getDriveClientForRefreshToken(refreshToken: string) {
  const oauth2 = createGoogleOAuth2Client();
  oauth2.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: "v3", auth: oauth2 });
}

export type DriveFileRow = {
  id: string;
  name: string;
  mimeType: string;
  size?: string | null;
  thumbnailLink?: string | null;
};

export async function listDriveChildren(
  refreshToken: string,
  folderId: string,
  pageToken?: string | null,
): Promise<{ files: DriveFileRow[]; nextPageToken: string | null }> {
  const drive = await getDriveClientForRefreshToken(refreshToken);
  const res = await drive.files.list({
    q: buildDriveListQuery(folderId),
    pageSize: 40,
    pageToken: pageToken ?? undefined,
    fields:
      "nextPageToken, files(id, name, mimeType, size, thumbnailLink)",
    orderBy: "folder,name",
  });

  const files = (res.data.files ?? [])
    .map((f) => ({
      id: f.id!,
      name: f.name ?? "Untitled",
      mimeType: f.mimeType ?? "",
      size: f.size,
      thumbnailLink: f.thumbnailLink,
    }))
    .filter((f) => !isCameraRawFilename(f.name));

  return {
    files,
    nextPageToken: res.data.nextPageToken ?? null,
  };
}

const MAX_RANDOM_LIST_PAGES = 12;

/**
 * Every Nth successful random/auto Drive pick forces one still image or one video (no collage).
 * Shared counter on `google_drive_accounts.drive_pick_count` (random + auto-post).
 * Larger N ⇒ fewer forced singles (still guaranteed periodically).
 */
export const DRIVE_PUBLISH_SINGLE_EVERY_N = 6;

export function nextDrivePickRotation(
  previousCount: number,
  everyN: number = DRIVE_PUBLISH_SINGLE_EVERY_N,
): { nextCount: number; forceSingle: boolean } {
  const nextCount = Math.max(0, previousCount) + 1;
  const forceSingle = everyN > 0 && nextCount % everyN === 0;
  return { nextCount, forceSingle };
}

/** Paginates Drive `files.list` for random / auto-post selection (same scope as random pick). */
export async function listDriveMediaPoolForFolder(
  refreshToken: string,
  folderId?: string | null,
): Promise<DriveFileRow[]> {
  const drive = await getDriveClientForRefreshToken(refreshToken);
  const parent = sanitizeDriveFolderId(folderId ?? "root");
  const q = `'${parent}' in parents and trashed = false and (${MEDIA_OR_FOLDER})`;

  const all: DriveFileRow[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_RANDOM_LIST_PAGES; page++) {
    const res = await drive.files.list({
      q,
      pageSize: 100,
      pageToken,
      fields: "nextPageToken, files(id, name, mimeType, thumbnailLink)",
    });
    const batch = (res.data.files ?? []).filter(
      (f) => f.id && f.name && !isCameraRawFilename(f.name ?? ""),
    ) as DriveFileRow[];
    all.push(...batch);
    pageToken = res.data.nextPageToken ?? undefined;
    if (!pageToken) break;
  }

  return all;
}

export function effectiveDriveRowMime(row: DriveFileRow): string {
  const m = row.mimeType.trim().toLowerCase();
  const inferred = inferMimeFromFilename(row.name);
  if ((!m || m === "application/octet-stream") && inferred) {
    return inferred;
  }
  return row.mimeType.trim() || inferred || "";
}

function sampleWithoutReplacement<T>(arr: T[], k: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a.slice(0, k);
}

function pickPoolForExclude(
  rows: DriveFileRow[],
  excludeIds: ReadonlySet<string>,
): DriveFileRow[] {
  const unused = rows.filter((r) => !excludeIds.has(r.id));
  return unused.length > 0 ? unused : [...rows];
}

/** One image or one video (or GIF if nothing else); never collage. */
function pickForcedSingleOnly(
  imgs: DriveFileRow[],
  vids: DriveFileRow[],
  gfs: DriveFileRow[],
): DriveFileRow[] {
  const canVid = vids.length >= 1;
  const canImg = imgs.length >= 1;
  const canGif = gfs.length >= 1;
  if (canVid && canImg) {
    return Math.random() < 0.5
      ? [vids[Math.floor(Math.random() * vids.length)]!]
      : [imgs[Math.floor(Math.random() * imgs.length)]!];
  }
  if (canImg) return [imgs[Math.floor(Math.random() * imgs.length)]!];
  if (canVid) return [vids[Math.floor(Math.random() * vids.length)]!];
  if (canGif) return [gfs[Math.floor(Math.random() * gfs.length)]!];
  return [];
}

function selectDriveFilesForPublish(
  all: DriveFileRow[],
  excludeIds: ReadonlySet<string>,
  options?: { forceSingle?: boolean },
): DriveFileRow[] {
  const collage: DriveFileRow[] = [];
  const video: DriveFileRow[] = [];
  const gif: DriveFileRow[] = [];

  for (const r of all) {
    const m = effectiveDriveRowMime(r);
    if (isVideoMime(m)) video.push(r);
    else if (isGifMime(m)) gif.push(r);
    else if (isCollageImageMime(m)) collage.push(r);
  }

  const imgs = pickPoolForExclude(collage, excludeIds);
  const vids = pickPoolForExclude(video, excludeIds);
  const gfs = pickPoolForExclude(gif, excludeIds);

  if (options?.forceSingle) {
    const forced = pickForcedSingleOnly(imgs, vids, gfs);
    if (forced.length > 0) return forced;
  }

  type PickMode = "collage" | "single" | "video" | "gif";
  const candidates: PickMode[] = [];
  if (imgs.length >= 2) candidates.push("collage");
  if (imgs.length >= 1) candidates.push("single");
  if (vids.length >= 1) candidates.push("video");
  if (gfs.length >= 1) candidates.push("gif");

  if (candidates.length === 0) return [];

  /** Collage is the default mix; single / video still common; GIF least. */
  const WEIGHT: Record<PickMode, number> = {
    collage: 40,
    single: 24,
    video: 28,
    gif: 8,
  };
  const weights = candidates.map((m) => WEIGHT[m]);
  const sum = weights.reduce((a, b) => a + b, 0);
  const pick = Math.random() * sum;
  let acc = 0;
  let mode: PickMode = candidates[candidates.length - 1]!;
  for (let i = 0; i < candidates.length; i++) {
    acc += weights[i]!;
    if (pick < acc) {
      mode = candidates[i]!;
      break;
    }
  }

  switch (mode) {
    case "collage": {
      const maxK = Math.min(4, imgs.length);
      const k = maxK <= 2 ? 2 : Math.floor(Math.random() * (maxK - 1)) + 2;
      return sampleWithoutReplacement(imgs, k);
    }
    case "single":
      return [imgs[Math.floor(Math.random() * imgs.length)]!];
    case "video":
      return [vids[Math.floor(Math.random() * vids.length)]!];
    case "gif":
      return [gfs[Math.floor(Math.random() * gfs.length)]!];
    default:
      return [];
  }
}

/**
 * Picks Drive files for auto-post / random pick: usually multi-image collage when enough stills;
 * sometimes one image, one video, or GIF. Every Nth pick can force a single (see
 * {@link DRIVE_PUBLISH_SINGLE_EVERY_N}). When `forceSingle` is true, never collage.
 */
export async function pickRandomDrivePublishFiles(
  refreshToken: string,
  folderId?: string | null,
  options?: { excludeIds?: ReadonlySet<string>; forceSingle?: boolean },
): Promise<DriveFileRow[]> {
  const all = await listDriveMediaPoolForFolder(refreshToken, folderId);
  if (all.length === 0) return [];
  return selectDriveFilesForPublish(all, options?.excludeIds ?? new Set(), {
    forceSingle: options?.forceSingle,
  });
}

/**
 * @deprecated Prefer {@link pickRandomDrivePublishFiles} for multi-select; kept for callers that need one row.
 */
export async function pickRandomDriveMedia(
  refreshToken: string,
  folderId?: string | null,
  options?: { excludeIds?: ReadonlySet<string>; forceSingle?: boolean },
): Promise<DriveFileRow | null> {
  const files = await pickRandomDrivePublishFiles(refreshToken, folderId, options);
  return files[0] ?? null;
}
