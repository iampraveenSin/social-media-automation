import { inferMimeFromFilename } from "@/lib/composer/infer-mime-from-filename";
import { isCameraRawFilename } from "@/lib/composer/camera-raw";

/** Drive row shape used by picker + composer (shared). */
export type DrivePickerFile = {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string | null;
};

const FOLDER_MIME = "application/vnd.google-apps.folder";

export function isFolderMime(m: string) {
  return m === FOLDER_MIME;
}
export function isGifMime(m: string) {
  return m === "image/gif";
}
export function isImageMime(m: string) {
  return m.startsWith("image/");
}
export function isVideoMime(m: string) {
  return m.startsWith("video/");
}

/** JPEG / PNG / WebP stills — safe for Instagram feed photos and Facebook Page photos here. */
export function isMetaRasterStillMime(m: string) {
  const x = m.toLowerCase();
  return (
    x === "image/jpeg" ||
    x === "image/jpg" ||
    x === "image/png" ||
    x === "image/webp"
  );
}

/** Raster images suitable for collage (excludes GIF). */
export function isCollageImageMime(m: string) {
  return isImageMime(m) && !isGifMime(m);
}

export function composerItemMime(
  item: { kind: "drive"; file: DrivePickerFile } | { kind: "upload"; file: File },
): string {
  if (item.kind === "drive") {
    const m = item.file.mimeType.trim();
    const inferred = inferMimeFromFilename(item.file.name);
    if ((!m || m === "application/octet-stream") && inferred) {
      return inferred;
    }
    return item.file.mimeType;
  }
  const t = item.file.type.trim();
  if (t) return t;
  return inferMimeFromFilename(item.file.name) ?? "application/octet-stream";
}

/**
 * Aligns with Google Drive `files.list` query in `drive-service.ts`:
 * `mimeType contains 'image/' or mimeType contains 'video/'`.
 */
export function mimeMatchesDriveComposerQuery(mimeType: string): boolean {
  const m = mimeType.trim().toLowerCase();
  return m.includes("image/") || m.includes("video/");
}

/**
 * Same eligibility as Drive picker rows (after RAW filename filter): any image/* or video/*,
 * plus HEIC/HEIF when the browser omits `File.type` (matches `composerItemMime` inference).
 */
export function isComposerUploadMedia(file: File): boolean {
  if (isCameraRawFilename(file.name)) return false;
  const mime = file.type.trim();
  if (mime && mimeMatchesDriveComposerQuery(mime)) return true;
  const inferred = inferMimeFromFilename(file.name);
  return Boolean(inferred && mimeMatchesDriveComposerQuery(inferred));
}

export function mediaKindLabel(mime: string) {
  if (isFolderMime(mime)) return "Folder";
  if (isGifMime(mime)) return "GIF";
  if (isVideoMime(mime)) return "Video";
  if (isImageMime(mime)) return "Image";
  return "File";
}
