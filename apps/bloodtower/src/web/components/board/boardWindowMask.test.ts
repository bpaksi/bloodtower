import { describe, expect, it } from "vitest";
import { BOARD_WINDOW_MASK_URL, WINDOW_GLOWS } from "./boardWindowMask.ts";

describe("boardWindowMask", () => {
  it("names the mask under /landing/window-mask/", () => {
    expect(BOARD_WINDOW_MASK_URL).toBe("/landing/window-mask/window-mask.png");
  });

  it("has glow groups a to d, each with its own PNG under /landing/window-mask/", () => {
    expect(WINDOW_GLOWS.map((g) => g.group)).toEqual(["a", "b", "c", "d"]);
    for (const g of WINDOW_GLOWS) {
      expect(g.url).toBe(`/landing/window-mask/window-glow-${g.group}.png`);
    }
  });

  it("gives every group its own duration, and no delay is positive", () => {
    expect(new Set(WINDOW_GLOWS.map((g) => g.durationS)).size).toBe(4);
    for (const g of WINDOW_GLOWS) expect(g.delayS).toBeLessThanOrEqual(0);
  });
});
