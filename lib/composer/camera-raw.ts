/** Camera RAW — not supported for compose/publish; excluded from Drive picker. */
const CAMERA_RAW_EXT =
  /\.(arw|cr2|cr3|nef|nrw|orf|raf|rw2|sr2|dng)$/i;

export function isCameraRawFilename(filename: string): boolean {
  return CAMERA_RAW_EXT.test(filename.trim());
}
