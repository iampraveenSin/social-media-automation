import sharp from "sharp";
import type { ResolvedMedia } from "@/lib/composer/publish-media";

const CANVAS = 1080;
const PAD = 8;
const GAP = 8;
const BG = "#f1f5f9";

function toNodeBuffer(r: ResolvedMedia): Buffer {
  return Buffer.from(new Uint8Array(r.buffer));
}

async function cellCover(b: Buffer, tw: number, th: number): Promise<Buffer> {
  const w = Math.max(1, Math.round(tw));
  const h = Math.max(1, Math.round(th));
  return sharp(b)
    .rotate()
    .resize(w, h, { fit: "cover", position: "center" })
    .png()
    .toBuffer();
}

/**
 * Server-side collage matching the browser 2×2 / split layout (no logo). Uses up to 4 images;
 * `totalImageCount` can exceed 4 to draw a "+N" badge on the fourth cell.
 */
export async function bakeCollageSharpFromResolved(
  resolved: ResolvedMedia[],
  totalImageCount: number,
): Promise<Buffer | null> {
  const imgs = resolved.slice(0, Math.min(4, resolved.length));
  const m = imgs.length;
  if (m < 2) return null;

  const n = Math.max(totalImageCount, m);
  const showExtra = n > 4;
  const extra = n - 4;

  const raw = await Promise.all(imgs.map((r) => sharp(toNodeBuffer(r)).rotate().toBuffer()));

  const P = PAD;
  const W = CANVAS - 2 * P;
  const H = CANVAS - 2 * P;

  const composites: sharp.OverlayOptions[] = [];

  if (m === 2) {
    const cw = (W - GAP) / 2;
    const ch = H;
    composites.push({
      input: await cellCover(raw[0]!, cw, ch),
      left: P,
      top: P,
    });
    composites.push({
      input: await cellCover(raw[1]!, cw, ch),
      left: Math.round(P + cw + GAP),
      top: P,
    });
  } else if (m === 3) {
    const cw = (W - GAP) / 2;
    const ch2 = (H - GAP) / 2;
    composites.push({
      input: await cellCover(raw[0]!, cw, H),
      left: P,
      top: P,
    });
    composites.push({
      input: await cellCover(raw[1]!, cw, ch2),
      left: Math.round(P + cw + GAP),
      top: P,
    });
    composites.push({
      input: await cellCover(raw[2]!, cw, ch2),
      left: Math.round(P + cw + GAP),
      top: Math.round(P + ch2 + GAP),
    });
  } else {
    const cw = (W - GAP) / 2;
    const ch = (H - GAP) / 2;
    const positions: [number, number][] = [
      [P, P],
      [Math.round(P + cw + GAP), P],
      [P, Math.round(P + ch + GAP)],
      [Math.round(P + cw + GAP), Math.round(P + ch + GAP)],
    ];
    for (let i = 0; i < 4; i++) {
      const b = raw[i];
      if (!b) break;
      const [x, y] = positions[i]!;
      let cell = await cellCover(b, cw, ch);
      if (showExtra && i === 3) {
        const fs = Math.max(18, Math.round(ch * 0.22));
        const svg = `<svg width="${cw}" height="${ch}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="rgba(15,23,42,0.55)"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="system-ui,sans-serif" font-weight="700" font-size="${fs}">+${extra}</text>
</svg>`;
        const overlay = await sharp(Buffer.from(svg)).png().toBuffer();
        cell = await sharp(cell)
          .composite([{ input: overlay, left: 0, top: 0 }])
          .png()
          .toBuffer();
      }
      composites.push({ input: cell, left: x, top: y });
    }
  }

  try {
    return await sharp({
      create: {
        width: CANVAS,
        height: CANVAS,
        channels: 3,
        background: BG,
      },
    })
      .composite(composites)
      .png({ compressionLevel: 7 })
      .toBuffer();
  } catch {
    return null;
  }
}
