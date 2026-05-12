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
    case "mp4":
    case "m4v":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "webm":
      return "video/webm";
    case "mkv":
      return "video/x-matroska";
    case "avi":
      return "video/x-msvideo";
    case "mpeg":
    case "mpg":
      return "video/mpeg";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return null;
  }
}
