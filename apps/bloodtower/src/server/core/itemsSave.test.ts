import { describe, expect, it } from "vitest";
import { initPlayState } from "../../engine/loops/chapter/playState.ts";
import { ensureClock, heroSheet } from "../../engine/loops/day/clock.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import { initialShellState } from "../../engine/loops/session/state.ts";
import { heldItems, POTION, useItem } from "../../engine/rules/items/index.ts";
import { parseShellCheckpoint, shellCheckpointFromState } from "./shellCheckpoint.ts";

// CU/13 survival invariant: held items and each hero's HP survive Continue; a used item stays used.
describe("a save and held items", () => {
  const SEED = "cu-13-save~test-items:hero-b=potion+potion~test-hp:hero-b=2/10~test-gold:hero-b=7";
  const roundTrip = (play: ReturnType<typeof initPlayState>) => {
    const state = { ...initialShellState({ sessionId: "s1", seed: SEED }), play };
    const row = JSON.parse(JSON.stringify(shellCheckpointFromState(state))) as unknown;
    const restored = parseShellCheckpoint(row).play;
    if (!restored) throw new Error("The checkpoint lost the play state.");
    return restored;
  };

  it("keeps items, hit points and gold through a checkpoint", () => {
    const restored = roundTrip(initPlayState(SEED, PROVING_GROUNDS_PLAY));
    expect(heldItems(restored, "hero-b")).toEqual([POTION, POTION]);
    expect(heroSheet(ensureClock(restored), "hero-b")).toMatchObject({
      hp: { hp: 2, max: 10 },
      gold: 7,
    });
  });

  it("an item used before the save stays used, and its hit points stay raised", () => {
    const play = initPlayState(SEED, PROVING_GROUNDS_PLAY);
    expect(useItem(play, "hero-b", "hero-b", POTION)).toMatchObject({ ok: true, hp: 6 });
    const restored = roundTrip(play);
    expect(heldItems(restored, "hero-b")).toEqual([POTION]);
    expect(heroSheet(ensureClock(restored), "hero-b").hp).toEqual({ hp: 6, max: 10 });
  });
});
