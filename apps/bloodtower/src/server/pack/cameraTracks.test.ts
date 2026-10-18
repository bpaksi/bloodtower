import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../config.ts";

type CameraFrame = { x: number; y: number; w: number; h: number };

type CameraCue = {
  start: number;
  end: number;
  from: CameraFrame;
  to: CameraFrame;
  ease?: string;
};

type CameraTrack = {
  id: string;
  still: string;
  cues: CameraCue[];
};

const packCameraDir = () => join(loadConfig().packsDir, "test", "camera");

const loadTrack = (stem: string): CameraTrack => {
  const path = join(packCameraDir(), `${stem}.json`);
  const parsed = JSON.parse(readFileSync(path, "utf8")) as CameraTrack;
  return parsed;
};

const assertTrackShape = (track: CameraTrack, stem: string) => {
  expect(track.id).toBe(stem);
  expect(track.still).toMatch(/\.(png|webp|jpe?g)$/i);
  expect(track.cues.length).toBeGreaterThan(0);
  for (const cue of track.cues) {
    expect(cue.start).toBeGreaterThanOrEqual(0);
    expect(cue.end).toBeGreaterThanOrEqual(cue.start);
    for (const frame of [cue.from, cue.to]) {
      expect(frame.w).toBeGreaterThan(0);
      expect(frame.h).toBeGreaterThan(0);
      expect(frame.x - frame.w / 2).toBeGreaterThanOrEqual(0);
      expect(frame.x + frame.w / 2).toBeLessThanOrEqual(1);
      expect(frame.y - frame.h / 2).toBeGreaterThanOrEqual(0);
      expect(frame.y + frame.h / 2).toBeLessThanOrEqual(1);
    }
  }
};

const cueDurationSeconds = (track: CameraTrack): number => {
  const last = track.cues.at(-1);
  return last ? last.end : 0;
};

describe("proving ground camera sidecars", () => {
  for (const stem of ["grey-stair.01", "grey-stair.02", "grey-stair.04", "grey-stair-n2.01"]) {
    it(`loads and validates ${stem}.json`, () => {
      const track = loadTrack(stem);
      assertTrackShape(track, stem);
      const duration = cueDurationSeconds(track);
      expect(duration).toBeGreaterThanOrEqual(8);
      expect(duration).toBeLessThanOrEqual(12);
    });
  }

  it("frames grey-stair-n2.01 on the third step with lamps cropped out", () => {
    const track = loadTrack("grey-stair-n2.01");
    const end = track.cues[0]?.to;
    expect(end).toBeDefined();
    if (!end) return;
    expect(end.x).toBeCloseTo(0.5, 2);
    expect(end.y).toBeCloseTo(0.63, 2);
    expect(end.w).toBeLessThan(0.5);
    expect(end.h).toBeLessThan(0.35);
    expect(end.y - end.h / 2).toBeGreaterThan(0.45);
    expect(track.still).toBe("fx-stair-n2.png");
  });
});
