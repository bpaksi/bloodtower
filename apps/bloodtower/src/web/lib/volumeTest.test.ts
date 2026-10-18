import type { VolumeTest } from "bloodtower-protocols";
import { describe, expect, it } from "vitest";
import { VOLUME_ANSWER_LABEL, volumeBoardCopy, volumeIsPlaying } from "./volumeTest.ts";

const test = (patch: Partial<VolumeTest>): VolumeTest => ({
  mode: "tower",
  phase: "idle",
  level: null,
  runs: 0,
  failed: false,
  answer: null,
  ...patch,
});

describe("tower volume test copy", () => {
  it("names the level playing, then the balance check, then the question", () => {
    expect(volumeBoardCopy(test({ phase: "levels", level: 0 })).title).toBe("Level 0");
    expect(volumeBoardCopy(test({ phase: "levels", level: 1 })).title).toBe("Level 1");
    expect(volumeBoardCopy(test({ phase: "levels", level: 2 })).title).toBe("Level 2");
    expect(volumeBoardCopy(test({ phase: "balance-bed" })).title).toBe("Tower over the room sound");
    expect(volumeBoardCopy(test({ phase: "balance-tower" })).title).toBe(
      "Tower over the room sound",
    );
    expect(volumeBoardCopy(test({ phase: "asking" })).title).toBe(
      "Did the levels sound different?",
    );
  });

  it("uses neutral words: no level is called quiet or loud", () => {
    for (const phase of [
      "idle",
      "levels",
      "balance-bed",
      "balance-tower",
      "asking",
      "answered",
    ] as const) {
      const copy = volumeBoardCopy(
        test({
          phase,
          level: phase === "levels" ? 0 : null,
          answer: phase === "answered" ? "all-same" : null,
        }),
      );
      expect(`${copy.title} ${copy.line}`.toLowerCase()).not.toMatch(/quiet|quietest|loudest/);
    }
    expect(Object.values(VOLUME_ANSWER_LABEL)).toContain("All three differ");
  });

  it("with no tower asks only to check the room sound, and says no tower sound plays", () => {
    const copy = volumeBoardCopy(test({ mode: "room" }));
    expect(copy.title).toBe("Check the room sound");
    expect(copy.line).toContain("No tower is connected");
    expect(copy.line).toContain("Sound dialog");
  });

  it("says plainly when a tower sound did not play, and that nothing was sent again", () => {
    expect(volumeBoardCopy(test({ failed: true })).line).toContain("did not play");
    expect(volumeBoardCopy(test({ failed: true })).line).toContain("Nothing was sent again");
  });

  it("is playing only while the tower or the room sound is being listened to", () => {
    expect(volumeIsPlaying(test({ phase: "levels", level: 0 }))).toBe(true);
    expect(volumeIsPlaying(test({ phase: "balance-bed" }))).toBe(true);
    expect(volumeIsPlaying(test({ phase: "balance-tower" }))).toBe(true);
    expect(volumeIsPlaying(test({ phase: "idle" }))).toBe(false);
    expect(volumeIsPlaying(test({ phase: "asking" }))).toBe(false);
  });
});
