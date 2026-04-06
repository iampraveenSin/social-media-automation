import { composerItemMime, isCollageImageMime } from "@/lib/composer/media-types";

const CANVAS = 1080;
const PAD_MULTI = 8;
const GAP = 8;
const OUTER_R = 16;
const CELL_R = 12;
const BG = "#f1f5f9";
const LOGO_MAX_FRAC_W = 0.35;
const LOGO_MAX_FRAC_H = 0.22;
const LOGO_INSET = 25;

type LogoCorner = "tl" | "tr" | "bl" | "br";

type ItemForBakeMime = Parameters<typeof composerItemMime>[0];

export function shouldBakeCollage(
  items: ItemForBakeMime[],
  logoPreviewUrl: string | null,
): boolean {
  if (items.length === 0) return false;
  if (!items.every((i) => isCollageImageMime(composerItemMime(i)))) return false;
  return items.length > 1 || Boolean(logoPreviewUrl);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      void img.decode().then(() => resolve(img), () => resolve(img));
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (iw <= 0 || ih <= 0) return;
  const scale = Math.max(dw / iw, dh / ih);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function clipRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, rad);
  ctx.clip();
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.save();
  clipRoundRect(ctx, x, y, w, h, CELL_R);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, w, h);
  drawImageCover(ctx, img, x, y, w, h);
  ctx.restore();
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  corner: LogoCorner,
) {
  const lw = img.naturalWidth;
  const lh = img.naturalHeight;
  if (lw <= 0 || lh <= 0) return;
  const maxW = CANVAS * LOGO_MAX_FRAC_W;
  const maxH = CANVAS * LOGO_MAX_FRAC_H;
  const scale = Math.min(maxW / lw, maxH / lh);
  const dw = lw * scale;
  const dh = lh * scale;
  let x = LOGO_INSET;
  let y = LOGO_INSET;
  if (corner === "tr" || corner === "br") {
    x = CANVAS - LOGO_INSET - dw;
  }
  if (corner === "bl" || corner === "br") {
    y = CANVAS - LOGO_INSET - dh;
  }
  ctx.drawImage(img, x, y, dw, dh);
}

/**
 * Renders the same collage layout as ComposerPreview (still images) to a PNG.
 * Call only in the browser.
 */
export async function bakeCollageToPngBlob(params: {
  itemMediaUrls: string[];
  totalCount: number;
  logoUrl: string | null;
  logoCorner: LogoCorner;
}): Promise<Blob | null> {
  const { itemMediaUrls, totalCount, logoUrl, logoCorner } = params;
  if (itemMediaUrls.length === 0) return null;

  let imgs: HTMLImageElement[];
  let logoImg: HTMLImageElement | null;
  try {
    imgs = await Promise.all(itemMediaUrls.map(loadImage));
    logoImg = logoUrl ? await loadImage(logoUrl) : null;
  } catch {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS;
  canvas.height = CANVAS;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  if (typeof ctx.roundRect !== "function") {
    return null;
  }

  const n = totalCount;
  const showExtra = n > 4;
  const extra = n - 4;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, CANVAS, CANVAS, OUTER_R);
  ctx.clip();
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CANVAS, CANVAS);

  if (itemMediaUrls.length === 1 && n === 1) {
    const img = imgs[0]!;
    ctx.save();
    clipRoundRect(ctx, 0, 0, CANVAS, CANVAS, OUTER_R);
    drawImageCover(ctx, img, 0, 0, CANVAS, CANVAS);
    ctx.restore();
  } else {
    const P = PAD_MULTI;
    const W = CANVAS - 2 * P;
    const H = CANVAS - 2 * P;
    const m = itemMediaUrls.length;

    if (m === 2) {
      const cw = (W - GAP) / 2;
      const ch = H;
      drawCell(ctx, imgs[0]!, P, P, cw, ch);
      drawCell(ctx, imgs[1]!, P + cw + GAP, P, cw, ch);
    } else if (m === 3) {
      const cw = (W - GAP) / 2;
      const ch2 = (H - GAP) / 2;
      drawCell(ctx, imgs[0]!, P, P, cw, H);
      drawCell(ctx, imgs[1]!, P + cw + GAP, P, cw, ch2);
      drawCell(ctx, imgs[2]!, P + cw + GAP, P + ch2 + GAP, cw, ch2);
    } else {
      const cw = (W - GAP) / 2;
      const ch = (H - GAP) / 2;
      const positions: [number, number][] = [
        [P, P],
        [P + cw + GAP, P],
        [P, P + ch + GAP],
        [P + cw + GAP, P + ch + GAP],
      ];
      for (let i = 0; i < 4; i++) {
        const img = imgs[i];
        if (!img) break;
        const [x, y] = positions[i]!;
        drawCell(ctx, img, x, y, cw, ch);
        if (showExtra && i === 3) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, y, cw, ch, CELL_R);
          ctx.clip();
          ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
          ctx.fillRect(x, y, cw, ch);
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${Math.round(ch * 0.22)}px system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`+${extra}`, x + cw / 2, y + ch / 2);
          ctx.restore();
        }
      }
    }
  }

  ctx.restore();

  if (logoImg) {
    drawLogo(ctx, logoImg, logoCorner);
  }

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png", 0.92);
  });
}
