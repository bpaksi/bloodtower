import type { LoopDefinition } from "../../loop/types.ts";
import type { BoardGraph } from "../chapter/board.ts";
import { neighborsOf, spaceName } from "../chapter/board.ts";
import { groupById, type PlayState, playState } from "../chapter/playState.ts";
import { isCorruptionLoss, isFallen } from "../day/clock.ts";
import { handleEncounterLeave } from "../encounter/loop.ts";
import { beginGroupTurn, endGroupTurn, turnHasEnded } from "../encounter/picks.ts";
import { hasOpenEvent } from "../event/index.ts";
import { recordOffer } from "../session/shellRef.ts";

export type GroupTurnLocal = {
  groupId: string;
  movesLeft: number;
  awaitingPress: boolean;
  encounterPending: boolean;
  /** Last walk spent all moves on a building space; Enter must be offered before the turn ends (DEC-220). */
  landedOnBuildingWithNoMoves: boolean;
  /**
   * The taps Back can still undo, oldest first (PT-19, Q5.2): the space each one left. Cleared by
   * a trigger, Enter and End turn (Q5.1). Absent on a save made before CU/05: read as empty.
   */
  undo?: { fromSpaceId: string }[];
  /** A correction at 0 moves: the turn waits for End turn instead of ending by itself (Q5.3). */
  awaitEnd?: boolean;
};

/**
 * Does arriving on `spaceId` start an encounter, event, foe or quest scene? Such an arrival is a
 * trigger: it closes the Back window and is never undone (Q5.1, DEC-209). On main an arrival
 * starts a scene only through an event that is already open or a group that is inside a building;
 * a test may pass its own probe.
 */
export type ArrivalProbe = (play: PlayState, groupId: string, spaceId: string) => boolean;

export const defaultArrivalProbe: ArrivalProbe = (play, groupId) =>
  hasOpenEvent(play) || Boolean(groupById(play, groupId)?.insideBuilding);

const undoOf = (local: GroupTurnLocal) => local.undo ?? [];

export const backPromptId = (groupId: string) => `back--${groupId}`;

export type GroupTurnResult = { groupId: string };

const walkPromptId = (groupId: string, spaceId: string) => `walk--${groupId}--${spaceId}`;

const parseWalkPrompt = (promptId: string): string | null => {
  const parts = promptId.split("--");
  if (parts.length < 3 || parts[0] !== "walk") return null;
  return parts.slice(2).join("--");
};

const offerMoveMap = (
  local: GroupTurnLocal,
  ctx: { offerPrompt: (a: string, b: string) => void },
) => {
  const play = playState();
  const group = groupById(play, local.groupId);
  if (!group || group.insideBuilding) return;

  const board = play.content.board;
  const here = board.spaceById.get(group.spaceId);
  if (!here) return;

  for (const neighbor of neighborsOf(board, group.spaceId)) {
    if (local.movesLeft < 1) break;
    const promptId = walkPromptId(local.groupId, neighbor.id);
    ctx.offerPrompt(promptId, "walk");
    recordOffer(promptId, "walk");
  }

  if (here.building && !isFallen(play, group.spaceId)) {
    const promptId = `enter--${local.groupId}--${group.spaceId}`;
    ctx.offerPrompt(promptId, "enter");
    recordOffer(promptId, "enter");
  }

  offerBack(local, ctx);
  const endId = `end-turn--${local.groupId}`;
  ctx.offerPrompt(endId, "end-turn");
  recordOffer(endId, "end-turn");
};

const offerBack = (local: GroupTurnLocal, ctx: { offerPrompt: (a: string, b: string) => void }) => {
  if (undoOf(local).length === 0) return;
  const promptId = backPromptId(local.groupId);
  ctx.offerPrompt(promptId, "back");
  recordOffer(promptId, "back");
};

