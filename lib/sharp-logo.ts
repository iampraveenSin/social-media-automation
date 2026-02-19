import sharp from "sharp";
import path from "path";
import { readFile } from "fs/promises";
import type { LogoConfig } from "./types";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

/** Load image from public URL (fetch → Buffer) or use Buffer. sharp() must receive Buffer only, never a URL or path. */
async function imageToBuffer(imageUrlOrBuffer: string | Buffer): Promise<Buffer> {
  if (Buffer.isBuffer(imageUrlOrBuffer)) return imageUrlOrBuffer;
  const s = imageUrlOrBuffer;
  const looksLikeUrl = s.startsWith("http") || s.includes("://");
  if (looksLikeUrl) {
    const url = s.includes("://") ? s : s.replace(/^(https?):\/?/, "$1://");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  throw new Error("Image must be a public URL (e.g. Supabase Storage) or Buffer. Do not pass file paths.");
}

export async function addLogoToImage(
  imagePathOrUrlOrBuffer: string | Buffer,
  logoPathOrBuffer: string | Buffer,
  config: LogoConfig
): Promise<Buffer> {
  const logoLooksLikeUrl = (s: string) => s.startsWith("http") || s.includes("://");
  const logoBufferPromise =
    typeof logoPathOrBuffer === "string"
      ? logoLooksLikeUrl(logoPathOrBuffer)
        ? fetch(logoPathOrBuffer).then((r) => r.arrayBuffer()).then((ab) => Buffer.from(ab))
        : readFile(logoPathOrBuffer)
      : Promise.resolve(logoPathOrBuffer);

  const [imageBuffer, logoBuffer] = await Promise.all([
    imageToBuffer(imagePathOrUrlOrBuffer),
    logoBufferPromise,
  ]);
  if (!Buffer.isBuffer(imageBuffer)) throw new Error("Image must be loaded as Buffer before sharp()");
  const imageMeta = await sharp(imageBuffer).metadata();

  const imgW = imageMeta.width ?? 1080;
  const imgH = imageMeta.height ?? 1080;
  const logoSize = Math.round(Math.min(imgW, imgH) * (config.sizePercent / 100));
  const opacity = Math.max(0, Math.min(1, config.opacity));

  const logoResized = await sharp(logoBuffer)
    .resize(logoSize, logoSize)
    .ensureAlpha()
    .toBuffer();

  const padding = Math.round(logoSize * 0.05);
  let left: number;
  let top: number;
  switch (config.position) {
    case "top-left":
      left = padding;
      top = padding;
      break;
    case "top-right":
      left = imgW - logoSize - padding;
      top = padding;
      break;
    case "bottom-left":
      left = padding;
      top = imgH - logoSize - padding;
      break;
    case "center":
      left = Math.round((imgW - logoSize) / 2);
      top = Math.round((imgH - logoSize) / 2);
      break;
    default:
      left = imgW - logoSize - padding;
      top = imgH - logoSize - padding;
  }

  const composed = await sharp(imageBuffer)
    .composite([
      {
        input: logoResized,
        left: Math.max(0, left),
        top: Math.max(0, top),
      },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  return composed;
}

export function getUploadPath(filename: string): string {
  return path.join(UPLOADS_DIR, filename);
}
