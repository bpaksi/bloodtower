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
import { isFallen, isGameLost } from "../day/clock.ts";
import { handleEncounterLeave } from "../encounter/loop.ts";
import { beginGroupTurn, endGroupTurn, turnHasEnded } from "../encounter/picks.ts";
import { hasOpenEvent } from "../event/index.ts";
import { openQuestAt } from "../quest/quest.ts";
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

/** Fallen and no open quest: nothing to enter (DEC-910). A fallen building with an open quest stays a place. */
const fallenClosed = (play: PlayState, spaceId: string): boolean =>
  isFallen(play, spaceId) && openQuestAt(play, spaceId) === null;

/**
 * A place to Enter (DEC-641, DEC-951): a standing building, a fallen building with an open quest
 * (DEC-910), or a space with no building that holds an open quest marker.
 */
export const canEnterHere = (play: PlayState, spaceId: string): boolean => {
  const space = play.content.board.spaceById.get(spaceId);
  if (!space) return false;
  if (space.building) return !fallenClosed(play, spaceId);
  return openQuestAt(play, spaceId) !== null;
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

  if (canEnterHere(play, group.spaceId)) {
    const promptId = `enter--${local.groupId}--${group.spaceId}`;
    ctx.offerPrompt(promptId, "enter");
    recordOffer(promptId, "enter");
  }

  offerVirtueChoice(local, ctx);
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
  if (canEnterHere(playState(), group.spaceId)) {
    const promptId = `enter--${local.groupId}--${group.spaceId}`;
    ctx.offerPrompt(promptId, "enter");
    recordOffer(promptId, "enter");
  }
  offerVirtueChoice(local, ctx);
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
      virtue: { open: hasVirtuePanel(play, input.groupId), picks: {} },
      undo: [],
    };
  },
  body: (local, ctx) => {
    const play = playState();
    const group = groupById(play, local.groupId);

    // DEC-676: a third corruption stops the turn at once.
    if (isGameLost(play)) return { local, passComplete: true };

    if (local.encounterPending) {
      const done = ctx.getParentResult() as { left?: boolean; movesLeft?: number } | undefined;
      if (!done?.left) {
        return { local, passComplete: false };
      }
      // The picks spent moves inside the building; the walk goes on with what is left (UI-043).
      local = {
        ...local,
        encounterPending: false,
        awaitingPress: false,
        ...(done.movesLeft !== undefined ? { movesLeft: done.movesLeft } : {}),
      };
    }

    // DEC-468: an Uncertain pick ended the turn; the moves left are lost.
    if (turnHasEnded(play, local.groupId) && local.movesLeft > 0 && !group?.insideBuilding) {
      local = { ...local, movesLeft: 0, landedOnBuildingWithNoMoves: false, undo: [] };
    }

    if (group?.insideBuilding) {
      play.childInput = { kind: "encounter", groupId: local.groupId, movesLeft: local.movesLeft };
      ctx.startChild("encounter");
      return { local: { ...local, encounterPending: true }, passComplete: false };
    }

    if (local.movesLeft <= 0) {
      if (
        local.landedOnBuildingWithNoMoves &&
        group &&
        !group.insideBuilding &&
        canEnterHere(play, group.spaceId)
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
    if (isGameLost(playState())) return true;
    const group = groupById(playState(), local.groupId);
    if (group?.insideBuilding) return false;
    if (local.landedOnBuildingWithNoMoves && group && !group.insideBuilding) {
      if (canEnterHere(playState(), group.spaceId)) return false;
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
    if (!isGameLost(playState())) endGroupTurn(playState(), local.groupId);
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
  if (!canEnterHere(play, spaceId)) return false;
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
  arrivalProbe: ArrivalProbe = defaultArrivalProbe,
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
    const landedOnBuildingWithNoMoves = movesLeft <= 0 && canEnterHere(playState(), spaceId);
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
