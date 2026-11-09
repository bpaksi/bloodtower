import sharp from "sharp";

/** Decoded pixels, 4 channels (RGBA), row by row. */
export interface Raster {
  width: number;
  height: number;
  data: Uint8Array;
}

export interface Anchor {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Decodes an image file. Throws on a file sharp cannot read; callers report that. */
export const readRaster = async (file: string): Promise<Raster> => {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data: new Uint8Array(data) };
};

/** DEC-207: the anchor box sits fully inside the portrait (fractions, positive size). */
export const anchorInBounds = (a: Anchor): boolean =>
  [a.x, a.y, a.w, a.h].every(Number.isFinite) &&
  a.x >= 0 &&
  a.y >= 0 &&
  a.w > 0 &&
  a.h > 0 &&
  a.x + a.w <= 1 &&
  a.y + a.h <= 1;

/** The anchor box in whole pixels, rounded outward so a box edge never splits a pixel. */
export const anchorPixels = (a: Anchor, width: number, height: number) => ({
  x0: Math.floor(a.x * width),
  y0: Math.floor(a.y * height),
  x1: Math.min(width, Math.ceil((a.x + a.w) * width)),
  y1: Math.min(height, Math.ceil((a.y + a.h) * height)),
});

/** Pixels that differ between two same-size rasters outside the anchor box. */
export const outsideAnchorChanges = (portrait: Raster, frame: Raster, anchor: Anchor): number => {
  const { x0, y0, x1, y1 } = anchorPixels(anchor, portrait.width, portrait.height);
  let changed = 0;
  for (let y = 0; y < portrait.height; y++) {
    for (let x = 0; x < portrait.width; x++) {
      if (x >= x0 && x < x1 && y >= y0 && y < y1) continue;
      const i = (y * portrait.width + x) * 4;
      if (
        portrait.data[i] !== frame.data[i] ||
        portrait.data[i + 1] !== frame.data[i + 1] ||
        portrait.data[i + 2] !== frame.data[i + 2] ||
        portrait.data[i + 3] !== frame.data[i + 3]
      ) {
        changed++;
      }
    }
  }
  return changed;
};

const luma = (d: Uint8Array, i: number) =>
  0.2126 * (d[i] as number) + 0.7152 * (d[i + 1] as number) + 0.0722 * (d[i + 2] as number);

/** Edge band width as a share of each side, and the most the band may be of the centre. */
export const EDGE_BAND = 0.04;
export const EDGE_MAX_RATIO = 0.6;

/**
 * Mean brightness of the outer band over the mean of the middle half. A recipe check (D9): a
 * black vignette passes and a reversed one fails; it does not prove every artistic edge.
 */
export const edgeRatio = (r: Raster): number => {
  const bx = Math.max(1, Math.round(r.width * EDGE_BAND));
  const by = Math.max(1, Math.round(r.height * EDGE_BAND));
  let edge = 0;
  let edgeN = 0;
  let mid = 0;
  let midN = 0;
  for (let y = 0; y < r.height; y++) {
    for (let x = 0; x < r.width; x++) {
      const i = (y * r.width + x) * 4;
      if (x < bx || x >= r.width - bx || y < by || y >= r.height - by) {
        edge += luma(r.data, i);
        edgeN++;
      } else if (
        x >= r.width / 4 &&
        x < (r.width * 3) / 4 &&
        y >= r.height / 4 &&
        y < (r.height * 3) / 4
      ) {
        mid += luma(r.data, i);
        midN++;
      }
    }
  }
  if (edgeN === 0 || midN === 0 || mid === 0) return Number.POSITIVE_INFINITY;
  return edge / edgeN / (mid / midN);
};

/** Every pixel has equal red, green and blue (a mask carries brightness only). */
export const isGrayscale = (r: Raster): boolean => {
  for (let i = 0; i < r.data.length; i += 4) {
    if (r.data[i] !== r.data[i + 1] || r.data[i] !== r.data[i + 2]) return false;
  }
  return true;
};
