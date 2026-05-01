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
  if (item.kind === "drive") return item.file.mimeType;
  return item.file.type || "application/octet-stream";
}

export function mediaKindLabel(mime: string) {
  if (isFolderMime(mime)) return "Folder";
  if (isGifMime(mime)) return "GIF";
  if (isVideoMime(mime)) return "Video";
  if (isImageMime(mime)) return "Image";
  return "File";
}
