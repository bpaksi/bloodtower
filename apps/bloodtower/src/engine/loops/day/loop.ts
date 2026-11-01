import type { LoopDefinition } from "../../loop/types.ts";
import { nextPlayRng, playState } from "../chapter/playState.ts";
import { recordOffer, requestCheckpoint, shellState } from "../session/shellRef.ts";
import {
  checkChapter,
  type DayLoss,
  ensureClock,
  heroCount,
  noteNode,
  recordSkippedDrop,
} from "./clock.ts";
import { requestMoveRollCue } from "./cues.ts";
import { offerRegroup, regroupNeeded } from "./regroup.ts";
import { rollDayMoves } from "./roll.ts";
import { dropsThisNight, kingdomFromD4 } from "./rules.ts";
import { offerSimulatedPlacement, offerSkullPlacement } from "./skull.ts";

export type DayPhase =
  | "regroup"
  | "roll"
  | "groups"
  | "skull-prompt"
  | "skull-place"
  | "check"
  | "done";

export type DayLocal = {
  phase: DayPhase;
  groupIndex: number;
  awaitingPress: boolean;
  awaitingChild: boolean;
  /** Set by a skull-record press. The body spends it and asks for the next skull. */
  skullPlaced: boolean;
  skullsLeft: number;
};

export type DayResult = {
  dayNumber: number;
  lost: null | { reason: "skulls" | "buildings" };
};

const freshLocal = (): DayLocal => ({
  phase: "regroup",
  groupIndex: 0,
  awaitingPress: false,
  awaitingChild: false,
  skullPlaced: false,
  skullsLeft: 0,
});

const leaveRegroup = (local: DayLocal): DayLocal => {
  const play = playState();
  const shell = shellState();
  noteNode(play, ".2");
  rollDayMoves(play, shell.seed);
  requestMoveRollCue();
  return { ...local, phase: "roll", awaitingPress: false, awaitingChild: false };
};

const startClose = (local: DayLocal): DayLocal => {
  const play = playState();
  const shell = shellState();
  const clock = ensureClock(play);
  // DEC-644: the adversary's move, MEC-034 .23, does not run in 1.0.
  if (clock.questsWon > 0 && clock.tuning.questSkips) {
    recordSkippedDrop(play);
    noteNode(play, ".33");
    return { ...local, phase: "check", awaitingPress: false, awaitingChild: false, skullsLeft: 0 };
  }
  const heroes = heroCount(play);
  const count = heroes < 1 ? 0 : dropsThisNight(heroes, play.dayNumber, clock.tuning);
  noteNode(play, ".35");
  if (count < 1 || clock.supply <= 0) {
    noteNode(play, ".33");
    return { ...local, phase: "check", awaitingPress: false, awaitingChild: false, skullsLeft: 0 };
  }
  if (!shell.towerLinked) {
    noteNode(play, ".36");
    clock.pendingKingdoms = [];
    for (let i = 0; i < count; i++) {
      const face = nextPlayRng(shell.seed, play).roll(clock.tuning.kingdomDie).total;
      clock.pendingKingdoms.push(kingdomFromD4(face));
    }
    clock.expectKingdom = clock.pendingKingdoms[0] ?? null;
    return {
      ...local,
      phase: "skull-place",
      awaitingPress: false,
      awaitingChild: false,
      skullPlaced: false,
      skullsLeft: count,
    };
  }
  noteNode(play, ".11");
  clock.pendingKingdoms = [];
  clock.expectKingdom = null;
  return {
    ...local,
    phase: "skull-prompt",
    awaitingPress: false,
    awaitingChild: false,
    skullPlaced: false,
    skullsLeft: count,
  };
};

const lostOf = (outcome: DayLoss): DayResult["lost"] =>
  outcome.lost ? { reason: outcome.reason } : null;

