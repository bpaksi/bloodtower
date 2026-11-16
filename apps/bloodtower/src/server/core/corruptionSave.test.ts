import { describe, expect, it } from "vitest";
import { initPlayState } from "../../engine/loops/chapter/playState.ts";
import { ensureClock, heroSheet, setHeroSheet } from "../../engine/loops/day/clock.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import { initialShellState, SHELL_ENGINE_VERSION } from "../../engine/loops/session/state.ts";
import { parseShellCheckpoint, shellCheckpointFromState } from "./shellCheckpoint.ts";

// C3-08 EV-09 / EV-13 (DEC-895): named corruptions survive Continue; a count-only save is refused.
describe("a save and corruption by ID", () => {
  const savedRow = () => {
    const play = initPlayState("c3-08-save", PROVING_GROUNDS_PLAY);
    setHeroSheet(play, "hero-a", { helpingVirtues: 0, corruptions: 2, named: ["feral", "lost"] });
    const state = { ...initialShellState({ sessionId: "s1", seed: "c3-08-save" }), play };
    return JSON.parse(JSON.stringify(shellCheckpointFromState(state))) as {
      version: string;
      play: unknown;
    };
  };

  it("keeps each hero's corruptions by ID through a checkpoint", () => {
    const row = savedRow();
    expect(row.version).toBe(SHELL_ENGINE_VERSION);
    const restored = parseShellCheckpoint(row).play;
    if (!restored) throw new Error("The checkpoint lost the play state.");
    expect(heroSheet(ensureClock(restored), "hero-a")).toEqual({
      helpingVirtues: 0,
      corruptions: 2,
      named: ["feral", "lost"],
    });
  });

  it("refuses a count-only save from before this feature, inventing nothing", () => {
    // A count-only fixture as `main` wrote it before C3-08: the old version, counts and no IDs.
    const text = JSON.stringify(savedRow());
    expect(text).toContain('"named":["feral","lost"]');
    const countOnly = JSON.parse(text.replace('"named":["feral","lost"]', '"x":0')) as object;
    expect(() => parseShellCheckpoint({ ...countOnly, version: "0.0.0-c2-08" })).toThrow(
      /not supported/,
    );
  });
});
