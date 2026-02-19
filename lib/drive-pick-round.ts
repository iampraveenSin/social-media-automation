/**
 * Round-robin state for Drive "Pick random": no image is selected again until
 * all have been posted once. State is per folder, stored in localStorage.
 */

const STORAGE_KEY_PREFIX = "drive-posted-round-";

function getKey(folderId: string | null | undefined): string {
  return `${STORAGE_KEY_PREFIX}${folderId ?? "root"}`;
}

/** Get Drive file IDs that have been posted in the current round (for this folder). */
export function getPostedDriveFileIds(folderId: string | null | undefined): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getKey(folderId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Mark these Drive file IDs as posted this round. Call after schedule or publish. */
export function markDriveFileIdsAsPosted(
  folderId: string | null | undefined,
  driveFileIds: string[]
): void {
  if (typeof window === "undefined" || driveFileIds.length === 0) return;
  const key = getKey(folderId);
  const current = getPostedDriveFileIds(folderId);
  const next = [...new Set([...current, ...driveFileIds])];
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore quota or disabled localStorage
  }
}

/**
 * Pick one file ID from the list for "Pick random": only from files not yet
 * posted this round. If all have been posted, the round is cleared and we pick
 * from all (so there's a gap before the same images appear again).
 */
export function pickNextDriveFileId(
  fileIds: string[],
  folderId: string | null | undefined
): string {
  if (fileIds.length === 0) throw new Error("No files");
  const posted = getPostedDriveFileIds(folderId);
  const notYetPosted = fileIds.filter((id) => !posted.includes(id));
  const pool = notYetPosted.length > 0 ? notYetPosted : fileIds;
  if (pool.length === 0) return fileIds[0];
  if (notYetPosted.length === 0) {
    // New round: clear so next time we'll have a full cycle again
    try {
      localStorage.removeItem(getKey(folderId));
    } catch {
      // ignore
    }
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
