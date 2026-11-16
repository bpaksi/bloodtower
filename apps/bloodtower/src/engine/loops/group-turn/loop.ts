import type { LoopDefinition } from "../../loop/types.ts";
import {
  applyVirtueChoice,
  hasVirtuePanel,
  type VirtuePanel,
  virtuePanel,
} from "../../rules/virtues/index.ts";
import type { BoardGraph } from "../chapter/board.ts";
import { neighborsOf, spaceName } from "../chapter/board.ts";
import { groupById, type PlayState, playState } from "../chapter/playState.ts";
import { isCorruptionLoss, isFallen } from "../day/clock.ts";
import { handleEncounterLeave } from "../encounter/loop.ts";
import { beginGroupTurn, endGroupTurn, turnHasEnded } from "../encounter/picks.ts";
import { recordOffer } from "../session/shellRef.ts";

export type GroupTurnLocal = {
  groupId: string;
  movesLeft: number;
  awaitingPress: boolean;
  encounterPending: boolean;
  /** Last walk spent all moves on a building space; Enter must be offered before the turn ends (DEC-220). */
  landedOnBuildingWithNoMoves: boolean;
  /**
   * The turn-start virtue step (CU/14, UI-037). `open` shows the board panel until the group's
   * first move; `picks` holds what a virtue that asked was answered this turn, by virtue id, with
   * the label the board mirrors. Absent on a turn saved before CU/14: no panel, no choice.
   */
  virtue?: { open: boolean; picks: Record<string, { optionId: string; label: string }> };
};

export type GroupTurnResult = { groupId: string };

const walkPromptId = (groupId: string, spaceId: string) => `walk--${groupId}--${spaceId}`;

const parseWalkPrompt = (promptId: string): string | null => {
  const parts = promptId.split("--");
  if (parts.length < 3 || parts[0] !== "walk") return null;
  return parts.slice(2).join("--");
};

const VIRTUE_PREFIX = "virtue-choice";

/** The press of a virtue's option rides the existing `record` action; the prompt id says which. */
export const virtuePromptId = (groupId: string, virtueId: string, optionId: string) =>
  `${VIRTUE_PREFIX}--${groupId}--${virtueId}--${optionId}`;

const parseVirtuePrompt = (
  promptId: string,
): { groupId: string; virtueId: string; optionId: string } | null => {
  const parts = promptId.split("--");
  if (parts.length < 4 || parts[0] !== VIRTUE_PREFIX) return null;
  return { groupId: parts[1] ?? "", virtueId: parts[2] ?? "", optionId: parts.slice(3).join("--") };
};

export const isVirtuePrompt = (promptId: string): boolean => parseVirtuePrompt(promptId) !== null;

const pickedIds = (local: GroupTurnLocal): Record<string, string> =>
  Object.fromEntries(
    Object.entries(local.virtue?.picks ?? {}).map(([id, pick]) => [id, pick.optionId]),
  );

/** The turn-start virtue panel as the views read it: null once nothing is left to show. */
export const virtuePanelOf = (play: PlayState, local: GroupTurnLocal): VirtuePanel | null => {
  if (!local.virtue) return null;
  const panel = virtuePanel(play, local.groupId, pickedIds(local));
  if (!local.virtue.open && panel.choice === null) return null;
  return panel.lines.length > 0 ? panel : null;
};

/** One button per enabled option of the virtue that asks. The move map never waits for it (DEC-479). */
const offerVirtueChoice = (
  local: GroupTurnLocal,
  ctx: { offerPrompt: (a: string, b: string) => void },
) => {
  if (!local.virtue) return;
  const choice = virtuePanel(playState(), local.groupId, pickedIds(local)).choice;
  if (!choice) return;
  for (const option of choice.options) {
    if (!option.enabled) continue;
    const promptId = virtuePromptId(local.groupId, choice.virtueId, option.id);
    ctx.offerPrompt(promptId, "record");
    recordOffer(promptId, "record");
  }
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

  offerVirtueChoice(local, ctx);
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
  offerVirtueChoice(local, ctx);
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
      virtue: { open: hasVirtuePanel(play, input.groupId), picks: {} },
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
      local = { ...local, movesLeft: 0, landedOnBuildingWithNoMoves: false };
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
    if (isCorruptionLoss(playState())) return true;
    const group = groupById(playState(), local.groupId);
    if (group?.insideBuilding) return false;
    if (local.landedOnBuildingWithNoMoves && group && !group.insideBuilding) {
      const here = playState().content.board.spaceById.get(group.spaceId);
      if (here?.building && !isFallen(playState(), group.spaceId)) return false;
    }
    return local.movesLeft <= 0 && !local.encounterPending;
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

/**
 * A press of a virtue's option. First press wins: a virtue already answered this turn refuses a
 * second one (it is no longer offered, so only a stale press gets here). A refusal changes nothing;
 * `virtuePressRefusal` tells the shell, which logs it.
 */
const pressVirtueChoice = (
  local: GroupTurnLocal,
  press: { groupId: string; virtueId: string; optionId: string },
): GroupTurnLocal => {
  const reopened = { ...local, awaitingPress: false };
  if (!local.virtue || press.groupId !== local.groupId) return reopened;
  if (local.virtue.picks[press.virtueId]) return reopened;
  const label = applyVirtueChoice(playState(), local.groupId, press.virtueId, press.optionId);
  if (label === null) return reopened;
  return {
    ...reopened,
    virtue: {
      ...local.virtue,
      picks: { ...local.virtue.picks, [press.virtueId]: { optionId: press.optionId, label } },
    },
  };
};

/**
 * The words for a virtue press the turn did not take, or null when it took it. The shell logs and
 * toasts it (CLAUDE.md, Errors). Read after the press, from the same local the press produced.
 */
export const virtuePressRefusal = (
  local: GroupTurnLocal,
  promptId: string,
  actionId: string,
): string | null => {
  const press = parseVirtuePrompt(promptId);
  if (actionId !== "record" || !press) return null;
  if (local.virtue?.picks[press.virtueId]?.optionId === press.optionId) return null;
  return `The virtue ${press.virtueId} could not take "${press.optionId}", so nothing changed.`;
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

  const virtue = parseVirtuePrompt(promptId);
  if (actionId === "record" && virtue) {
    return pressVirtueChoice(local, virtue);
  }

  // The panel is for the start of the turn: the first move, Enter or End turn closes it.
  if (
    local.virtue?.open &&
    (actionId === "walk" || actionId === "enter" || actionId === "end-turn")
  ) {
    local = { ...local, virtue: { ...local.virtue, open: false } };
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
