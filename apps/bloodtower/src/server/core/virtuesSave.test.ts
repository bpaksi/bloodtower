import { describe, expect, it } from "vitest";
import { initPlayState } from "../../engine/loops/chapter/playState.ts";
import { ensureClock } from "../../engine/loops/day/clock.ts";
import type { GroupTurnLocal } from "../../engine/loops/group-turn/loop.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import { initialShellState } from "../../engine/loops/session/state.ts";
import { applyVirtueChoice, groupVirtueIds } from "../../engine/rules/virtues/index.ts";
import { parseShellCheckpoint, shellCheckpointFromState } from "./shellCheckpoint.ts";

// CU/14 survival invariant: virtues are recomputed from the game, and a pick made this turn stays made.
describe("a save and turn-start virtues", () => {
  const SEED = "cu-14-save~test-virtue-ids:hero-a=infused+fortunate~test-skulls:N-egans-end=2";
  const local = (picks: GroupTurnLocal["virtue"]): GroupTurnLocal => ({
    groupId: "hero-a",
    movesLeft: 2,
    awaitingPress: false,
    encounterPending: false,
    landedOnBuildingWithNoMoves: false,
    virtue: picks,
  });
  const roundTrip = (play: ReturnType<typeof initPlayState>, turn: GroupTurnLocal) => {
    const base = initialShellState({ sessionId: "s1", seed: SEED });
    const state = {
      ...base,
      play,
      loops: {
        ...base.loops,
        stack: [{ loopId: "group-turn", phase: "body", local: turn, finishing: false }],
      },
    } as typeof base;
    const row = JSON.parse(JSON.stringify(shellCheckpointFromState(state))) as unknown;
    const restored = parseShellCheckpoint(row);
    if (!restored.play) throw new Error("The checkpoint lost the play state.");
    return { play: restored.play, turn: restored.loops.stack.at(-1)?.local as GroupTurnLocal };
  };

  it("keeps the virtues a group holds and the skulls", () => {
    const { play } = roundTrip(
      initPlayState(SEED, PROVING_GROUNDS_PLAY),
      local({ open: true, picks: {} }),
    );
    expect(groupVirtueIds(play, "hero-a")).toEqual(["infused", "fortunate"]);
    expect(ensureClock(play).skulls["N-egans-end"]).toBe(2);
  });

  it("a pick made before the save stays made: the skull stays off and the turn remembers it", () => {
    const play = initPlayState(SEED, PROVING_GROUNDS_PLAY);
    const label = applyVirtueChoice(play, "hero-a", "infused", "N-egans-end");
    expect(label).not.toBeNull();
    const picked = local({
      open: false,
      picks: { infused: { optionId: "N-egans-end", label: label ?? "" } },
    });
    const restored = roundTrip(play, picked);
    expect(ensureClock(restored.play).skulls["N-egans-end"]).toBe(1);
    expect(restored.turn.virtue?.picks.infused?.optionId).toBe("N-egans-end");
  });
});
