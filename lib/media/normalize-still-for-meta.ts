import sharp from "sharp";
import type { ResolvedMedia } from "@/lib/composer/publish-media";
import { isGifMime, isVideoMime } from "@/lib/composer/media-types";

/** Instagram / Facebook photo APIs expect common raster formats; we normalize server-side. */
const MAX_EDGE_PX = 8192;

function stripExtension(filenameBase: string): string {
  const i = filenameBase.lastIndexOf(".");
  if (i <= 0) return filenameBase || "image";
  return filenameBase.slice(0, i) || "image";
}

function arrayBufferFromBuffer(buf: Buffer): ArrayBuffer {
  const u8 = new Uint8Array(buf.length);
  u8.set(buf);
  return u8.buffer;
}

function inferMimeFromFilename(filenameBase: string): string | null {
  const ext = filenameBase.split(".").pop()?.toLowerCase();
  if (ext === "heic") return "image/heic";
  if (ext === "heif") return "image/heif";
  return null;
}

function effectiveMimeType(mimeType: string, filenameBase?: string): string {
  const m = mimeType.trim().toLowerCase();
  if (
    (!m || m === "application/octet-stream") &&
    filenameBase &&
    inferMimeFromFilename(filenameBase)
  ) {
    return inferMimeFromFilename(filenameBase)!;
  }
  return m || "application/octet-stream";
}

function isHeicFamilyMime(m: string): boolean {
  const x = m.toLowerCase();
  return x === "image/heic" || x === "image/heif";
}

/**
 * HEIC/HEIF: use `heic-convert` first — Sharp’s libheif often lacks iPhone compression codecs (e.g. 11.6003).
 */
async function heicBufferToJpegBuffer(buffer: ArrayBuffer): Promise<Buffer> {
  const { default: convert } = await import("heic-convert");
  const raw = await convert({
    buffer: Buffer.from(buffer),
    format: "JPEG",
    quality: 0.92,
  });

  if (Buffer.isBuffer(raw)) return raw;
  if (raw instanceof Uint8Array) return Buffer.from(raw);
  return Buffer.from(new Uint8Array(raw));
}

async function rasterToMetaJpeg(
  nodeBuf: Buffer,
  svg: boolean,
): Promise<Buffer> {
  return sharp(nodeBuf, {
    failOn: "none",
    ...(svg ? { density: 300 } : {}),
  })
    .resize(MAX_EDGE_PX, MAX_EDGE_PX, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .rotate()
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

/**
 * JPEG / PNG / WebP pass through unchanged (aside from JPEG mime normalization).
 * HEIC / HEIF → heic-convert → JPEG → Sharp resize/orientation.
 * TIFF, SVG, BMP, etc. → JPEG via Sharp.
 */
export async function normalizeStillBufferForMeta(
  buffer: ArrayBuffer,
  mimeType: string,
  filenameBase?: string,
): Promise<{ buffer: ArrayBuffer; mimeType: string; converted: boolean }> {
  const m = effectiveMimeType(mimeType, filenameBase);

  if (m === "image/jpeg" || m === "image/jpg") {
    return { buffer, mimeType: "image/jpeg", converted: false };
  }
  if (m === "image/png" || m === "image/webp") {
    return { buffer, mimeType: m, converted: false };
  }

  /* HEIC: avoid Sharp’s libheif — use dedicated decoder */
  if (isHeicFamilyMime(m)) {
    try {
      const jpegBuf = await heicBufferToJpegBuffer(buffer);
      const out = await rasterToMetaJpeg(jpegBuf, false);
      return {
        buffer: arrayBufferFromBuffer(out),
        mimeType: "image/jpeg",
        converted: true,
      };
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      throw new Error(
        `HEIC decode failed (${detail}). Try “AirDrop / Save as JPEG” on your iPhone, or export JPEG from Photos.`,
      );
    }
  }

  const nodeBuf = Buffer.from(buffer);
  const svg = m === "image/svg+xml";

  try {
    const out = await rasterToMetaJpeg(nodeBuf, svg);
    return {
      buffer: arrayBufferFromBuffer(out),
      mimeType: "image/jpeg",
      converted: true,
    };
  } catch (e) {
    /* Last resort: mislabeled HEIC sometimes arrives as octet-stream — try heic-convert */
    const msg = e instanceof Error ? e.message : "";
    const looksHeifFailure =
      /heif|heic|compression|bad seek/i.test(msg) ||
      msg.includes("11.6003");
    if (looksHeifFailure && filenameBase?.match(/\.hei[cf]$/i)) {
      try {
        const jpegBuf = await heicBufferToJpegBuffer(buffer);
        const out = await rasterToMetaJpeg(jpegBuf, false);
        return {
          buffer: arrayBufferFromBuffer(out),
          mimeType: "image/jpeg",
          converted: true,
        };
      } catch {
        /* fall through */
      }
    }
    throw new Error(e instanceof Error ? e.message : "Conversion failed.");
  }
}

export async function normalizeResolvedStillImagesForMeta(
  resolved: ResolvedMedia[],
): Promise<
  { ok: true; resolved: ResolvedMedia[] } | { ok: false; error: string }
> {
  const out: ResolvedMedia[] = [];

  for (const r of resolved) {
    if (isVideoMime(r.mimeType) || isGifMime(r.mimeType)) {
      out.push(r);
      continue;
    }

    try {
      const n = await normalizeStillBufferForMeta(
        r.buffer,
        r.mimeType,
        r.filenameBase,
      );
      out.push({
        ...r,
        buffer: n.buffer,
        mimeType: n.mimeType,
        filenameBase: n.converted
          ? `${stripExtension(r.filenameBase)}.jpg`
          : r.filenameBase,
      });
    } catch (e) {
      const detail = e instanceof Error ? e.message : "Unknown error";
      return {
        ok: false,
        error: `Could not prepare image "${r.filenameBase}" for publishing: ${detail}`,
      };
    }
  }

  return { ok: true, resolved: out };
}
