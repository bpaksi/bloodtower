import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import sharp from "sharp";
import type { PackIndex, PackIndexEntry } from "./indexSchema.ts";

export type Pixel = [number, number, number, number?];

/** Writes a generated PNG. Fixtures are made here, never committed art. */
export const writeImage = async (
  file: string,
  width: number,
  height: number,
  pixel: (x: number, y: number) => Pixel,
): Promise<void> => {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a = 255] = pixel(x, y);
      data.set([r, g, b, a], (y * width + x) * 4);
    }
  }
  mkdirSync(dirname(file), { recursive: true });
  await sharp(data, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(file);
};

/** The known black-vignette recipe (D9): brightness falls to 40% at the border. */
export const vignette =
  (width: number, height: number, centre = 200) =>
  (x: number, y: number): Pixel => {
    const n = Math.max(Math.abs((2 * x) / (width - 1) - 1), Math.abs((2 * y) / (height - 1) - 1));
    const v = Math.round(centre * (1 - 0.6 * n * n));
    return [v, v, v];
  };

/** The deliberate inverse: dark in the middle, bright at the border. */
export const unvignetted =
  (width: number, height: number, centre = 200) =>
  (x: number, y: number): Pixel => {
    const v = vignette(width, height, centre)(x, y)[0];
    return [centre + 40 - v + 0, centre + 40 - v, centre + 40 - v].map((c) =>
      Math.min(255, c),
    ) as Pixel;
  };

export const tempRoot = (label: string): string => mkdtempSync(join(tmpdir(), `bt-lint-${label}-`));

export const entry = (kind: string, over: Partial<PackIndexEntry> = {}): PackIndexEntry => ({
  kind,
  file: `${kind}.png`,
  size: { width: 3840, height: 2160 },
  captions: [],
  status: "final",
  ...over,
});

export const indexOf = (
  assets: Record<string, PackIndexEntry>,
  avatar?: PackIndex["avatar"],
): PackIndex => ({
  assets,
  ...(avatar ? { avatar } : {}),
});
