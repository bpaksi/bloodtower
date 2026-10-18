import { describe, expect, it } from "vitest";
import { loopPointsFor, PRE_ROLL_FRAMES, SAMPLE_RATE } from "./loopPoints.ts";

// Frame counts from the delivery note (shell-audio-and-covers): N at 48 kHz.
const BED = 5_472_000;
const STARTUP = 4_608_000;

describe("loopPointsFor", () => {
  it("loops from 0 to N when the decoder applied the edit list", () => {
    expect(loopPointsFor(BED, BED)).toEqual({ loopStart: 0, loopEnd: 114, startAt: 0 });
  });

  it("allows a few hundred padding frames when the edit list was applied", () => {
    expect(loopPointsFor(STARTUP + 300, STARTUP)).toEqual({
      loopStart: 0,
      loopEnd: 96,
      startAt: 0,
    });
  });

  it("starts after the pre-roll when the decoder ignored the edit list", () => {
    const decoded = STARTUP + 582_000;
    const loopStart = PRE_ROLL_FRAMES / SAMPLE_RATE;
    expect(loopStart).toBeCloseTo(12.021333, 6);
    const points = loopPointsFor(decoded, STARTUP);
    expect(points).not.toBeNull();
    expect(points?.startAt).toBeCloseTo(loopStart, 9);
    expect(points?.loopStart).toBeCloseTo(loopStart, 9);
    expect(points?.loopEnd).toBeCloseTo(loopStart + 96, 9);
  });

  it("returns null when the decoded length is neither case, so the caller does not loop", () => {
    expect(loopPointsFor(BED / 2, BED)).toBeNull();
    expect(loopPointsFor(BED + 100_000, BED)).toBeNull();
  });

  it("scales the lengths when the context decodes at 44.1 kHz", () => {
    // 114 s at 44.1 kHz is 5,027,400 frames, not the 48 kHz N.
    const at44 = (frames: number) => Math.round((frames * 44_100) / SAMPLE_RATE);
    expect(loopPointsFor(at44(BED), BED, 44_100)).toEqual({
      loopStart: 0,
      loopEnd: 114,
      startAt: 0,
    });
    const points = loopPointsFor(at44(STARTUP + 582_000), STARTUP, 44_100);
    expect(points?.startAt).toBeCloseTo(PRE_ROLL_FRAMES / SAMPLE_RATE, 9);
    expect(points?.loopEnd).toBeCloseTo(PRE_ROLL_FRAMES / SAMPLE_RATE + 96, 9);
  });

  it("scales the lengths when the context decodes at 96 kHz", () => {
    expect(loopPointsFor(BED * 2 + 400, BED, 96_000)).toEqual({
      loopStart: 0,
      loopEnd: 114,
      startAt: 0,
    });
    expect(loopPointsFor((STARTUP + 582_000) * 2, STARTUP, 96_000)?.loopStart).toBeCloseTo(
      PRE_ROLL_FRAMES / SAMPLE_RATE,
      9,
    );
  });
});
