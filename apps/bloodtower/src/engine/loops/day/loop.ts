import type { LoopContext, LoopDefinition } from "../../loop/types.ts";
import { nextPlayRng, playState } from "../chapter/playState.ts";
import {
  chooseOption,
  commitLedger,
  eventForGroup,
  eventOptions,
  eventState,
  eventTuningFrom,
  loadLedger,
  type OptionId,
  refreshLedger,
  settleEvent,
} from "../event/index.ts";
import { skullNoBuildingEffect } from "../session/effects.ts";
import { recordOffer, requestCheckpoint, shellState } from "../session/shellRef.ts";
import {
  checkChapter,
  type DayLoss,
  ensureClock,
  heroCount,
  noteNode,
  recordSkippedDrop,
  takeSeedKingdom,
} from "./clock.ts";
import { requestMoveRollCue } from "./cues.ts";
import { applyRegroupQueue, regroupQueue } from "./regroup.ts";
import { rollDayMoves } from "./roll.ts";
import { dropsThisNight, kingdomFromD4 } from "./rules.ts";
import { offerSkullPlacement, simulateSkullDrop } from "./skull.ts";
import { type EffectsWait, effectsWaitFor, eventWaitFor } from "./wait.ts";

export type DayPhase =
  | "regroup"
  | "roll"
  | "groups"
  | "skull-prompt"
  | "skull-place"
  | "skull-sim"
  | "effects"
  | "event"
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
  /**
   * The effects panel's wait, as data (C3/20): the engine names it and never times it. The host
   * runs the timer and the audio-end event and answers with `wait-end`. Absent on an old save.
   */
  wait?: EffectsWait | null;
  /** Set by `wait-end`. The body then leaves the wait for the chapter exit check. */
  waitDone?: boolean;
  /**
   * The event scene after a group's turn (C3/12): `choose` while the present heroes pick (or
   * before a no-choice event settles), `result` while its result waits. `eventGroup` is the group.
   */
  eventStage?: "choose" | "result";
  eventGroup?: string | null;
  /** The option a press picked. The body applies it once and clears it. */
  eventPicked?: OptionId | null;
};

/** Prompt id of one event choice (C3/12). The choice list is the same for any event. */
export const EVENT_CHOICE_PREFIX = "event-choice--";
export const eventChoicePromptId = (groupId: string, optionId: OptionId): string =>
  `${EVENT_CHOICE_PREFIX}${groupId}--${optionId}`;

export const parseEventChoicePrompt = (
  promptId: string,
): { groupId: string; optionId: OptionId } | null => {
  if (!promptId.startsWith(EVENT_CHOICE_PREFIX)) return null;
  const [groupId, optionId] = promptId.slice(EVENT_CHOICE_PREFIX.length).split("--");
  if (!groupId || !optionId) return null;
  return { groupId, optionId: optionId as OptionId };
};

export type DayResult = {
  dayNumber: number;
  lost: null | { reason: "skulls" | "buildings" | "corruption" };
};

