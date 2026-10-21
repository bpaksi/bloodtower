import { describe, expect, it } from "vitest";
import { frameSize, scaledPx, tvPx } from "./tv.ts";

describe("tv scaling", () => {
  it("keeps design size at 1080p and doubles at 4K", () => {
    expect(scaledPx(28, 1920)).toBe(28);
    expect(scaledPx(28, 3840)).toBe(56);
    expect(scaledPx(28, 1440)).toBe(21);
  });

  it("fits a 16:9 frame in any viewport", () => {
    expect(frameSize(1920, 1080)).toEqual({ width: 1920, height: 1080 });
    expect(frameSize(3840, 2160)).toEqual({ width: 3840, height: 2160 });
    expect(frameSize(1440, 900)).toEqual({ width: 1440, height: 810 });
    expect(frameSize(1000, 400)).toEqual({ width: (400 * 16) / 9, height: 400 });
  });

  it("writes lengths that follow the frame", () => {
    expect(tvPx(28)).toBe("calc(28 * var(--tv-px))");
  });
});
