/**
 * Client-side collage generator: combine multiple images into one with frame-style
 * layouts and mandatory white borders for strong visual impact.
 * Layouts match common frame styles: 2-up vertical/side-by-side, 3-up (1 large + 2),
 * 4-up 2x2 or asymmetric, 5-up (2 top + 3 bottom), 6+ grid or stacked.
 */

/** Border width as fraction of canvas (0.04 = 4%) — mandatory for visual impact. */
const B = 0.04;
const CANVAS_SIZE = 1200;
/** Drawn stroke width in pixels around each frame (always visible). */
const BORDER_STROKE_PX = 8;

type Slot = [number, number, number, number]; // x, y, w, h in 0..1

/** Outer padding from canvas edge (same as border for consistent frame look). */
const PAD = B;

/**
 * Helper: slot for a grid cell (row, col) in (totalRows x totalCols) with gaps B.
 * All dimensions in 0..1.
 */
function gridSlot(
  row: number,
  col: number,
  totalRows: number,
  totalCols: number
): Slot {
  const innerW = 1 - 2 * PAD;
  const innerH = 1 - 2 * PAD;
  const gapH = (totalCols - 1) * B;
  const gapV = (totalRows - 1) * B;
  const cellW = (innerW - gapH) / totalCols;
  const cellH = (innerH - gapV) / totalRows;
  const x = PAD + col * (cellW + B);
  const y = PAD + row * (cellH + B);
  return [x, y, cellW, cellH];
}

/** 2 images: vertical stack (two rows). */
function layout2(): Slot[] {
  const h = (1 - 2 * PAD - B) / 2;
  return [
    [PAD, PAD, 1 - 2 * PAD, h],
    [PAD, PAD + h + B, 1 - 2 * PAD, h],
  ];
}

/** 3 images: one large top, two smaller bottom. */
function layout3(): Slot[] {
  const topH = (1 - 2 * PAD) * (2 / 3) - B / 2;
  const bottomH = (1 - 2 * PAD) / 3 - B / 2;
  const bottomW = (1 - 2 * PAD - B) / 2;
  return [
    [PAD, PAD, 1 - 2 * PAD, topH],
    [PAD, PAD + topH + B, bottomW, bottomH],
    [PAD + bottomW + B, PAD + topH + B, bottomW, bottomH],
  ];
}

/** 4 images: 2x2 grid with borders. */
function layout4(): Slot[] {
  return [
    gridSlot(0, 0, 2, 2),
    gridSlot(0, 1, 2, 2),
    gridSlot(1, 0, 2, 2),
    gridSlot(1, 1, 2, 2),
  ];
}

/** 5 images: 2 top + 3 bottom. */
function layout5(): Slot[] {
  const rowH = (1 - 2 * PAD - B) / 2;
  const topW = (1 - 2 * PAD - B) / 2;
  const bottomW = (1 - 2 * PAD - 2 * B) / 3;
  return [
    [PAD, PAD, topW, rowH],
    [PAD + topW + B, PAD, topW, rowH],
    [PAD, PAD + rowH + B, bottomW, rowH],
    [PAD + bottomW + B, PAD + rowH + B, bottomW, rowH],
    [PAD + 2 * (bottomW + B), PAD + rowH + B, bottomW, rowH],
  ];
}

/** 6 images: 2 rows x 3 columns. */
function layout6(): Slot[] {
  return [
    gridSlot(0, 0, 2, 3),
    gridSlot(0, 1, 2, 3),
    gridSlot(0, 2, 2, 3),
    gridSlot(1, 0, 2, 3),
    gridSlot(1, 1, 2, 3),
    gridSlot(1, 2, 2, 3),
  ];
}

/** 7 images: 3 top + 4 bottom (or 2+2+3). Use 3 top + 4 bottom. */
function layout7(): Slot[] {
  const topRowH = (1 - 2 * PAD - B) * (3 / 7);
  const bottomRowH = (1 - 2 * PAD - B) * (4 / 7) - B;
  const topW = (1 - 2 * PAD - 2 * B) / 3;
  const bottomW = (1 - 2 * PAD - 3 * B) / 4;
  const slots: Slot[] = [];
  for (let col = 0; col < 3; col++) {
    slots.push([
      PAD + col * (topW + B),
      PAD,
      topW,
      topRowH,
    ]);
  }
  for (let col = 0; col < 4; col++) {
    slots.push([
      PAD + col * (bottomW + B),
      PAD + topRowH + B,
      bottomW,
      bottomRowH,
    ]);
  }
  return slots;
}

