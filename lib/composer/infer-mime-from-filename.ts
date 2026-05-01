/**
 * Infer MIME when the browser or Google Drive omits or mislabels `Content-Type`
 * (common for HEIC).
 */
export function inferMimeFromFilename(filename: string): string | null {
  const base = filename.trim();
  const lower = base.toLowerCase();
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".heif")) return "image/heif";

  const ext = base.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  switch (ext) {
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    default:
      return null;
  }
}
