import { describe, expect, it } from "vitest";
import { initPlayState } from "../../engine/loops/chapter/playState.ts";
import {
  clockLog,
  clockSnapshot,
  ensureClock,
  recordBuildingDrop,
  recordHeldSkull,
  setHeroSheet,
} from "../../engine/loops/day/clock.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import { initialShellState, type ShellState } from "../../engine/loops/session/state.ts";
import { parseShellCheckpoint, shellCheckpointFromState } from "./shellCheckpoint.ts";

// C3 EV-19: Continue after a quit must bring back the day clock, not a blank one.
describe("Continue keeps the day clock", () => {
  it.fails("restores supply, skulls per building and the day log from the checkpoint", () => {
    const play = initPlayState("c3-day-1", PROVING_GROUNDS_PLAY);
    const state: ShellState = {
      ...initialShellState({ sessionId: "s1", seed: "c3-day-1" }),
      play,
    };
    const buildings = play.content.board.spaces.filter((space) => Boolean(space.building));
    const first = buildings[0];
    const second = buildings[1];
    if (!first || !second) throw new Error("The test board needs two buildings.");

    setHeroSheet(play, "hero-a", { helpingVirtues: 1, corruptions: 2 });
    expect(recordBuildingDrop(play, first.id, first.kingdom)).toBe(true);
    expect(recordBuildingDrop(play, first.id, first.kingdom)).toBe(true);
    expect(recordBuildingDrop(play, second.id, second.kingdom)).toBe(true);
    expect(recordHeldSkull(play)).toBe(true);
    const before = clockSnapshot(play);
    const log = clockLog(play);
    expect(before.supply).toBe(20);

    const row = JSON.parse(JSON.stringify(shellCheckpointFromState(state))) as unknown;
    const restored = parseShellCheckpoint(row);
    const restoredPlay = restored.play;
    if (!restoredPlay) throw new Error("The checkpoint lost the play state.");
    expect(restoredPlay).not.toBe(play);

    expect(clockSnapshot(restoredPlay)).toEqual(before);
    expect(clockLog(restoredPlay)).toEqual(log);
    const clock = ensureClock(restoredPlay);
    expect(clock.held).toBe(1);
    expect(clock.heroes["hero-a"]).toEqual({ helpingVirtues: 1, corruptions: 2 });
  });
});
