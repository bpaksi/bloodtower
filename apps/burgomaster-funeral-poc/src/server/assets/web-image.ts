import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, extname } from "node:path";
import sharp from "sharp";

/**
 * Longest side shipped to a browser. Not an art size: smaller files stay as they are,
 * and nothing is cropped or enlarged. D6: the pixels in the file are not a contract.
 */
export const WEB_LONG_EDGE = 1920;

const RASTER = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export const isRasterImage = (filePath: string): boolean =>
  RASTER.has(extname(filePath).toLowerCase());

/**
 * WebP that fits inside a square of `maxEdge`, keeping the file's own aspect.
 * `maxEdge` defaults to {@link WEB_LONG_EDGE}. The source buffer is not modified.
 */
export const renderWebImage = async (
  source: Buffer,
  options?: { maxEdge?: number },
): Promise<Buffer> => {
  const maxEdge = options?.maxEdge ?? WEB_LONG_EDGE;
  return sharp(source, { failOn: "none" })
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 75 })
    .toBuffer();
};

const inflight = new Map<string, Promise<string>>();

/** Writes a cached derivative next to `cachePath`. A second caller waits for the first. */
export const cachedWebImage = async (sourcePath: string, cachePath: string): Promise<string> => {
  const pending = inflight.get(cachePath);
  if (pending) return pending;
  const job = (async () => {
    const sourceStat = await stat(sourcePath);
    const cached = await stat(cachePath).catch(() => undefined);
    if (cached?.isFile() && cached.mtimeMs >= sourceStat.mtimeMs && cached.size > 0) {
      return cachePath;
    }
    const webp = await renderWebImage(await readFile(sourcePath));
    await mkdir(dirname(cachePath), { recursive: true });
    await writeFile(cachePath, webp);
    return cachePath;
  })().finally(() => {
    inflight.delete(cachePath);
  });
  inflight.set(cachePath, job);
  return job;
};
