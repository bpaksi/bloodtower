import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyEase,
  type CameraFrame,
  type CameraTrack,
  estimateSpeechDurationSeconds,
  frameAtTime,
  frameToTransform,
  regionFromTransform,
  STILL_ASPECT_DEFAULT,
  visibleRegion,
} from "./cameraTrack.ts";

const packCameraDir = new URL("../../../../../packs/test/camera/", import.meta.url);

/** Every cue frame in the test pack's camera sidecars, labelled for failure messages. */
const packFrames: { label: string; frame: CameraFrame }[] = readdirSync(packCameraDir)
  .filter((name) => name.endsWith(".json"))
  .flatMap((name) => {
    const parsed = JSON.parse(readFileSync(new URL(name, packCameraDir), "utf8")) as CameraTrack;
    return parsed.cues.flatMap((cue, index) => [
      { label: `${parsed.id} cue ${index} from`, frame: cue.from },
      { label: `${parsed.id} cue ${index} to`, frame: cue.to },
    ]);
  });

/** Well shapes the board can take: wide, the usual desktop well, 16:9, square, tall. */
const containerAspects = [21 / 9, 1.37, STILL_ASPECT_DEFAULT, 1, 9 / 16];
const EPSILON = 1e-9;

/** How the view's span on one axis relates to the cue's span on that axis. */
const axisFit = (
  viewCenter: number,
  viewSize: number,
  cueCenter: number,
  cueSize: number,
): "contains" | "inside" | "outside" => {
  const [viewMin, viewMax] = [viewCenter - viewSize / 2, viewCenter + viewSize / 2];
  const [cueMin, cueMax] = [cueCenter - cueSize / 2, cueCenter + cueSize / 2];
  if (viewMin <= cueMin + EPSILON && viewMax >= cueMax - EPSILON) return "contains";
  if (viewMin >= cueMin - EPSILON && viewMax <= cueMax + EPSILON) return "inside";
  return "outside";
};

const track: CameraTrack = {
  id: "grey-stair.01",
  still: "fx-stair.png",
  cues: [
    {
      start: 0,
      end: 10,
      from: { x: 0.5, y: 0.5, w: 1, h: 1 },
      to: { x: 0.4, y: 0.4, w: 0.5, h: 0.5 },
      ease: "ease-in-out",
    },
  ],
};

const gapTrack: CameraTrack = {
  id: "gap",
  still: "fx-stair.png",
  cues: [
    {
      start: 0,
      end: 2,
      from: { x: 0.5, y: 0.5, w: 1, h: 1 },
      to: { x: 0.3, y: 0.3, w: 0.6, h: 0.6 },
      ease: "ease-in-out",
    },
    {
      start: 5,
      end: 8,
      from: { x: 0.8, y: 0.8, w: 0.4, h: 0.4 },
      to: { x: 0.7, y: 0.7, w: 0.35, h: 0.35 },
      ease: "ease-in-out",
    },
  ],
};

const expectFrameClose = (actual: CameraFrame, expected: CameraFrame) => {
  expect(actual.x).toBeCloseTo(expected.x, 5);
  expect(actual.y).toBeCloseTo(expected.y, 5);
  expect(actual.w).toBeCloseTo(expected.w, 5);
  expect(actual.h).toBeCloseTo(expected.h, 5);
};

