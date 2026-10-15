import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { renderWebImage } from "./web-image.ts";

const raster = (width: number, height: number) =>
  sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 40, g: 16, b: 12 },
    },
  })
    .png()
    .toBuffer();

describe("renderWebImage", () => {
  it("fits inside the web box without cropping or enlarging", async () => {
    const wide = await renderWebImage(await raster(8, 4), { maxEdge: 4 });
    const wideMeta = await sharp(wide).metadata();
    expect(wideMeta.format).toBe("webp");
    expect(wideMeta.width).toBe(4);
    expect(wideMeta.height).toBe(2);

    const small = await renderWebImage(await raster(2, 2), { maxEdge: 4 });
    const smallMeta = await sharp(small).metadata();
    expect(smallMeta.width).toBe(2);
    expect(smallMeta.height).toBe(2);
  });
});
