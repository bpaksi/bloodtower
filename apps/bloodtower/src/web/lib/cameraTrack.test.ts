import { describe, expect, it } from "vitest";
import {
  applyEase,
  type CameraTrack,
  estimateSpeechDurationSeconds,
  frameAtClock,
  frameAtTime,
  frameToTransform,
} from "./cameraTrack.ts";

const track: CameraTrack = {
  id: "grey-stair.01",
  still: "fx-stair.png",
  cues: [
    {
      start: 0,
      end: 4,
      from: { x: 0.5, y: 0.5, w: 1, h: 1 },
      to: { x: 0.4, y: 0.4, w: 0.5, h: 0.5 },
      ease: "ease-in-out",
    },
    {
      start: 4,
      end: 8,
      from: { x: 0.4, y: 0.4, w: 0.5, h: 0.5 },
      to: { x: 0.6, y: 0.5, w: 0.45, h: 0.45 },
      ease: "ease-in-out",
    },
  ],
};

describe("cameraTrack", () => {
  it("interpolates between cue boundaries", () => {
    const early = frameToTransform(frameAtTime(track, 1));
    const late = frameToTransform(frameAtTime(track, 6));
    expect(early).not.toBe(late);
  });

  it("holds the last framing after the final cue", () => {
    const end = frameAtTime(track, 20);
    expect(end).toEqual(track.cues[1]?.to);
  });

  it("holds end framing when speech ends before the last cue", () => {
    const mid = frameAtClock(track, 1, 100);
    const held = frameAtClock(track, 10, 2);
    expect(held).toEqual(track.cues[1]?.to);
    expect(mid).not.toEqual(held);
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
    const last = track.cues[1]?.to;
    expect(last).toBeDefined();
    if (!last) return;
    expect(frameToTransform(end)).toBe(frameToTransform(last));
  });
});
