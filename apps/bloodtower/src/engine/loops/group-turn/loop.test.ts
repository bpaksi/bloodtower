import { describe, expect, it } from "vitest";
import { neighborsOf } from "../chapter/board.ts";
import { initPlayState } from "../chapter/playState.ts";
import { eventState } from "../event/state.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import { bindShellState, clearShellState, takePendingTowerCommands } from "../session/shellRef.ts";
import { initialShellState } from "../session/state.ts";
import {
  type ArrivalProbe,
  backPromptId,
  type GroupTurnLocal,
  groupTurnLoop,
  handleGroupTurnPress,
} from "./loop.ts";

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

/** A group on a start space with plain neighbours: a chain S, P1, P2, P3 of distinct spaces. */
const chain = (moves: number) => {
  const play = initPlayState("back-test", PROVING_GROUNDS_PLAY);
  const group = play.groups[0]!;
  const board = play.content.board;
  const path = [group.spaceId];
  while (path.length < 4) {
    const next = neighborsOf(board, path.at(-1)!).find((n) => !path.includes(n.id));
    if (!next) throw new Error("The test board has no chain of four spaces.");
    path.push(next.id);
  }
  bindPlay(play);
  const local: GroupTurnLocal = {
    groupId: group.id,
    movesLeft: moves,
    awaitingPress: true,
    encounterPending: false,
    landedOnBuildingWithNoMoves: false,
    undo: [],
  };
  const walk = (l: GroupTurnLocal, to: string, probe?: ArrivalProbe) =>
    handleGroupTurnPress(l, `walk--${group.id}--${to}`, "walk", probe);
  const back = (l: GroupTurnLocal) => handleGroupTurnPress(l, backPromptId(group.id), "back");
  return { play, group, path, local, walk, back };
};

const never: ArrivalProbe = () => false;

