import { describe, expect, it } from "vitest";
import {
  applyEase,
  type CameraFrame,
  type CameraTrack,
  coverVisibleFraction,
  estimateSpeechDurationSeconds,
  frameAtTime,
  frameToTransform,
  STILL_ASPECT_DEFAULT,
  stillFrameFromTransform,
} from "./cameraTrack.ts";

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

describe("coverVisibleFraction", () => {
  const rs = STILL_ASPECT_DEFAULT;

  it("crops height on a wide container (21:9)", () => {
    expect(coverVisibleFraction(21 / 9, rs)).toEqual({
      x: 0.5,
      y: 0.5,
      w: 1,
      h: rs / (21 / 9),
    });
  });

  it("crops width on a square container", () => {
    expect(coverVisibleFraction(1, rs)).toEqual({
      x: 0.5,
      y: 0.5,
      w: 1 / rs,
      h: 1,
    });
  });

  it("crops width on a tall container (9:16)", () => {
    expect(coverVisibleFraction(9 / 16, rs)).toEqual({
      x: 0.5,
      y: 0.5,
      w: 9 / 16 / rs,
      h: 1,
    });
  });

  it("shows the full still on a 16:9 container", () => {
    expect(coverVisibleFraction(rs, rs)).toEqual({ x: 0.5, y: 0.5, w: 1, h: 1 });
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

  it("round-trips a crop on a 16:9 container", () => {
    const frame = { x: 0.5, y: 0.5, w: 0.5, h: 0.5 };
    const transform = frameToTransform(frame, STILL_ASPECT_DEFAULT, STILL_ASPECT_DEFAULT);
    expectFrameClose(
      stillFrameFromTransform(transform, STILL_ASPECT_DEFAULT, STILL_ASPECT_DEFAULT),
      frame,
    );
  });

  it("maps a track rect to the same still-space region across container aspects", () => {
    const frame = { x: 0.5, y: 0.63, w: 0.42, h: 0.28 };
    const aspects = [21 / 9, 1, 9 / 16, STILL_ASPECT_DEFAULT];
    const crops = aspects.map((aspect) =>
      stillFrameFromTransform(frameToTransform(frame, aspect, STILL_ASPECT_DEFAULT), aspect),
    );
    const first = crops[0];
    expect(first).toBeDefined();
    if (!first) return;
    for (let index = 1; index < crops.length; index++) {
      const next = crops[index];
      expect(next).toBeDefined();
      if (!next) return;
      expectFrameClose(next, first);
    }
    expectFrameClose(first, frame);
  });

  it("uses a neutral transform at the full still frame", () => {
    const full = { x: 0.5, y: 0.5, w: 1, h: 1 };
    const identity = frameToTransform(full, STILL_ASPECT_DEFAULT, STILL_ASPECT_DEFAULT);
    expect(identity).toContain("scale(1, 1)");
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
