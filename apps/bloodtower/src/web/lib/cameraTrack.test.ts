import { describe, expect, it } from "vitest";
import {
  applyEase,
  type CameraTrack,
  coverVisibleFraction,
  estimateSpeechDurationSeconds,
  frameAtTime,
  frameToTransform,
  STILL_ASPECT_DEFAULT,
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

  it("maps still-space frames differently for non-16:9 containers", () => {
    const frame = { x: 0.5, y: 0.63, w: 0.42, h: 0.28 };
    const square = frameToTransform(frame, 1, STILL_ASPECT_DEFAULT);
    const wide = frameToTransform(frame, 16 / 9, STILL_ASPECT_DEFAULT);
    expect(square).not.toBe(wide);
  });

  it("uses cover baseline at the default full frame", () => {
    const cover = coverVisibleFraction(1, STILL_ASPECT_DEFAULT);
    const identity = frameToTransform(cover, 1, STILL_ASPECT_DEFAULT);
    expect(identity).toContain("scale(1");
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
