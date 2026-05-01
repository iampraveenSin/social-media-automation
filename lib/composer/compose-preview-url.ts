import type { DrivePickerFile } from "@/lib/composer/media-types";
import { needsRasterPreviewConversion } from "@/lib/composer/needs-browser-preview";

export function driveRawFileUrl(file: DrivePickerFile): string {
  return `/api/google/drive/file?id=${encodeURIComponent(file.id)}`;
}

/** Same-origin URL that returns browser-safe raster bytes (JPEG) for HEIC/HEIF from Drive. */
export function driveComposePreviewUrl(file: DrivePickerFile): string {
  const q = new URLSearchParams({
    id: file.id,
    name: file.name,
  });
  return `/api/media/compose-preview?${q.toString()}`;
}

export function driveMediaUrlForComposer(file: DrivePickerFile): string {
  if (needsRasterPreviewConversion(file.mimeType, file.name)) {
    return driveComposePreviewUrl(file);
  }
  return driveRawFileUrl(file);
}
