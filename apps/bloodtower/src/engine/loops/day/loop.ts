import type { LoopContext, LoopDefinition } from "../../loop/types.ts";
import { nextPlayRng, playState } from "../chapter/playState.ts";
import { eventForGroup, eventTuningFrom } from "../event/index.ts";
import { skullNoBuildingEffect } from "../session/effects.ts";
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
import { applyRegroupQueue, regroupQueue } from "./regroup.ts";
import { rollDayMoves } from "./roll.ts";
import { dropsThisNight, kingdomFromD4 } from "./rules.ts";
import { offerSkullPlacement, simulateSkullDrop } from "./skull.ts";

export type DayPhase =
  | "regroup"
  | "roll"
  | "groups"
  | "skull-prompt"
  | "skull-place"
  | "skull-sim"
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
  lost: null | { reason: "skulls" | "buildings" | "corruption" };
};

const freshLocal = (): DayLocal => ({
  phase: "regroup",
  groupIndex: 0,
  awaitingPress: false,
  awaitingChild: false,
  skullPlaced: false,
  skullsLeft: 0,
});

const heroNameOf = (heroId: string): string => {
  for (const story of shellState().stories) {
    const hero = story.heroes.find((row) => row.id === heroId);
    if (hero) return hero.name;
  }
  return heroId;
};

/**
 * The day start (DEC-640 timing, PT-18): a queued Split or Rejoin applies here, before the roll.
 * There is no prompt. A day whose start applied a change marks the board's groups card (Q4.1);
 * an action that cannot apply is dropped with its error (Q4.2).
 */
const applyQueuedRegroup = (effects: LoopContext<DayLocal>["effects"]): void => {
  const play = playState();
  play.regroupCardDay = null;
  if (regroupQueue(play).length === 0) return;
  noteNode(play, ".38");
  const applied = applyRegroupQueue(play, heroNameOf, (error) => {
    effects.push(error as unknown as (typeof effects)[number]);
  });
  if (applied < 1) return;
  noteNode(play, ".41");
  noteNode(play, ".39");
  play.regroupCardDay = play.dayNumber;
};

const leaveRegroup = (local: DayLocal): DayLocal => {
  const play = playState();
  const shell = shellState();
  noteNode(play, ".2");
  rollDayMoves(play, shell.seed);
  requestMoveRollCue();
  return { ...local, phase: "roll", awaitingPress: false, awaitingChild: false };
};

/** Adds a game's skull-drop count the way a recorded drop does (SCR-019 slice). */
const countSimulatedSkull = (day: number): void => {
  const tally = shellState().tally;
  if (day === tally.skullDay) return;
  tally.skulls = (tally.skulls ?? 0) + 1;
  tally.skullDay = day;
};

/**
 * Without the tower the night's skulls are drawn, not asked for (DEC-305, PT-07): one at a time,
 * the kingdom die, then the standing building in it with the fewest skulls. The board then names
 * where each landed (SCR-019). A skull with no standing building in two kingdoms does not drop
 * and is logged as an error (Q3.1).
 */
const simulateDrops = (
  local: DayLocal,
  count: number,
  effects: LoopContext<DayLocal>["effects"],
): DayLocal => {
  const play = playState();
  const shell = shellState();
  const clock = ensureClock(play);
  noteNode(play, ".36");
  clock.pendingKingdoms = [];
  clock.expectKingdom = null;
  const drawKingdom = () =>
    kingdomFromD4(nextPlayRng(shell.seed, play).roll(clock.tuning.kingdomDie).total);
  let landed = 0;
  for (let i = 0; i < count; i++) {
    const drop = simulateSkullDrop(shell.seed, drawKingdom);
    if (drop.landed) {
      landed += 1;
    } else if (drop.reason === "no-building") {
      effects.push(skullNoBuildingEffect(play.dayNumber) as unknown as (typeof effects)[number]);
    } else {
      break;
    }
  }
  if (landed > 0) countSimulatedSkull(play.dayNumber);
  return {
    ...local,
    phase: "skull-sim",
    awaitingPress: false,
    awaitingChild: false,
    skullPlaced: false,
    skullsLeft: 0,
  };
};

const startClose = (local: DayLocal, effects: LoopContext<DayLocal>["effects"]): DayLocal => {
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
  if (!shell.towerLinked) return simulateDrops(local, count, effects);
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

    // DEC-676: a third corruption loses at once: no later group, drop or event runs.
    if (clock.outcome?.lost === true && clock.outcome.reason === "corruption") {
      local = { ...local, phase: "done", awaitingPress: false, awaitingChild: false };
    }

    if (local.phase === "regroup") {
      applyQueuedRegroup(ctx.effects);
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
        // MEC-034 .9: a group that ended in the wild or at a skulled building draws (MEC-072).
        if (eventForGroup(play, shell.seed, finished.groupId, eventTuningFrom()))
          noteNode(play, ".9");
        local = {
          ...local,
          groupIndex: local.groupIndex + 1,
          awaitingChild: false,
          awaitingPress: false,
        };
      }

      const groupId = play.turnOrder[local.groupIndex];
      if (local.groupIndex >= play.turnOrder.length || !groupId) {
        local = startClose(local, ctx.effects);
      } else {
        const moves = play.dayRolls[groupId] ?? clock.tuning.moveFloor;
        noteNode(play, ".5");
        clock.turns.push(groupId);
        play.childInput = { kind: "group-turn", groupId, moves };
        ctx.startChild("group-turn");
        return { local: { ...local, awaitingChild: true }, passComplete: false };
      }
    }

    // The tower went on without mid-night (Go on without): the rest of the night is drawn.
    if (
      !shell.towerLinked &&
      (local.phase === "skull-prompt" || local.phase === "skull-place") &&
      local.skullsLeft > 0
    ) {
      local = simulateDrops(local, local.skullsLeft, ctx.effects);
    }

    if (local.phase === "skull-sim") {
      // The press sets `skullPlaced`; a step that is not a press leaves the board's line standing.
      if (!local.skullPlaced) {
        if (!local.awaitingPress) {
          const promptId = `skull-sim-day-${play.dayNumber}`;
          ctx.offerPrompt(promptId, "continue");
          recordOffer(promptId, "continue");
        }
        return { local: { ...local, awaitingPress: true }, passComplete: false };
      }
      noteNode(play, ".33");
      local = { ...local, phase: "check", awaitingPress: false, skullPlaced: false };
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
        offerSkullPlacement(play.dayNumber, ctx);
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
