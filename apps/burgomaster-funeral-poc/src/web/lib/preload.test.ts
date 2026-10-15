import { describe, expect, it } from "vitest";
import { isPreloadList, preloadScene } from "./preload.ts";

describe("preloadScene", () => {
  it("shows loading while every listed asset is fetched, then ready", async () => {
    const phases: string[] = [];
    const loaded: string[] = [];
    let sawLoadingDuringLoad = false;
    const result = await preloadScene(
      async () => [{ url: "/assets/portraits/agnes.png", kind: "image" }],
      async (asset) => {
        sawLoadingDuringLoad = phases.includes("loading") && !phases.includes("ready");
        loaded.push(asset.url);
      },
      (phase) => {
        phases.push(phase);
      },
    );
    expect(phases[0]).toBe("loading");
    expect(sawLoadingDuringLoad).toBe(true);
    expect(loaded).toEqual(["/assets/portraits/agnes.png"]);
    expect(phases.at(-1)).toBe("ready");
    expect(result).toBe("ready");
  });

  it("reaches ready when a file fails to load", async () => {
    const phases: string[] = [];
    const result = await preloadScene(
      async () => [{ url: "/missing.png", kind: "image" }],
      async () => {
        throw new Error("missing");
      },
      (phase) => {
        phases.push(phase);
      },
    );
    expect(phases).toEqual(["loading", "ready"]);
    expect(result).toBe("ready");
  });
});

describe("isPreloadList", () => {
  it("accepts image and audio urls only", () => {
    expect(isPreloadList({ assets: [{ url: "/a.png", kind: "image" }] })).toBe(true);
    expect(isPreloadList({ assets: [{ url: "/a.wav", kind: "audio" }] })).toBe(true);
    expect(isPreloadList({ assets: [] })).toBe(true);
    expect(isPreloadList({ assets: [{ url: "/a.mp4", kind: "video" }] })).toBe(false);
    expect(isPreloadList(null)).toBe(false);
  });
});
