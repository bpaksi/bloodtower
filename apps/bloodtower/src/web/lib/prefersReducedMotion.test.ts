import { afterEach, describe, expect, it, vi } from "vitest";
import { prefersReducedMotion } from "./cameraTrack.ts";

describe("prefersReducedMotion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads prefers-reduced-motion: reduce from matchMedia", () => {
    vi.stubGlobal("window", {
      matchMedia: (query: string) => ({
        matches: query.includes("reduce"),
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    });
    expect(prefersReducedMotion()).toBe(true);
  });

  it("returns false when reduce is not requested", () => {
    vi.stubGlobal("window", {
      matchMedia: () => ({
        matches: false,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    });
    expect(prefersReducedMotion()).toBe(false);
  });
});
