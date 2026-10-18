import { describe, expect, it } from "vitest";
import { cameraStillImageStyle } from "./cameraStillStyle.ts";
import type { CameraTrack } from "./cameraTrack.ts";
import { frameAtTime, frameToTransform } from "./cameraTrack.ts";

const track: CameraTrack = {
  id: "grey-stair.01",
  still: "fx-stair.png",
  cues: [
    {
      start: 0,
      end: 10,
      from: { x: 0.5, y: 0.5, w: 1, h: 1 },
      to: { x: 0.5, y: 0.63, w: 0.42, h: 0.28 },
      ease: "ease-in-out",
    },
  ],
};

describe("cameraStillImageStyle", () => {
  it("uses the final cue frame with no transition when reduced motion is on", () => {
    const end = frameAtTime(track, Number.POSITIVE_INFINITY);
    const style = cameraStillImageStyle(track, 2, true, 1);
    expect(style).toEqual({
      transform: frameToTransform(end, 1),
    });
  });

  it("follows the track clock while motion is allowed", () => {
    const early = cameraStillImageStyle(track, 1, false, 1);
    const later = cameraStillImageStyle(track, 6, false, 1);
    expect(early?.transform).not.toBe(later?.transform);
  });
});