describe("Back on the move map (CU/05)", () => {
  it("EV-01 and EV-04: Back reverts a quiet tap and never touches the stream", () => {
    const { play, group, path, local, walk, back } = chain(3);
    const seq = play.rngSeq;
    const tapped = walk(local, path[1]!, never);
    expect(group.spaceId).toBe(path[1]);
    expect(tapped.movesLeft).toBe(2);
    const undone = back(tapped);
    expect(group.spaceId).toBe(path[0]);
    expect(undone.movesLeft).toBe(3);
    expect(play.rngSeq).toBe(seq);
    expect(walk(undone, path[1]!, never).movesLeft).toBe(2);
    expect(play.rngSeq).toBe(seq);
    clearShellState();
  });

  it("EV-05: no Back offer at the turn start, one after a tap", () => {
    const { play, local, walk, path } = chain(3);
    const fresh = runGroupTurnBody(play, { ...local, awaitingPress: false });
    expect(fresh.offers.some((o) => o.actionId === "back")).toBe(false);
    const tapped = walk(local, path[1]!, never);
    const after = runGroupTurnBody(play, { ...tapped, awaitingPress: false });
    expect(after.offers.some((o) => o.actionId === "back")).toBe(true);
  });

  it("EV-26: Back repeats to the turn start, then is refused with no change", () => {
    const { play, group, path, local, walk, back } = chain(4);
    let l = walk(walk(walk(local, path[1]!, never), path[2]!, never), path[3]!, never);
    expect(l.movesLeft).toBe(1);
    l = back(l);
    expect([group.spaceId, l.movesLeft]).toEqual([path[2], 2]);
    l = back(l);
    expect([group.spaceId, l.movesLeft]).toEqual([path[1], 3]);
    l = back(l);
    expect([group.spaceId, l.movesLeft]).toEqual([path[0], 4]);
    const refused = back(l);
    expect([group.spaceId, refused.movesLeft]).toEqual([path[0], 4]);
    expect(runGroupTurnBody(play, { ...refused, awaitingPress: false }).offers).not.toContainEqual(
      expect.objectContaining({ actionId: "back" }),
    );
    clearShellState();
  });

  it("EV-02, EV-03 and EV-27: a trigger closes the window; Back stops at the last trigger", () => {
    const { group, path, local, walk, back } = chain(4);
    const trigger: ArrivalProbe = (_play, _group, spaceId) => spaceId === path[2];
    let l = walk(local, path[1]!, trigger);
    l = walk(l, path[2]!, trigger);
    expect(l.undo).toEqual([]);
    const refused = back(l);
    expect(group.spaceId).toBe(path[2]);
    expect(refused.movesLeft).toBe(l.movesLeft);
    l = walk(l, path[3]!, trigger);
    l = back(l);
    expect(group.spaceId).toBe(path[2]);
    expect(back(l).movesLeft).toBe(l.movesLeft);
    clearShellState();
  });

  it("EV-28 (c): spending the last move keeps Back offered; the turn waits", () => {
    const { play, group, path, local, walk, back } = chain(1);
    const l = walk(local, path[1]!, never);
    expect(l.movesLeft).toBe(0);
    const { result, offers } = runGroupTurnBody(play, { ...l, awaitingPress: false });
    expect(result.passComplete).toBe(false);
    const ids = offers.map((o) => o.actionId);
    expect(ids).toContain("back");
    expect(ids).toContain("end-turn");
    expect(ids).not.toContain("walk");
    expect(groupTurnLoop.exit(l, {} as never)).toBe(false);
    const undone = back(l);
    expect([group.spaceId, undone.movesLeft]).toEqual([path[0], 1]);
    clearShellState();
  });

  it("EV-28 (a, b): Enter and End turn close the window", () => {
    const { group, path, local, walk, back } = chain(3);
    const l = walk(local, path[1]!, never);
    const ended = handleGroupTurnPress(l, `end-turn--${group.id}`, "end-turn");
    expect(ended.undo).toEqual([]);
    expect(back(ended).movesLeft).toBe(0);
    expect(group.spaceId).toBe(path[1]);
    clearShellState();
  });

  it("a held turn at 0 moves offers Enter only on a building space", () => {
    const { play, group, path, local } = chain(0);
    const plain = play.content.board.spaces.find((sp) => !sp.building)!;
    group.spaceId = plain.id;
    void path;
    const held = { ...local, undo: [{ fromSpaceId: path[0]! }], awaitingPress: false };
    const { offers } = runGroupTurnBody(play, held);
    expect(offers.map((o) => o.actionId)).toEqual(["back", "end-turn"]);
  });

  it("after a correction at 0 moves the turn waits for End turn", () => {
    const { play, path, local } = chain(0);
    const held = { ...local, undo: [], awaitEnd: true, awaitingPress: false };
    const { result, offers } = runGroupTurnBody(play, held);
    expect(result.passComplete).toBe(false);
    expect(offers.map((o) => o.actionId)).toContain("end-turn");
    void path;
    expect(groupTurnLoop.exit(held, {} as never)).toBe(false);
  });

  it("EV-29: an encounter or an open event on arrival closes the window (the default probe)", () => {
    const triggers: Record<
      string,
      (play: ReturnType<typeof initPlayState>, groupId: string) => void
    > = {
      encounter: (play, groupId) => {
        const group = play.groups.find((g) => g.id === groupId);
        if (group) group.insideBuilding = true;
      },
      event: (play) => {
        eventState(play).open = {
          groupId: "g",
          day: 1,
          type: "hazard",
          hazard: "storm",
          offer: null,
          status: "open",
          log: [],
        };
      },
    };
    for (const [kind, start] of Object.entries(triggers)) {
      const { play, group, path, local, back } = chain(3);
      start(play, group.id);
      const l = handleGroupTurnPress(local, `walk--${group.id}--${path[1]}`, "walk");
      expect(l.undo, kind).toEqual([]);
      expect(back(l).undo, kind).toEqual([]);
    }
    clearShellState();
  });

  it("EV-29: a foe or quest scene, which main cannot start on arrival, closes it through the probe", () => {
    for (const kind of ["foe", "quest"]) {
      const { path, local, walk, back } = chain(3);
      const l = walk(local, path[1]!, (_play, _g, spaceId) => spaceId === path[1]);
      expect(l.undo, kind).toEqual([]);
      expect(back(l).movesLeft, kind).toBe(l.movesLeft);
    }
    clearShellState();
  });

  it("EV-11, EV-23, EV-25: a tap and Back send no tower command and replay to the same stream", () => {
    const run = () => {
      const { play, path, local, walk, back } = chain(3);
      const l = back(walk(walk(local, path[1]!, never), path[2]!, never));
      expect(takePendingTowerCommands()).toEqual([]);
      clearShellState();
      return { seq: play.rngSeq, moves: l.movesLeft, snap: JSON.stringify(play.groups) };
    };
    const a = run();
    const b = run();
    expect(a).toEqual(b);
    expect(a.seq).toBe(initPlayState("back-test", PROVING_GROUNDS_PLAY).rngSeq);
  });
});
