import { describe, expect, it } from "vitest";
import { createMockTower } from "./mock.ts";
import {
  BALANCE_LEAD_MS,
  BALANCE_TIER,
  LEVEL_SPACING_MS,
  runVolumeTest,
  VOLUME_TEST_SOUND,
  WRITE_GAP_MS,
} from "./volumeTest.ts";

/** A fake clock: sleeping moves it on, and every tower write is stamped with it. */
const fixture = () => {
  let now = 0;
  const tower = createMockTower();
  tower.connect();
  const writes: Array<{ at: number; soundIndex?: number; volume?: number }> = [];
  const playSound = tower.playSound;
  tower.playSound = async (soundIndex, volume) => {
    writes.push({ at: now, soundIndex, volume });
    return playSound(soundIndex, volume);
  };
  const steps: Array<{ at: number; phase: string; level: number | null }> = [];
  const sleeps: number[] = [];
  let live = true;
  let failed = 0;
  const input = (withBalance: boolean) => ({
    port: tower,
    withBalance,
    sleep: async (ms: number) => {
      sleeps.push(ms);
      now += ms;
    },
    hooks: {
      live: () => live,
      progress: (phase: string, level: number | null) => steps.push({ at: now, phase, level }),
      failed: () => {
        failed += 1;
      },
    },
  });
  return {
    tower,
    writes,
    steps,
    sleeps,
    failed: () => failed,
    stop: () => {
      live = false;
    },
    input: input as (withBalance: boolean) => Parameters<typeof runVolumeTest>[0],
  };
};

describe("tower volume test run", () => {
  it("plays Dungeon Complete at volume 0, 1 and 2 about 4 s apart, then once at the chosen tier over the room", async () => {
    const f = fixture();
    await runVolumeTest(f.input(true));
    expect(f.writes.map((w) => [w.soundIndex, w.volume])).toEqual([
      [VOLUME_TEST_SOUND, 0],
      [VOLUME_TEST_SOUND, 1],
      [VOLUME_TEST_SOUND, 2],
      [VOLUME_TEST_SOUND, BALANCE_TIER],
    ]);
    expect(VOLUME_TEST_SOUND).toBe(58);
    expect(BALANCE_TIER).toBe(2);
    // Level starts are 4 s apart.
    expect(f.writes.slice(0, 3).map((w) => w.at)).toEqual([
      0,
      LEVEL_SPACING_MS,
      2 * LEVEL_SPACING_MS,
    ]);
    // The balance sound starts after the room sound has played alone for the lead-in.
    expect(f.writes[3]?.at).toBe(3 * LEVEL_SPACING_MS + BALANCE_LEAD_MS);
    expect(f.steps.map((s) => [s.phase, s.level])).toEqual([
      ["levels", 0],
      ["levels", 1],
      ["levels", 2],
      ["balance-bed", null],
      ["balance-tower", null],
      ["asking", null],
    ]);
  });

  it("waits 250 ms after each write before anything else, and sends no lights", async () => {
    const f = fixture();
    await runVolumeTest(f.input(true));
    // Each sound is followed at once by a 250 ms gap.
    const afterWrite = f.sleeps.filter((ms) => ms === WRITE_GAP_MS);
    expect(afterWrite).toHaveLength(4);
    expect(WRITE_GAP_MS).toBe(250);
    // One command at a time: the mock port saw exactly four sounds and nothing else.
    expect(f.tower.sent().map((item) => item.type)).toEqual([
      "connect",
      "sound",
      "sound",
      "sound",
      "sound",
    ]);
  });

  it("Play again repeats the levels only", async () => {
    const f = fixture();
    await runVolumeTest(f.input(false));
    expect(f.writes.map((w) => w.volume)).toEqual([0, 1, 2]);
    expect(f.steps.at(-1)).toMatchObject({ phase: "asking" });
    expect(f.steps.some((s) => s.phase.startsWith("balance"))).toBe(false);
  });

  it("stops at a failed sound, reports it once, and never sends it again", async () => {
    const f = fixture();
    f.tower.failNextSound();
    await runVolumeTest(f.input(true));
    expect(f.failed()).toBe(1);
    expect(f.tower.sent().filter((item) => item.type === "sound")).toEqual([]);
    expect(f.writes).toHaveLength(1);
    expect(f.steps.map((s) => s.phase)).toEqual(["levels"]);
  });

  it("sends nothing more once the run is left behind", async () => {
    const f = fixture();
    const input = f.input(true);
    const progress = input.hooks.progress;
    input.hooks.progress = (phase, level) => {
      progress(phase, level);
      if (level === 0) f.stop();
    };
    await runVolumeTest(input);
    expect(f.writes).toHaveLength(1);
    expect(f.failed()).toBe(0);
    expect(f.steps.some((s) => s.phase === "asking")).toBe(false);
  });

  it("sends nothing and reports a failure with no tower connected", async () => {
    const f = fixture();
    f.tower.close();
    await runVolumeTest(f.input(true));
    expect(f.tower.sent()).toEqual([{ type: "connect" }]);
    expect(f.failed()).toBe(1);
  });
});