/** 8 images: 2 rows x 4 columns. */
function layout8(): Slot[] {
  return [
    gridSlot(0, 0, 2, 4),
    gridSlot(0, 1, 2, 4),
    gridSlot(0, 2, 2, 4),
    gridSlot(0, 3, 2, 4),
    gridSlot(1, 0, 2, 4),
    gridSlot(1, 1, 2, 4),
    gridSlot(1, 2, 2, 4),
    gridSlot(1, 3, 2, 4),
  ];
}

/** 9+ images: 3x3 grid for 9, then extend with more rows/columns. */
function layout9Plus(count: number): Slot[] {
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const slots: Slot[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    slots.push(gridSlot(row, col, rows, cols));
  }
  return slots;
}

function getLayout(count: number): Slot[] {
  if (count <= 1) return [];
  const n = Math.min(count, 9);
  const layouts: { [k: number]: Slot[] } = {
    2: layout2(),
    3: layout3(),
    4: layout4(),
    5: layout5(),
    6: layout6(),
    7: layout7(),
    8: layout8(),
    9: layout9Plus(9),
  };
  const layout = count <= 9 ? layouts[count as keyof typeof layouts] : layout9Plus(count);
  return layout.slice(0, count);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src.startsWith("http") ? src : `${typeof window !== "undefined" ? window.location.origin : ""}${src}`;
  });
}

/**
 * Draw one image into a slot (cover fit, centered). Slot has mandatory border
 * around it; we draw the image inside the slot area.
 */
function drawImageInSlot(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  slot: Slot
) {
  const [sx, sy, sw, sh] = slot;
  const x = sx * CANVAS_SIZE;
  const y = sy * CANVAS_SIZE;
  const w = sw * CANVAS_SIZE;
  const h = sh * CANVAS_SIZE;

  const imgAspect = img.width / img.height;
  const slotAspect = w / h;
  let drawW = w;
  let drawH = h;
  let drawX = x;
  let drawY = y;
  if (imgAspect > slotAspect) {
    drawW = w;
    drawH = w / imgAspect;
    drawY = y + (h - drawH) / 2;
  } else {
    drawH = h;
    drawW = h * imgAspect;
    drawX = x + (w - drawW) / 2;
  }
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

/**
 * Draw a visible border (stroke) around a slot so every image has a clear frame.
 * Uses a light gray stroke so the border is visible on both light and dark images.
 */
function drawSlotBorder(ctx: CanvasRenderingContext2D, slot: Slot) {
  const [sx, sy, sw, sh] = slot;
  const x = sx * CANVAS_SIZE;
  const y = sy * CANVAS_SIZE;
  const w = sw * CANVAS_SIZE;
  const h = sh * CANVAS_SIZE;
  ctx.save();
  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = BORDER_STROKE_PX;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

/**
 * Draw outer frame around the entire collage.
 */
function drawOuterBorder(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.strokeStyle = "#d0d0d0";
  ctx.lineWidth = BORDER_STROKE_PX * 1.5;
  ctx.strokeRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.restore();
}

/**
 * Build a collage from image URLs and return a PNG blob. Uses frame-style
 * layouts with mandatory white borders for strong visual impact.
 */
export async function buildCollageBlob(imageUrls: string[]): Promise<Blob> {
  if (imageUrls.length < 2) throw new Error("At least 2 images required for collage");
  const layout = getLayout(imageUrls.length);
  const images = await Promise.all(imageUrls.map(loadImage));
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  // White background (mandatory for frame-style visual impact)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  // Draw images in each slot
  layout.forEach((slot, i) => {
    if (images[i]) drawImageInSlot(ctx, images[i], slot);
  });
  // Draw visible borders around every slot and outer frame (mandatory for all layouts)
  layout.forEach((slot) => drawSlotBorder(ctx, slot));
  drawOuterBorder(ctx);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/png",
      0.92
    );
  });
}