const freshLocal = (): DayLocal => ({
  wait: null,
  waitDone: false,
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

const heroRoleOf = (heroId: string): string => {
  for (const story of shellState().stories) {
    const hero = story.heroes.find((row) => row.id === heroId);
    if (hero) return hero.card?.role ?? "";
  }
  return "";
};

/** The event scene opens for a group that just finished its turn (C3/12). */
const enterEvent = (local: DayLocal, groupId: string): DayLocal => {
  loadLedger(playState(), groupId, heroRoleOf);
  return {
    ...local,
    phase: "event",
    eventStage: "choose",
    eventGroup: groupId,
    eventPicked: null,
    wait: null,
    waitDone: false,
    awaitingChild: false,
    awaitingPress: false,
  };
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
    takeSeedKingdom(clock) ??
    kingdomFromD4(nextPlayRng(shell.seed, play).roll(clock.tuning.kingdomDie).total);
  let landed = 0;
  for (let i = 0; i < count; i++) {
    const drop = simulateSkullDrop(shell.seed, drawKingdom);
    if (drop.landed) {
      landed += 1;
      // DEC-905, DEC-931: the fatal skull's line shows, then the loss; no later skull is drawn.
      if (clock.outcome?.lost === true) break;
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
  // DEC-912: any night but a won-quest night is counted, then tonight's drop is read from the count.
  clock.nightsCounted += 1;
  const count = heroes < 1 ? 0 : dropsThisNight(heroes, clock.nightsCounted, clock.tuning);
  noteNode(play, ".35");
  if (count < 1 || clock.supply <= 0) {
    noteNode(play, ".33");
    return { ...local, phase: "check", awaitingPress: false, awaitingChild: false, skullsLeft: 0 };
  }
  if (!shell.towerLinked) return simulateDrops(local, count, effects);
  noteNode(play, ".11");
  clock.pendingKingdoms = [];
  clock.expectKingdom = null;
  const seeded = takeSeedKingdom(clock);
  if (seeded) {
    clock.pendingKingdoms = [seeded];
    clock.expectKingdom = seeded;
  }
  return {
    ...local,
    phase: "skull-prompt",
    awaitingPress: false,
    awaitingChild: false,
    skullPlaced: false,
    skullsLeft: count,
  };
};

/**
 * The event scene (C3/12). A choice waits for a press (the present heroes' iPads, first press
 * wins); an event with no choice settles at once. Either way the effect is applied here, once, and
 * the result step then waits like the effects panel: the host answers `wait-end` (audio ended, or
 * the 4 s were up). A Continue replays the same presses and `wait-end`, so nothing applies twice.
 */
const eventScene = (
  local: DayLocal,
  ctx: LoopContext<DayLocal>,
): ReturnType<NonNullable<typeof dayLoop.body>> => {
  const play = playState();
  const shell = shellState();
  const tuning = eventTuningFrom();
  const groupId = local.eventGroup;
  const open = eventState(play).open;
  if (!groupId || !open || open.groupId !== groupId) {
    throw new Error("The day is at an event, but no event is open for the group.");
  }

  if (open.status === "open") {
    // A potion used or gold spent while the choice was open changed the sheets (C3/12 review).
    refreshLedger(play, groupId);
    const picked = local.eventPicked ?? null;
    if (picked === null) {
      const options = eventOptions(play, tuning);
      if (options.length > 0) {
        for (const option of options) {
          if (!option.enabled) continue;
          const promptId = eventChoicePromptId(groupId, option.id);
          ctx.offerPrompt(promptId, "choose");
          recordOffer(promptId, "choose");
        }
        return { local: { ...local, eventStage: "choose" }, passComplete: false };
      }
      settleEvent(play, tuning);
    } else {
      chooseOption(play, tuning, picked);
    }
    commitLedger(play, groupId);
    const gameId = shell.activeGameId ?? shell.autosave?.gameId;
    if (gameId) requestCheckpoint(gameId, play.dayNumber);
  }

  if (open.status === "battle") {
    throw new Error("A fight in an event waits for the battle loop, which is not built yet.");
  }

  if (!local.wait) {
    local = {
      ...local,
      eventStage: "result",
      eventPicked: null,
      wait: eventWaitFor(play.dayNumber, groupId, open.line ?? null),
      waitDone: false,
    };
  }
  if (!local.waitDone) return { local, passComplete: false };
  return dayLoop.body(
    {
      ...local,
      phase: "groups",
      eventStage: undefined,
      eventGroup: null,
      eventPicked: null,
      wait: null,
      waitDone: false,
    },
    ctx,
  );
};

/**
 * MEC-033 .11, the backstop exit check. A skull sets the loss the moment it leaves the supply or
 * lands (DEC-905), so this only finds a loss nothing set earlier; one already set is kept as it is.
 */
const exitCheck = (
  play: ReturnType<typeof playState>,
  clock: ReturnType<typeof ensureClock>,
): DayLoss => {
  noteNode(play, "MEC-033.11");
  if (clock.outcome?.lost !== true) clock.outcome = checkChapter(clock);
  return clock.outcome;
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

    // DEC-676: a loss ends the day at once: no later group, skull, effects panel or event runs.
    // A third corruption stops anywhere. An emptied supply or a fourth fallen building (DEC-905) is
    // set at the skull; the fatal no-tower skull's own line still waits for its press (DEC-931).
    if (clock.outcome?.lost === true && local.phase !== "done") {
      const waitsOnLine = local.phase === "skull-sim" && !local.skullPlaced;
      if (clock.outcome.reason === "corruption" || !waitsOnLine) {
        if (clock.outcome.reason !== "corruption") exitCheck(play, clock);
        local = { ...local, phase: "done", awaitingPress: false, awaitingChild: false };
      }
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
        local = {
          ...local,
          groupIndex: local.groupIndex + 1,
          awaitingChild: false,
          awaitingPress: false,
        };
        // MEC-034 .9: a group that ended in the wild or at a skulled building draws (MEC-072).
        if (eventForGroup(play, shell.seed, finished.groupId, eventTuningFrom())) {
          noteNode(play, ".9");
          local = enterEvent(local, finished.groupId);
        }
      }

      // A hazard's second cost: the group loses its next turn (DEC-027). It is skipped once.
      const lost = eventState(play).lostTurns;
      while (local.phase === "groups") {
        const next = play.turnOrder[local.groupIndex];
        const at = next ? lost.indexOf(next) : -1;
        if (!next || at < 0) break;
        lost.splice(at, 1);
        local = { ...local, groupIndex: local.groupIndex + 1 };
      }

      const groupId = play.turnOrder[local.groupIndex];
      if (local.phase !== "groups") {
        // The event scene is up: its block below runs in this pass.
      } else if (local.groupIndex >= play.turnOrder.length || !groupId) {
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

    if (local.phase === "event") return eventScene(local, ctx);

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
      const more = local.skullsLeft > 0 && clock.supply > 0 && clock.outcome?.lost !== true;
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

    // The effects panel (DEC-699): shown when the night had an effect. The engine only names the
    // wait; it moves on when the host answers `wait-end` (audio ended, or the 4 s were up).
    if (
      local.phase === "check" &&
      !local.waitDone &&
      clock.effects.length > 0 &&
      clock.outcome?.lost !== true
    ) {
      for (const drop of clock.nightDrops) {
        const name = play.content.board.spaceById.get(drop.spaceId)?.name ?? drop.spaceId;
        clock.effects.push(`A skull lands on ${name}.`);
      }
      local = {
        ...local,
        phase: "effects",
        awaitingPress: false,
        wait: effectsWaitFor(play.dayNumber, clock.effectsLine ?? null),
      };
    }

    if (local.phase === "effects") {
      if (!local.waitDone) return { local, passComplete: false };
      local = { ...local, phase: "check", wait: null };
    }

    if (local.phase === "check") {
      exitCheck(play, clock);
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
    if (!clock.outcome) clock.outcome = exitCheck(play, clock);
    return { dayNumber: play.dayNumber, lost: lostOf(clock.outcome) };
  },
};
