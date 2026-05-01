import { inferMimeFromFilename } from "@/lib/composer/infer-mime-from-filename";

/** Formats safe to show in <img> without server decode (common browsers). */
const BROWSER_IMG_SAFE = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

/**
 * True when we should run bytes through `/api/media/compose-preview` so the
 * browser gets JPEG/PNG/WebP. Extension is checked first — cameras often set a
 * wrong `File.type` for HEIC (e.g. `image/jpeg`), which would skip conversion.
 */
export function needsRasterPreviewConversion(
  mimeType: string,
  filename: string,
): boolean {
  const name = filename.trim();
  if (/\.(heic|heif)$/i.test(name)) return true;

  const inferred = inferMimeFromFilename(name);
  const m = (mimeType.trim() || inferred || "application/octet-stream").toLowerCase();

  if (m.startsWith("video/")) return false;
  if (BROWSER_IMG_SAFE.has(m)) return false;
  if (m.startsWith("image/")) return true;

  return Boolean(inferred?.startsWith("image/"));
}
