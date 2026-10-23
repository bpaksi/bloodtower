import type { LoopDefinition } from "../../loop/types.ts";
import { kingdomDisplayName } from "../chapter/board.ts";
import { groupById, playState, rollGroupMoves } from "../chapter/playState.ts";
import { recordOffer, requestCheckpoint, shellState } from "../session/shellRef.ts";

export type DayLocal = {
  phase: "roll" | "groups" | "skull-prompt" | "skull-place" | "done";
  groupIndex: number;
  awaitingPress: boolean;
  awaitingChild: boolean;
};

export type DayResult = { dayNumber: number };

export const dayLoop: LoopDefinition<DayLocal, DayResult> = {
  id: "day",
  enter: () => {
    const play = playState();
    const seed = shellState().seed;
    play.dayNumber += 1;
    play.dayRolls = {};
    for (const groupId of play.turnOrder) {
      play.dayRolls[groupId] = rollGroupMoves(seed, play, play.content.moveRoll);
    }
    return { phase: "roll", groupIndex: 0, awaitingPress: false, awaitingChild: false };
  },
  body: (local, ctx) => {
    const play = playState();
    const shell = shellState();

    if (local.phase === "roll") {
      if (!local.awaitingPress) {
        const promptId = `day-${play.dayNumber}-roll-done`;
        ctx.offerPrompt(promptId, "continue");
        recordOffer(promptId, "continue");
        return { local: { ...local, awaitingPress: true }, passComplete: false };
      }
      local = { ...local, phase: "groups", awaitingPress: false };
    }

    if (local.phase === "groups") {
      if (local.awaitingChild) {
        const finished = ctx.getParentResult() as { groupId?: string } | undefined;
        if (!finished?.groupId) {
          return { local, passComplete: false };
        }
        const nextIndex = local.groupIndex + 1;
        local = { ...local, groupIndex: nextIndex, awaitingChild: false, awaitingPress: false };
        if (nextIndex >= play.turnOrder.length) {
          local = { ...local, phase: "skull-prompt", awaitingPress: false };
        }
      }

      if (local.phase !== "groups") {
        // Fell through to skull handling on the same pass.
      } else if (local.groupIndex >= play.turnOrder.length) {
        local = { ...local, phase: "skull-prompt", awaitingPress: false };
      } else {
        const groupId = play.turnOrder[local.groupIndex];
        if (!groupId) {
          return {
            local: { ...local, phase: "skull-prompt", awaitingPress: false },
            passComplete: false,
          };
        }
        const moves = play.dayRolls[groupId] ?? play.content.moveRoll.floor;
        play.childInput = { kind: "group-turn", groupId, moves };
        ctx.startChild("group-turn");
        return { local: { ...local, awaitingChild: true }, passComplete: false };
      }
    }

    if (local.phase === "skull-prompt") {
      if (!local.awaitingPress) {
        const promptId = `skull-drop-day-${play.dayNumber}`;
        ctx.offerPrompt(promptId, "continue");
        recordOffer(promptId, "continue");
        return { local: { ...local, awaitingPress: true }, passComplete: false };
      }
      local = { ...local, phase: "skull-place", awaitingPress: false };
    }

    if (local.phase === "skull-place") {
      if (!local.awaitingPress) {
        const groupId = play.turnOrder[0] ?? play.groups[0]?.id;
        if (!groupId) {
          return { local: { ...local, phase: "done", awaitingPress: false }, passComplete: false };
        }
        const group = groupById(play, groupId);
        const spaceId = group?.spaceId ?? play.content.board.spaces[0]?.id ?? "unknown";
        const space = play.content.board.spaceById.get(spaceId);
        play.lastSkull = {
          kingdom: space?.kingdom ?? "N",
          spaceId,
          building: space?.building ?? null,
        };
        const kingdom = play.lastSkull.kingdom;
        kingdomDisplayName(play.content.board, kingdom);
        const placePrompt = `skull-place-${play.dayNumber}-${kingdom}-${spaceId}`;
        ctx.offerPrompt(placePrompt, "confirm");
        recordOffer(placePrompt, "confirm");
        return { local: { ...local, awaitingPress: true }, passComplete: false };
      }
      local = { ...local, phase: "done", awaitingPress: false };
    }

    if (local.phase === "done") {
      const gameId = shell.activeGameId ?? shell.autosave?.gameId ?? "unknown";
      if (shell.autosave) {
        shell.autosave = { ...shell.autosave, day: play.dayNumber };
      }
      requestCheckpoint(gameId, play.dayNumber);
      return { local, passComplete: true };
    }

    return { local, passComplete: false };
  },
  exit: (local) => local.phase === "done" && local.awaitingPress === false,
  resultUp: () => ({ dayNumber: playState().dayNumber }),
};
