import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { jpegBytes, pngBytes, webpBytes } from "./imageFixtures.ts";
import { isSixteenByNine, readImageSize } from "./imageSize.ts";

const dir = mkdtempSync(join(tmpdir(), "bloodtower-size-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const sizeOf = (name: string, bytes: Buffer | string) => {
  const file = join(dir, name);
  writeFileSync(file, bytes);
  return readImageSize(file);
};

describe("readImageSize", () => {
  it("reads a PNG header", () => {
    expect(sizeOf("a.png", pngBytes(1920, 1080))).toEqual({ width: 1920, height: 1080 });
  });

  it("reads a JPEG past a large EXIF block and a DHT", () => {
    expect(sizeOf("a.jpg", jpegBytes(1366, 768, 40_000))).toEqual({ width: 1366, height: 768 });
  });

  it("reads each WebP variant", () => {
    for (const kind of ["VP8X", "VP8L", "VP8 "] as const) {
      expect(sizeOf(`${kind.trim()}.webp`, webpBytes(kind, 1600, 900)), kind).toEqual({
        width: 1600,
        height: 900,
      });
    }
  });

  it("goes by the signature, not the extension", () => {
    expect(sizeOf("really-a-png.jpg", pngBytes(640, 480))).toEqual({ width: 640, height: 480 });
  });

  it("returns undefined for an unreadable header", () => {
    expect(sizeOf("junk.png", "png")).toBeUndefined();
    expect(sizeOf("empty.png", "")).toBeUndefined();
    expect(sizeOf("cut.png", pngBytes(1920, 1080).subarray(0, 20))).toBeUndefined();
    expect(sizeOf("cut.jpg", jpegBytes(1920, 1080).subarray(0, 12))).toBeUndefined();
    expect(sizeOf("zero.png", pngBytes(0, 1080))).toBeUndefined();
    expect(readImageSize(join(dir, "missing.png"))).toBeUndefined();
  });
});

describe("isSixteenByNine", () => {
  it("passes 16:9 and 1366x768, which is within 0.5%", () => {
    expect(isSixteenByNine({ width: 1920, height: 1080 })).toBe(true);
    expect(isSixteenByNine({ width: 1366, height: 768 })).toBe(true);
    expect(isSixteenByNine({ width: 3840, height: 2160 })).toBe(true);
  });

  it("fails 4:3, 16:10, square and portrait", () => {
    for (const [width, height] of [
      [1600, 1200],
      [1920, 1200],
      [1024, 1024],
      [1080, 1920],
    ] as const) {
      expect(isSixteenByNine({ width, height }), `${width}x${height}`).toBe(false);
    }
  });

  it("holds the edge at 0.5%", () => {
    expect(isSixteenByNine({ width: 1911, height: 1080 })).toBe(true); // -0.47%
    expect(isSixteenByNine({ width: 1929, height: 1080 })).toBe(true); // +0.47%
    expect(isSixteenByNine({ width: 1910, height: 1080 })).toBe(false); // -0.52%
    expect(isSixteenByNine({ width: 1930, height: 1080 })).toBe(false); // +0.52%
  });
});