describe("visibleRegion", () => {
  it("covers every test pack cue", () => {
    expect(packFrames.length).toBeGreaterThanOrEqual(8);
  });

  for (const aspect of containerAspects) {
    for (const { label, frame } of packFrames) {
      it(`frames ${label} with no stretch or bars in a ${aspect.toFixed(2)} well`, () => {
        const region = visibleRegion(frame, aspect, STILL_ASPECT_DEFAULT);
        // Uniform scale: the region in pixels has the well's aspect, so the still is not stretched.
        expect((region.w * STILL_ASPECT_DEFAULT) / region.h).toBeCloseTo(aspect, 9);
        // No bars: the region never leaves the still.
        expect(region.x - region.w / 2).toBeGreaterThanOrEqual(-EPSILON);
        expect(region.x + region.w / 2).toBeLessThanOrEqual(1 + EPSILON);
        expect(region.y - region.h / 2).toBeGreaterThanOrEqual(-EPSILON);
        expect(region.y + region.h / 2).toBeLessThanOrEqual(1 + EPSILON);
        // On each axis the view holds the cue's whole extent or, when the cue is wider (taller)
        // than the well allows without bars, sits inside it; on at least one axis it holds it.
        const x = axisFit(region.x, region.w, frame.x, frame.w);
        const y = axisFit(region.y, region.h, frame.y, frame.h);
        expect(x).not.toBe("outside");
        expect(y).not.toBe("outside");
        expect([x, y]).toContain("contains");
      });
    }
  }

  it("shows exactly the cue rect when it matches the well's aspect", () => {
    const frame = { x: 0.4, y: 0.45, w: 0.5, h: 0.5 };
    expectFrameClose(visibleRegion(frame, STILL_ASPECT_DEFAULT, STILL_ASPECT_DEFAULT), frame);
  });

  it("zooms in on a tight cue and centres it", () => {
    const frame = { x: 0.5, y: 0.63, w: 0.42, h: 0.28 };
    const region = visibleRegion(frame, 1.37, STILL_ASPECT_DEFAULT);
    expect(region.x).toBeCloseTo(0.5, 9);
    expect(region.y).toBeCloseTo(0.63, 9);
    expect(region.w).toBeLessThan(0.5);
  });

  it("falls back to cover for the full still in a non-16:9 well", () => {
    const full = { x: 0.5, y: 0.5, w: 1, h: 1 };
    expectFrameClose(visibleRegion(full, 1, STILL_ASPECT_DEFAULT), {
      x: 0.5,
      y: 0.5,
      w: 1 / STILL_ASPECT_DEFAULT,
      h: 1,
    });
    expectFrameClose(visibleRegion(full, 21 / 9, STILL_ASPECT_DEFAULT), {
      x: 0.5,
      y: 0.5,
      w: 1,
      h: STILL_ASPECT_DEFAULT / (21 / 9),
    });
  });

  it("slides the view in from the edge instead of showing past it", () => {
    const corner = { x: 0.1, y: 0.9, w: 0.2, h: 0.2 };
    const region = visibleRegion(corner, 1, STILL_ASPECT_DEFAULT);
    expect(region.x - region.w / 2).toBeCloseTo(0, 9);
    expect(region.y + region.h / 2).toBeCloseTo(1, 9);
  });
});

describe("cameraTrack", () => {
  it("advances within a single cue over time", () => {
    const atStart = frameToTransform(frameAtTime(track, 0.5), STILL_ASPECT_DEFAULT);
    const midCue = frameToTransform(frameAtTime(track, 5), STILL_ASPECT_DEFAULT);
    expect(atStart).not.toBe(midCue);
  });

  it("holds the last framing after the final cue", () => {
    const end = frameAtTime(track, 20);
    expect(end).toEqual(track.cues[0]?.to);
  });

  it("holds the previous cue to across a gap", () => {
    expect(frameAtTime(gapTrack, 3)).toEqual(gapTrack.cues[0]?.to);
    expect(frameAtTime(gapTrack, 3)).not.toEqual(gapTrack.cues[1]?.from);
  });

  it("emits one uniform scale that decodes back to the visible region", () => {
    for (const aspect of containerAspects) {
      for (const { frame } of packFrames) {
        const transform = frameToTransform(frame, aspect, STILL_ASPECT_DEFAULT);
        expect(transform).toMatch(/scale\([-\d.e]+\)$/);
        expectFrameClose(
          regionFromTransform(transform, aspect, STILL_ASPECT_DEFAULT),
          visibleRegion(frame, aspect, STILL_ASPECT_DEFAULT),
        );
      }
    }
  });

  it("uses a neutral transform at the full still frame in a 16:9 well", () => {
    const full = { x: 0.5, y: 0.5, w: 1, h: 1 };
    const transform = frameToTransform(full, STILL_ASPECT_DEFAULT, STILL_ASPECT_DEFAULT);
    const region = regionFromTransform(transform, STILL_ASPECT_DEFAULT, STILL_ASPECT_DEFAULT);
    expect(transform).toMatch(/scale\(1\)$/);
    expectFrameClose(region, full);
  });

  it("estimates speech duration from words and pause tags", () => {
    expect(
      estimateSpeechDurationSeconds(
        "A grey stair climbs into the dark. [pause 1] Someone has left the lamps unlit.",
      ),
    ).toBeCloseTo(1 + 13 / 2.5, 1);
  });

  it("uses ease-in-out by default", () => {
    expect(applyEase(0, undefined)).toBe(0);
    expect(applyEase(1, undefined)).toBe(1);
    expect(applyEase(0.5, undefined)).toBeCloseTo(0.5, 1);
  });

  it("maps reduced-motion end framing to the last cue to frame", () => {
    const end = frameAtTime(track, Number.POSITIVE_INFINITY);
    const last = track.cues[0]?.to;
    expect(last).toBeDefined();
    if (!last) return;
    expect(frameToTransform(end, 1)).toBe(frameToTransform(last, 1));
  });
});