export const dayLoop: LoopDefinition<DayLocal, DayResult> = {
  id: "day",
  enter: () => {
    const play = playState();
    const clock = ensureClock(play);
    if (clock.resume) {
      const saved = clock.resume;
      clock.resume = null;
      play.dayNumber = saved.dayNumber;
      play.rngSeq = saved.rngSeq;
      play.dayRolls = { ...saved.dayRolls };
      clock.shifts = structuredClone(saved.shifts);
      clock.questsWon = saved.questsWon;
      return structuredClone(saved.local) as DayLocal;
    }
    play.dayNumber += 1;
    play.dayRolls = {};
    clock.questsWon = 0;
    clock.effects = [];
    clock.shifts = {};
    clock.turns = [];
    clock.nightDrops = [];
    clock.pendingKingdoms = [];
    clock.expectKingdom = null;
    clock.outcome = null;
    return freshLocal();
  },
  body: (local, ctx) => {
    const play = playState();
    const shell = shellState();
    const clock = ensureClock(play);

    if (local.phase === "regroup") {
      if (regroupNeeded(play)) {
        if (!local.awaitingPress) {
          noteNode(play, ".38");
          offerRegroup(ctx);
          return { local: { ...local, awaitingPress: true }, passComplete: false };
        }
        noteNode(play, ".42");
      } else {
        noteNode(play, ".38");
      }
      local = leaveRegroup(local);
    }

    if (local.phase === "roll") {
      if (!local.awaitingPress) {
        const promptId = `day-${play.dayNumber}-roll-done`;
        ctx.offerPrompt(promptId, "continue");
        recordOffer(promptId, "continue");
        return { local: { ...local, awaitingPress: true }, passComplete: false };
      }
      local = { ...local, phase: "groups", groupIndex: 0, awaitingPress: false };
    }

    if (local.phase === "groups") {
      if (local.awaitingChild) {
        const finished = ctx.getParentResult() as { groupId?: string } | undefined;
        if (!finished?.groupId) return { local, passComplete: false };
        local = {
          ...local,
          groupIndex: local.groupIndex + 1,
          awaitingChild: false,
          awaitingPress: false,
        };
      }

      const groupId = play.turnOrder[local.groupIndex];
      if (local.groupIndex >= play.turnOrder.length || !groupId) {
        local = startClose(local);
      } else {
        const moves = play.dayRolls[groupId] ?? clock.tuning.moveFloor;
        noteNode(play, ".5");
        clock.turns.push(groupId);
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
      local = { ...local, phase: "skull-place", awaitingPress: false, skullPlaced: false };
    }

    if (local.phase === "skull-place") {
      if (local.skullPlaced) {
        local = {
          ...local,
          skullsLeft: local.skullsLeft - 1,
          skullPlaced: false,
          awaitingPress: false,
        };
      }
      const more = local.skullsLeft > 0 && clock.supply > 0;
      if (!more) {
        noteNode(play, ".33");
        local = { ...local, phase: "check", awaitingPress: false };
      } else if (!local.awaitingPress) {
        const kingdom = clock.pendingKingdoms[0];
        if (kingdom) offerSimulatedPlacement(play.dayNumber, kingdom, ctx);
        else offerSkullPlacement(play.dayNumber, ctx);
        return {
          local: { ...local, awaitingPress: true, skullPlaced: false },
          passComplete: false,
        };
      } else {
        return { local, passComplete: false };
      }
    }

    if (local.phase === "check") {
      noteNode(play, "MEC-033.11");
      clock.outcome = checkChapter(clock);
      local = { ...local, phase: "done", awaitingPress: false };
    }

    if (local.phase === "done") {
      const gameId = shell.activeGameId ?? shell.autosave?.gameId ?? "unknown";
      if (shell.autosave) shell.autosave = { ...shell.autosave, day: play.dayNumber };
      requestCheckpoint(gameId, play.dayNumber);
      return { local, passComplete: true };
    }

    return { local, passComplete: false };
  },
  exit: (local) => local.phase === "done" && local.awaitingPress === false,
  resultUp: () => {
    const play = playState();
    const clock = ensureClock(play);
    if (!clock.outcome) {
      noteNode(play, "MEC-033.11");
      clock.outcome = checkChapter(clock);
    }
    return { dayNumber: play.dayNumber, lost: lostOf(clock.outcome) };
  },
};