const offerEnterOrEndTurn = (
  local: GroupTurnLocal,
  ctx: { offerPrompt: (a: string, b: string) => void },
) => {
  const group = groupById(playState(), local.groupId);
  if (!group) return;
  const here = playState().content.board.spaceById.get(group.spaceId);
  if (here?.building && !isFallen(playState(), group.spaceId)) {
    const promptId = `enter--${local.groupId}--${group.spaceId}`;
    ctx.offerPrompt(promptId, "enter");
    recordOffer(promptId, "enter");
  }
  offerBack(local, ctx);
  const endId = `end-turn--${local.groupId}`;
  ctx.offerPrompt(endId, "end-turn");
  recordOffer(endId, "end-turn");
};

export const groupTurnLoop: LoopDefinition<GroupTurnLocal, GroupTurnResult> = {
  id: "group-turn",
  enter: () => {
    const play = playState();
    const input = play.childInput;
    if (!input || input.kind !== "group-turn") {
      throw new Error("Group turn needs childInput from the day loop.");
    }
    play.childInput = null;
    beginGroupTurn(play, input.groupId);
    return {
      groupId: input.groupId,
      movesLeft: input.moves,
      awaitingPress: false,
      encounterPending: false,
      landedOnBuildingWithNoMoves: false,
      undo: [],
    };
  },
  body: (local, ctx) => {
    const play = playState();
    const group = groupById(play, local.groupId);

    // DEC-676: a third corruption stops the turn at once.
    if (isCorruptionLoss(play)) return { local, passComplete: true };

    if (local.encounterPending) {
      const done = ctx.getParentResult() as { left?: boolean } | undefined;
      if (!done?.left) {
        return { local, passComplete: false };
      }
      local = { ...local, encounterPending: false, awaitingPress: false };
    }

    // DEC-468: an Uncertain pick ended the turn; the moves left are lost.
    if (turnHasEnded(play, local.groupId) && local.movesLeft > 0 && !group?.insideBuilding) {
      local = { ...local, movesLeft: 0, landedOnBuildingWithNoMoves: false, undo: [] };
    }

    if (group?.insideBuilding) {
      play.childInput = { kind: "encounter", groupId: local.groupId };
      ctx.startChild("encounter");
      return { local: { ...local, encounterPending: true }, passComplete: false };
    }

    if (local.movesLeft <= 0) {
      if (
        local.landedOnBuildingWithNoMoves &&
        group &&
        !group.insideBuilding &&
        play.content.board.spaceById.get(group.spaceId)?.building &&
        !isFallen(play, group.spaceId)
      ) {
        if (!local.awaitingPress) {
          offerEnterOrEndTurn(local, ctx);
          return { local: { ...local, awaitingPress: true }, passComplete: false };
        }
        return { local, passComplete: false };
      }
      // The last move was a tap Back can still give back (Q5.1): the turn waits for Back or End turn.
      if ((undoOf(local).length > 0 || local.awaitEnd) && group && !group.insideBuilding) {
        if (!local.awaitingPress) {
          offerEnterOrEndTurn(local, ctx);
          return { local: { ...local, awaitingPress: true }, passComplete: false };
        }
        return { local, passComplete: false };
      }
      return { local, passComplete: true };
    }

    if (!local.awaitingPress) {
      offerMoveMap(local, ctx);
      return { local: { ...local, awaitingPress: true }, passComplete: false };
    }

    return { local, passComplete: false };
  },
  exit: (local) => {
    if (isCorruptionLoss(playState())) return true;
    const group = groupById(playState(), local.groupId);
    if (group?.insideBuilding) return false;
    if (local.landedOnBuildingWithNoMoves && group && !group.insideBuilding) {
      const here = playState().content.board.spaceById.get(group.spaceId);
      if (here?.building && !isFallen(playState(), group.spaceId)) return false;
    }
    return (
      local.movesLeft <= 0 &&
      !local.encounterPending &&
      undoOf(local).length === 0 &&
      !local.awaitEnd
    );
  },
  resultUp: (local) => {
    // DEC-472, DEC-473: turn-end gold losses, once (an Uncertain pick already ended the turn).
    if (!isCorruptionLoss(playState())) endGroupTurn(playState(), local.groupId);
    return { groupId: local.groupId };
  },
};

export const applyWalk = (groupId: string, targetSpaceId: string): boolean => {
  const play = playState();
  const group = groupById(play, groupId);
  if (!group || group.insideBuilding) return false;
  const board = play.content.board;
  const neighbor = neighborsOf(board, group.spaceId).find((s) => s.id === targetSpaceId);
  if (!neighbor) return false;
  group.spaceId = targetSpaceId;
  return true;
};

