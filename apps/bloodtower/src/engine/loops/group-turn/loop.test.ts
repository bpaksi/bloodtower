import { describe, expect, it } from "vitest";
import { initPlayState } from "../chapter/playState.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import { bindShellState, clearShellState } from "../session/shellRef.ts";
import { initialShellState } from "../session/state.ts";
import { type GroupTurnLocal, groupTurnLoop, handleGroupTurnPress } from "./loop.ts";

const bindPlay = (play: ReturnType<typeof initPlayState>, seed = "gt") => {
  const shell = initialShellState({ sessionId: "t", seed, stories: [] });
  shell.play = play;
  bindShellState(shell);
  return shell;
};

const runGroupTurnBody = (
  play: ReturnType<typeof initPlayState>,
  local: GroupTurnLocal,
  seed = "gt",
) => {
  const shell = bindPlay(play, seed);
  const offers: Array<{ promptId: string; actionId: string }> = [];
  const result = groupTurnLoop.body(local, {
    loopId: "group-turn",
    seed,
    eventSeq: 1,
    effects: [],
    tracePhase: () => {},
    recordEnd: () => {},
    offerPrompt: (promptId, actionId) => {
      offers.push({ promptId, actionId });
      shell.offered.push({ promptId, actionId, open: true });
    },
    startChild: () => {},
    setParentResult: () => {},
    getParentResult: () => undefined,
  });
  clearShellState();
  return { result, offers };
};

describe("group turn", () => {
  it("offers Enter after the last walk lands on a building (DEC-220)", () => {
    const play = initPlayState("enter-test", PROVING_GROUNDS_PLAY);
    const group = play.groups[0];
    expect(group).toBeDefined();

    let fromSpace: (typeof play.content.board.spaces)[number] | undefined;
    let buildingSpace: (typeof play.content.board.spaces)[number] | undefined;
    for (const space of play.content.board.spaces) {
      if (space.building) continue;
      for (const adjId of space.adjacent) {
        const adj = play.content.board.spaceById.get(adjId);
        if (adj?.building) {
          fromSpace = space;
          buildingSpace = adj;
          break;
        }
      }
      if (fromSpace) break;
    }
    expect(fromSpace).toBeDefined();
    expect(buildingSpace).toBeDefined();

    group!.spaceId = fromSpace!.id;
    bindPlay(play);

    let local: GroupTurnLocal = {
      groupId: group!.id,
      movesLeft: 1,
      awaitingPress: true,
      encounterPending: false,
      landedOnBuildingWithNoMoves: false,
    };

    local = handleGroupTurnPress(local, `walk--${group!.id}--${buildingSpace!.id}`, "walk");
    clearShellState();

    expect(local.movesLeft).toBe(0);
    expect(local.landedOnBuildingWithNoMoves).toBe(true);
    expect(group!.spaceId).toBe(buildingSpace!.id);

    const { result, offers } = runGroupTurnBody(play, local);
    expect(result.passComplete).toBe(false);
    expect(offers.some((o) => o.actionId === "enter")).toBe(true);
    expect(offers.some((o) => o.actionId === "end-turn")).toBe(true);
    expect(offers.some((o) => o.actionId === "walk")).toBe(false);
  });
});
