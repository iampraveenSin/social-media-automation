/**
 * Server-side collage: combine multiple image buffers into one PNG (same layouts as client).
 * Used by recurrence auto-post when multiple images are chosen for one post.
 */

import sharp from "sharp";

const B = 0.04;
const CANVAS_SIZE = 1200;
const PAD = B;

type Slot = [number, number, number, number]; // x, y, w, h in 0..1

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

function layout2(): Slot[] {
  const h = (1 - 2 * PAD - B) / 2;
  return [
    [PAD, PAD, 1 - 2 * PAD, h],
    [PAD, PAD + h + B, 1 - 2 * PAD, h],
  ];
}

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

function layout4(): Slot[] {
  return [
    gridSlot(0, 0, 2, 2),
    gridSlot(0, 1, 2, 2),
    gridSlot(1, 0, 2, 2),
    gridSlot(1, 1, 2, 2),
  ];
}

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

function layout7(): Slot[] {
  const topRowH = (1 - 2 * PAD - B) * (3 / 7);
  const bottomRowH = (1 - 2 * PAD - B) * (4 / 7) - B;
  const topW = (1 - 2 * PAD - 2 * B) / 3;
  const bottomW = (1 - 2 * PAD - 3 * B) / 4;
  const slots: Slot[] = [];
  for (let col = 0; col < 3; col++) {
    slots.push([PAD + col * (topW + B), PAD, topW, topRowH]);
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
  const layout =
    count <= 9 ? layouts[count as keyof typeof layouts] : layout9Plus(count);
  return layout.slice(0, count);
}

/**
 * Build a collage from image buffers and return a PNG buffer. Same layouts as client.
 * Requires at least 2 image buffers.
 */
export async function buildCollageBuffer(
  imageBuffers: Buffer[]
): Promise<Buffer> {
  if (imageBuffers.length < 2) {
    throw new Error("At least 2 images required for collage");
  }
  const layout = getLayout(imageBuffers.length);
  const composites: { input: Buffer; left: number; top: number }[] = [];

  for (let i = 0; i < layout.length && i < imageBuffers.length; i++) {
    const [sx, sy, sw, sh] = layout[i];
    const pw = Math.round(sw * CANVAS_SIZE);
    const ph = Math.round(sh * CANVAS_SIZE);
    const px = Math.round(sx * CANVAS_SIZE);
    const py = Math.round(sy * CANVAS_SIZE);

    const meta = await sharp(imageBuffers[i]).metadata();
    const imgW = meta.width ?? 1;
    const imgH = meta.height ?? 1;
    const slotAspect = pw / ph;
    const imgAspect = imgW / imgH;
    let drawW = pw;
    let drawH = ph;
    if (imgAspect > slotAspect) {
      drawH = Math.round(pw / imgAspect);
    } else {
      drawW = Math.round(ph * imgAspect);
    }
    const left = px + Math.round((pw - drawW) / 2);
    const top = py + Math.round((ph - drawH) / 2);

    const resized = await sharp(imageBuffers[i])
      .resize(drawW, drawH, { fit: "cover" })
      .toBuffer();
    composites.push({ input: resized, left, top });
  }

  const base = await sharp({
    create: {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .png()
    .composite(composites)
    .toBuffer();

  return base;
}