export const applyEnter = (groupId: string, spaceId: string): boolean => {
  const play = playState();
  const group = groupById(play, groupId);
  if (!group || group.spaceId !== spaceId) return false;
  const space = play.content.board.spaceById.get(spaceId);
  if (!space?.building || isFallen(play, spaceId)) return false;
  group.insideBuilding = true;
  return true;
};

export const handleGroupTurnPress = (
  local: GroupTurnLocal,
  promptId: string,
  actionId: string,
  arrivalProbe: ArrivalProbe = defaultArrivalProbe,
): GroupTurnLocal => {
  // Regroup is the only step that splits or joins (DEC-640). A mid-turn press is refused.
  if (actionId === "split" || actionId === "join" || actionId === "regroup") {
    return { ...local, awaitingPress: false };
  }

  if (actionId === "end-turn" && promptId === `end-turn--${local.groupId}`) {
    return {
      ...local,
      movesLeft: 0,
      awaitingPress: false,
      landedOnBuildingWithNoMoves: false,
      undo: [],
      awaitEnd: false,
    };
  }

  // Back (PT-19, Q5.2): one tap per press, back to the turn start or the last trigger. The seeded
  // stream is never touched (DEC-209), no hero changes, no tower command.
  if (actionId === "back") {
    const undo = undoOf(local);
    const last = undo.at(-1);
    const group = groupById(playState(), local.groupId);
    if (promptId !== backPromptId(local.groupId) || !last || !group || group.insideBuilding) {
      return { ...local, awaitingPress: false };
    }
    group.spaceId = last.fromSpaceId;
    return {
      ...local,
      movesLeft: local.movesLeft + 1,
      awaitingPress: false,
      landedOnBuildingWithNoMoves: false,
      undo: undo.slice(0, -1),
    };
  }

  if (actionId === "walk") {
    const spaceId = parseWalkPrompt(promptId);
    if (!spaceId || local.movesLeft < 1) return { ...local, awaitingPress: false };
    const fromSpaceId = groupById(playState(), local.groupId)?.spaceId;
    if (!fromSpaceId || !applyWalk(local.groupId, spaceId)) {
      return { ...local, awaitingPress: false };
    }
    // A trigger closes the Back window and is never undone (Q5.1).
    const triggered = arrivalProbe(playState(), local.groupId, spaceId);
    const undo = triggered ? [] : [...undoOf(local), { fromSpaceId }];
    const movesLeft = local.movesLeft - 1;
    const space = playState().content.board.spaceById.get(spaceId);
    const landedOnBuildingWithNoMoves = movesLeft <= 0 && Boolean(space?.building);
    return {
      ...local,
      movesLeft,
      awaitingPress: false,
      landedOnBuildingWithNoMoves,
      undo,
    };
  }

  if (
    actionId === "enter" &&
    promptId === `enter--${local.groupId}--${groupById(playState(), local.groupId)?.spaceId}`
  ) {
    const group = groupById(playState(), local.groupId);
    if (!group) return { ...local, awaitingPress: false };
    if (!applyEnter(local.groupId, group.spaceId)) return { ...local, awaitingPress: false };
    return { ...local, awaitingPress: false, landedOnBuildingWithNoMoves: false, undo: [] };
  }

  if (actionId === "leave" && promptId === `leave--${local.groupId}`) {
    handleEncounterLeave(local.groupId);
    return { ...local, awaitingPress: false };
  }

  return { ...local, awaitingPress: false };
};

export const formatGroupAction = (
  board: BoardGraph,
  promptId: string,
  actionId: string,
): string => {
  if (actionId === "walk") {
    const spaceId = parseWalkPrompt(promptId);
    return spaceId ? `walk ${spaceName(board, spaceId)}` : "walk";
  }
  if (actionId === "enter") return "enter";
  if (actionId === "leave") return "leave";
  if (actionId === "end-turn") return "end turn";
  if (actionId === "back") return "back";
  return `${actionId}`;
};
