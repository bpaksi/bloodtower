import type { LoopDefinition } from "../../loop/types.ts";
import type { BoardGraph } from "../chapter/board.ts";
import { neighborsOf, spaceName } from "../chapter/board.ts";
import { groupById, playState } from "../chapter/playState.ts";
import { isFallen } from "../day/clock.ts";
import { handleEncounterLeave } from "../encounter/loop.ts";
import { recordOffer } from "../session/shellRef.ts";

export type GroupTurnLocal = {
  groupId: string;
  movesLeft: number;
  awaitingPress: boolean;
  encounterPending: boolean;
  /** Last walk spent all moves on a building space; Enter must be offered before the turn ends (DEC-220). */
  landedOnBuildingWithNoMoves: boolean;
};

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

  const endId = `end-turn--${local.groupId}`;
  ctx.offerPrompt(endId, "end-turn");
  recordOffer(endId, "end-turn");
};

const offerEnterOrEndTurn = (
  local: GroupTurnLocal,
  ctx: { offerPrompt: (a: string, b: string) => void },
) => {
  const group = groupById(playState(), local.groupId);
  if (!group) return;
  if (!isFallen(playState(), group.spaceId)) {
    const promptId = `enter--${local.groupId}--${group.spaceId}`;
    ctx.offerPrompt(promptId, "enter");
    recordOffer(promptId, "enter");
  }
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
    return {
      groupId: input.groupId,
      movesLeft: input.moves,
      awaitingPress: false,
      encounterPending: false,
      landedOnBuildingWithNoMoves: false,
    };
  },
  body: (local, ctx) => {
    const play = playState();
    const group = groupById(play, local.groupId);

    if (local.encounterPending) {
      const done = ctx.getParentResult() as { left?: boolean } | undefined;
      if (!done?.left) {
        return { local, passComplete: false };
      }
      local = { ...local, encounterPending: false, awaitingPress: false };
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
      return { local, passComplete: true };
    }

    if (!local.awaitingPress) {
      offerMoveMap(local, ctx);
      return { local: { ...local, awaitingPress: true }, passComplete: false };
    }

    return { local, passComplete: false };
  },
  exit: (local) => {
    const group = groupById(playState(), local.groupId);
    if (group?.insideBuilding) return false;
    if (local.landedOnBuildingWithNoMoves && group && !group.insideBuilding) {
      const here = playState().content.board.spaceById.get(group.spaceId);
      if (here?.building && !isFallen(playState(), group.spaceId)) return false;
    }
    return local.movesLeft <= 0 && !local.encounterPending;
  },
  resultUp: (local) => ({ groupId: local.groupId }),
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
    };
  }

  if (actionId === "walk") {
    const spaceId = parseWalkPrompt(promptId);
    if (!spaceId || local.movesLeft < 1) return { ...local, awaitingPress: false };
    if (!applyWalk(local.groupId, spaceId)) return { ...local, awaitingPress: false };
    const movesLeft = local.movesLeft - 1;
    const space = playState().content.board.spaceById.get(spaceId);
    const landedOnBuildingWithNoMoves = movesLeft <= 0 && Boolean(space?.building);
    return {
      ...local,
      movesLeft,
      awaitingPress: false,
      landedOnBuildingWithNoMoves,
    };
  }

  if (
    actionId === "enter" &&
    promptId === `enter--${local.groupId}--${groupById(playState(), local.groupId)?.spaceId}`
  ) {
    const group = groupById(playState(), local.groupId);
    if (!group) return { ...local, awaitingPress: false };
    if (!applyEnter(local.groupId, group.spaceId)) return { ...local, awaitingPress: false };
    return { ...local, awaitingPress: false, landedOnBuildingWithNoMoves: false };
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
  return `${actionId}`;
};
