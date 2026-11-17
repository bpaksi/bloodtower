import { eventRng } from "@dark-tower/rng";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OPENING_MOMENTS, openingPromptId } from "../../../protocols/opening.ts";
import { AUTO_ADVANCE_MS } from "../../../protocols/v2/views.ts";
import { deserializeShellState, serializeShellState } from "../../../server/core/serialize.ts";
import { gearRows, type MenuContext } from "../../../web/components/device/gearMenu.ts";
import { gainCorruption } from "../../rules/corruption/index.ts";
import { projectDayClock, rollLine } from "../../views/day.ts";
import { citadelForKingdom } from "../chapter/board.ts";
import { initPlayState, type PlayState } from "../chapter/playState.ts";
import { groupTurnLoop, handleGroupTurnPress } from "../group-turn/loop.ts";
import { REGROUP_DROPPED, shellEffectSchema } from "../session/effects.ts";
import { enterConnectEvents } from "../session/enterKit.ts";
import type { ShellEvent } from "../session/events.ts";
import { applyGear } from "../session/gear.ts";
import { TEST_STORY } from "../session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import {
  bindShellState,
  clearShellState,
  takePendingCheckpoint,
  takePendingTowerCommands,
} from "../session/shellRef.ts";
import { initialShellState, type ShellState } from "../session/state.ts";
import { stepShell } from "../session/stepShell.ts";
import { projectShellView } from "../session/view.ts";
import {
  armDayResume,
  captureClock,
  captureDayResume,
  clockLog,
  clockSnapshot,
  configureDayClock,
  dayTrace,
  ensureClock,
  markQuestWon,
  placeTargets,
  rebuildClock,
  recordBuildingDrop,
  restoreClock,
  setBuildingSkulls,
  setHeroSheet,
} from "./clock.ts";
import { MOVE_ROLL_CUE_SOUND_INDEX } from "./cues.ts";
import { type DayLocal, type DayResult, dayLoop } from "./loop.ts";
import { handleDayPress } from "./press.ts";
import {
  applyJoin,
  applySplit,
  partyIsSplit,
  projectedGroups,
  queueRegroupPick,
  regroupPicks,
} from "./regroup.ts";
import { buildingMenu, CITADEL_ABOVE_CLEANSE, dayTuningFrom, kingdomFromD4 } from "./rules.ts";
import {
  applySkullRecord,
  offerSkullPlacement,
  parseSkullRecordPrompt,
  simulateSkullDrop,
  skullRecordPromptId,
} from "./skull.ts";

const setupThroughBegin = () => {
  const events: ShellEvent[] = [
    { kind: "start-session" as const, v: 1 as const, sessionId: "t", seed: "cue-test" },
    { kind: "device-join" as const, v: 1 as const, deviceId: "pad" },
    ...enterConnectEvents("pad").slice(1),
    { kind: "focus-story" as const, v: 1 as const, deviceId: "pad", storyId: "test" },
    {
      kind: "press" as const,
      v: 1 as const,
      deviceId: "pad",
      promptId: "continue-pick-story-test",
      actionId: "continue",
    },
    {
      kind: "press" as const,
      v: 1 as const,
      deviceId: "pad",
      promptId: "continue-game-settings",
      actionId: "continue",
    },
    {
      kind: "hero-hold" as const,
      v: 1 as const,
      deviceId: "pad",
      heroId: "hero-a",
      action: "take",
    },
    {
      kind: "hero-hold" as const,
      v: 1 as const,
      deviceId: "pad",
      heroId: "hero-b",
      action: "take",
    },
    {
      kind: "hero-hold" as const,
      v: 1 as const,
      deviceId: "pad",
      heroId: "hero-c",
      action: "take",
    },
    {
      kind: "hero-hold" as const,
      v: 1 as const,
      deviceId: "pad",
      heroId: "hero-d",
      action: "take",
    },
    {
      kind: "press" as const,
      v: 1 as const,
      deviceId: "pad",
      promptId: "continue-claim-heroes",
      actionId: "continue",
    },
    {
      kind: "press" as const,
      v: 1 as const,
      deviceId: "pad",
      promptId: "continue-setup-seals-and-skulls",
      actionId: "continue",
    },
    {
      kind: "press" as const,
      v: 1 as const,
      deviceId: "pad",
      promptId: "continue-setup-lay-out-board",
      actionId: "continue",
    },
    {
      kind: "press" as const,
      v: 1 as const,
      deviceId: "pad",
      promptId: "continue-setup-place-heroes",
      actionId: "continue",
    },
    {
      kind: "press" as const,
      v: 1 as const,
      deviceId: "pad",
      promptId: "spin-setup-starting-purse",
      actionId: "spin",
    },
    {
      kind: "press" as const,
      v: 1 as const,
      deviceId: "pad",
      promptId: "continue-setup-starting-purse",
      actionId: "continue",
    },
    {
      kind: "press" as const,
      v: 1 as const,
      deviceId: "pad",
      promptId: "continue-begin",
      actionId: "continue",
    },
    ...OPENING_MOMENTS.map((momentId) => ({
      kind: "press" as const,
      v: 1 as const,
      deviceId: "pad",
      promptId: openingPromptId(momentId),
      actionId: "continue" as const,
    })),
  ];
  let state = initialShellState({ sessionId: "t", seed: "cue-test", stories: [TEST_STORY] });
  const towerCues: unknown[] = [];
  for (const event of events) {
    const result = stepShell(state, event);
    state = result.state;
    for (const effect of result.effects) {
      if (effect.kind === "tower-command" && effect.capabilityId === "sound.play-stateful") {
        towerCues.push(effect.params);
      }
    }
  }
  return { state, towerCues };
};

describe("day slice cues and skull record", () => {
  it("emits the move-roll tower cue when the first day starts", () => {
    const { towerCues } = setupThroughBegin();
    expect(towerCues).toContainEqual({
      soundIndex: MOVE_ROLL_CUE_SOUND_INDEX,
      volume: 2,
    });
  });

  it("records skull placement only from a skull-record press", () => {
    const shell = initialShellState({ sessionId: "t", seed: "skull", stories: [TEST_STORY] });
    const play = initPlayState("skull", PROVING_GROUNDS_PLAY);
    play.dayNumber = 1;
    shell.play = play;
    bindShellState(shell);

    const offers: string[] = [];
    offerSkullPlacement(1, {
      offerPrompt: (promptId) => {
        offers.push(promptId);
      },
    });
    expect(offers.length).toBeGreaterThan(10);
    expect(offers).toContain(skullRecordPromptId(1, "inside"));
    expect(play.lastSkull).toBeNull();

    const citadel = play.content.board.spaces.find(
      (s) => s.building === "citadel" && s.kingdom === "E",
    );
    expect(citadel).toBeDefined();
    const parsed = parseSkullRecordPrompt(skullRecordPromptId(1, citadel!.id));
    expect(parsed?.target).toBe(citadel!.id);
    expect(applySkullRecord(1, citadel!.id)).toBe(true);
    expect(play.lastSkull?.spaceId).toBe(citadel!.id);

    clearShellState();
  });
});

type Offer = { promptId: string; actionId: string };

type Harness = {
  play: PlayState;
  shell: ShellState;
  local: DayLocal;
  offers: Offer[];
  child: string | null;
  parent: { groupId?: string } | undefined;
  effects: unknown[];
};

const idleLocal = (): DayLocal => ({
  phase: "regroup",
  groupIndex: 0,
  awaitingPress: false,
  awaitingChild: false,
  skullPlaced: false,
  skullsLeft: 0,
});

const boot = (seed: string, heroes: string[], tower: boolean): Harness => {
  const kingdoms = ["N", "E", "S", "W"] as const;
  const play = initPlayState(seed, {
    ...PROVING_GROUNDS_PLAY,
    start: {
      mode: "one-per-kingdom-citadel",
      assignments: heroes.map((hero, index) => ({
        hero,
        kingdom: kingdoms[index] ?? "N",
      })),
    },
  });
  const shell = initialShellState({ sessionId: "day", seed, stories: [] });
  shell.play = play;
  shell.seed = seed;
  shell.towerLinked = tower;
  bindShellState(shell);
  return {
    play,
    shell,
    local: idleLocal(),
    offers: [],
    child: null,
    parent: undefined,
    effects: [],
  };
};

const closeHarness = (): void => {
  takePendingTowerCommands();
  takePendingCheckpoint();
  clearShellState();
};

const dayCtx = (h: Harness) => ({
  loopId: "day",
  seed: h.shell.seed,
  eventSeq: 1,
  effects: h.effects as never[],
  tracePhase: () => {},
  recordEnd: () => {},
  offerPrompt: (promptId: string, actionId: string) => {
    h.offers.push({ promptId, actionId });
  },
  startChild: () => {
    const input = h.play.childInput;
    h.child = input && input.kind === "group-turn" ? input.groupId : null;
  },
  setParentResult: () => {},
  getParentResult: () => h.parent,
});

const pump = (h: Harness): "prompt" | "child" | "done" | "wait" => {
  h.offers = [];
  h.child = null;
  const result = dayLoop.body(h.local, dayCtx(h));
  h.local = result.local;
  if (result.passComplete) return "done";
  if (h.child) return "child";
  if (h.offers.length > 0) return "prompt";
  return "wait";
};

const beginDay = (h: Harness): "prompt" | "child" | "done" | "wait" => {
  h.local = dayLoop.enter(dayCtx(h));
  return pump(h);
};

const choose = (h: Harness, kind: string, id?: string): Offer => {
  const found = h.offers.find((offer) => {
    if (kind === "split" && id) return offer.promptId.endsWith(`--${id}`);
    if (kind === "record" && id) return offer.promptId.endsWith(`--${id}`);
    if (kind === "record")
      return offer.actionId === "record" && !offer.promptId.endsWith("--inside");
    if (kind === "roll") return offer.promptId.includes("roll-done");
    if (kind === "drop") return offer.promptId.startsWith("skull-drop");
    return offer.actionId === kind;
  });
  if (!found) {
    throw new Error(
      `No ${kind} offer in ${h.local.phase}: ${h.offers.map((offer) => offer.promptId).join(", ")}`,
    );
  }
  return found;
};

const runDay = (
  h: Harness,
  opts?: {
    questWins?: number;
    place?: (index: number) => string | undefined;
    onRoll?: () => void;
    beforeRecord?: () => void;
    /** Called as each group's turn starts, with the group and its moves (CU/04 EV-08). */
    onTurn?: (groupId: string, moves: number) => void;
  },
): DayResult => {
  let status = beginDay(h);
  let wins = opts?.questWins ?? 0;
  let placed = 0;
  for (let guard = 0; guard < 48 && status !== "done"; guard++) {
    if (status === "child") {
      const groupId = h.child;
      if (!groupId) throw new Error("Group turn started without a group.");
      const input = h.play.childInput;
      opts?.onTurn?.(groupId, input?.kind === "group-turn" ? input.moves : -1);
      if (wins > 0) {
        markQuestWon(h.play);
        wins -= 1;
      }
      h.parent = { groupId };
      status = pump(h);
      continue;
    }
    if (status === "wait" && h.local.phase === "event") {
      // The host's part (C3/12): the event's result wait ended, so it answers `wait-end`.
      h.local = { ...h.local, waitDone: true };
      status = pump(h);
      continue;
    }
    const eventChoice = h.offers.find((offer) => offer.actionId === "choose");
    if (status === "prompt" && eventChoice) {
      status = pressOffer(h, eventChoice);
      continue;
    }
    if (status === "wait" && h.local.phase === "effects") {
      // The host's part (C3/20): the wait ended, so it answers `wait-end`.
      h.local = { ...h.local, waitDone: true };
      status = pump(h);
      continue;
    }
    if (status !== "prompt") throw new Error(`Day stuck in ${h.local.phase} (${status}).`);
    if (h.offers.some((offer) => offer.promptId.includes("roll-done"))) {
      opts?.onRoll?.();
      status = pressOffer(h, choose(h, "roll"));
      continue;
    }
    if (h.offers.some((offer) => offer.promptId.startsWith("skull-drop"))) {
      status = pressOffer(h, choose(h, "drop"));
      continue;
    }
    const simulated = h.offers.find((offer) => offer.promptId.startsWith("skull-sim-day-"));
    if (simulated) {
      status = pressOffer(h, simulated);
      continue;
    }
    if (h.offers.some((offer) => offer.actionId === "record")) {
      opts?.beforeRecord?.();
      status = pressOffer(h, choose(h, "record", opts?.place?.(placed)));
      placed += 1;
      continue;
    }
    throw new Error(`Unhandled offers: ${h.offers.map((offer) => offer.promptId).join(", ")}`);
  }
  if (status !== "done") throw new Error(`Day did not finish (${h.local.phase}).`);
  return dayLoop.resultUp(h.local, dayCtx(h));
};

const pressOffer = (h: Harness, offer: Offer): "prompt" | "child" | "done" | "wait" => {
  h.local = handleDayPress(h.local, offer.promptId, offer.actionId);
  return pump(h);
};

const groupSignature = (play: PlayState): string =>
  play.groups
    .map((group) => `${group.id}:${[...group.heroIds].sort().join("+")}`)
    .sort()
    .join("|");

describe("C3 04 day clock", () => {
  it("EV-01 move roll is seeded 2d3, floor 2, with virtue and corruption shifts", () => {
    const seed = "ev-01";
    const h = boot(seed, ["vera", "cain", "cain2"], false);
    try {
      const board = h.play.content.board;
      setHeroSheet(h.play, "vera", { helpingVirtues: 1, corruptions: 0 });
      setHeroSheet(h.play, "cain", { helpingVirtues: 0, corruptions: 2 });
      setHeroSheet(h.play, "cain2", { helpingVirtues: 0, corruptions: 1 });
      h.play.groups = [
        {
          id: "virtue",
          heroIds: ["vera"],
          spaceId: citadelForKingdom(board, "N").id,
          insideBuilding: false,
          order: 0,
        },
        {
          id: "corrupt",
          heroIds: ["cain", "cain2"],
          spaceId: citadelForKingdom(board, "E").id,
          insideBuilding: false,
          order: 1,
        },
      ];
      h.play.turnOrder = ["virtue", "corrupt"];
      expect(h.play.rngSeq).toBe(1);
      // No Regroup prompt (CU/04): the day start goes straight to the roll.
      const status = beginDay(h);
      expect(status).toBe("prompt");
      expect(h.offers.map((offer) => offer.promptId)).toEqual(["day-1-roll-done"]);
      const shifts = ensureClock(h.play).shifts;
      const virtue = shifts.virtue;
      const corrupt = shifts.corrupt;
      expect(virtue).toBeDefined();
      expect(corrupt).toBeDefined();
      expect(eventRng(seed, 1).roll("2d3").total).toBe(virtue?.raw);
      expect(eventRng(seed, 2).roll("2d3").total).toBe(corrupt?.raw);
      // Two groups: the party is split, so each also takes the split shift (PT-06, CU/04).
      expect(virtue).toMatchObject({
        virtue: 1,
        corruption: 0,
        split: -1,
        total: Math.max(2, (virtue?.raw ?? 0) + 1 - 1),
      });
      expect(corrupt).toMatchObject({
        virtue: 0,
        corruption: -2,
        split: -1,
        total: Math.max(2, (corrupt?.raw ?? 0) - 2 - 1),
      });
      expect(virtue?.total).toBeGreaterThanOrEqual(2);
      expect(corrupt?.total).toBeGreaterThanOrEqual(2);

      closeHarness();
      const heavy = boot("ev-01-floor", ["burden"], false);
      setHeroSheet(heavy.play, "burden", { helpingVirtues: 0, corruptions: 5 });
      beginDay(heavy);
      const weighed = ensureClock(heavy.play).shifts.burden;
      expect(weighed).toBeDefined();
      expect((weighed?.raw ?? 0) + (weighed?.corruption ?? 0)).toBeLessThan(2);
      expect(weighed?.total).toBe(2);
    } finally {
      closeHarness();
    }
  });

  it("EV-02 drops one skull a night for two heroes and 1,2,1,2 for three or four", () => {
    const nights = (label: string, heroes: string[]): number[] => {
      const h = boot(`ev-02-${label}`, heroes, false);
      try {
        const drops: number[] = [];
        for (let night = 0; night < 4; night++) {
          const before = ensureClock(h.play).supply;
          runDay(h);
          drops.push(before - ensureClock(h.play).supply);
        }
        return drops;
      } finally {
        closeHarness();
      }
    };
    expect(nights("two", ["a", "b"])).toEqual([1, 1, 1, 1]);
    expect(nights("four", ["a", "b", "c", "d"])).toEqual([1, 2, 1, 2]);
    expect(nights("three", ["a", "b", "c"])).toEqual([1, 2, 1, 2]);
  });

  it("EV-03 a won quest skips the whole night, and two wins still skip one night", () => {
    const control = boot("ev-03-control", ["a", "b", "c", "d"], false);
    try {
      runDay(control);
      const beforeEven = ensureClock(control.play).supply;
      runDay(control);
      expect(beforeEven - ensureClock(control.play).supply).toBe(2);
    } finally {
      closeHarness();
    }

    const h = boot("ev-03", ["a", "b", "c", "d"], false);
    try {
      runDay(h);
      const before = ensureClock(h.play).supply;
      runDay(h, { questWins: 1 });
      expect(ensureClock(h.play).supply).toBe(before);
      expect(ensureClock(h.play).effects).toEqual(["+1 day"]);
      runDay(h);
      const beforeSecond = ensureClock(h.play).supply;
      runDay(h, { questWins: 2 });
      expect(ensureClock(h.play).supply).toBe(beforeSecond);
      expect(ensureClock(h.play).effects).toEqual(["+1 day"]);
    } finally {
      closeHarness();
    }
  });

  it("EV-04 days left follows the night pattern, not the raw skull count", () => {
    const tuning = dayTuningFrom();
    const two = projectDayClock({ supply: 12, heroes: 2, night: 1, tuning });
    const four = projectDayClock({ supply: 12, heroes: 4, night: 1, tuning });
    const early = projectDayClock({ supply: 2, heroes: 4, night: 1, tuning });
    expect(two.daysLeft).toBe(12);
    expect(four.daysLeft).toBe(8);
    expect(early.daysLeft).toBe(2);
  });

  it("EV-05 an empty supply after the drop loses at the chapter check", () => {
    const h = boot("ev-05", ["a", "b"], false);
    try {
      configureDayClock(h.play, { supply: 1 });
      const result = runDay(h, {
        beforeRecord: () => {
          expect(ensureClock(h.play).supply).toBe(1);
          expect(ensureClock(h.play).outcome).toBeNull();
        },
      });
      expect(ensureClock(h.play).supply).toBe(0);
      expect(result.lost).toEqual({ reason: "skulls" });
      const nodes = dayTrace(h.play).nodes;
      expect(nodes.lastIndexOf("MEC-033.11")).toBeGreaterThan(nodes.lastIndexOf(".19"));
    } finally {
      closeHarness();
    }
  });

  it("EV-06 the 4th skull destroys a building and shrinks the menu on the way", () => {
    const h = boot("ev-06", ["a"], false);
    try {
      const citadel = h.play.content.board.spaces.find((space) => space.building === "citadel");
      expect(citadel).toBeDefined();
      const spaceId = citadel?.id ?? "";
      const expected = [
        ["Rally", "Virtue draw", "Cleanse", "Leave"],
        ["Rally", "Cleanse", "Leave"],
        ["Cleanse", "Leave"],
        ["Cleanse", "Leave"],
        [],
      ];
      expect(buildingMenu(CITADEL_ABOVE_CLEANSE, 0, false)).toEqual(expected[0]);
      for (let skulls = 1; skulls <= 4; skulls++) {
        expect(recordBuildingDrop(h.play, spaceId, citadel?.kingdom ?? "N")).toBe(true);
        const count = ensureClock(h.play).skulls[spaceId] ?? 0;
        expect(buildingMenu(CITADEL_ABOVE_CLEANSE, count, false)).toEqual(expected[skulls]);
      }
      expect(buildingMenu(CITADEL_ABOVE_CLEANSE, 1, true)).toEqual([
        "Quest",
        "Rally",
        "Cleanse",
        "Leave",
      ]);
      expect(buildingMenu(CITADEL_ABOVE_CLEANSE, 3, true)).toEqual(["Quest", "Cleanse", "Leave"]);
      expect(buildingMenu(CITADEL_ABOVE_CLEANSE, 4, true)).toEqual([]);
      expect(ensureClock(h.play).skulls[spaceId]).toBe(4);
      expect(placeTargets(h.play)).not.toContain(spaceId);

      const group = h.play.groups[0];
      expect(group).toBeDefined();
      if (!group) return;
      group.spaceId = spaceId;
      const offers: string[] = [];
      groupTurnLoop.body(
        {
          groupId: group.id,
          movesLeft: 2,
          awaitingPress: false,
          encounterPending: false,
          landedOnBuildingWithNoMoves: false,
        },
        {
          loopId: "group-turn",
          seed: "ev-06",
          eventSeq: 1,
          effects: [],
          tracePhase: () => {},
          recordEnd: () => {},
          offerPrompt: (_promptId, actionId) => offers.push(actionId),
          startChild: () => {},
          setParentResult: () => {},
          getParentResult: () => undefined,
        },
      );
      expect(offers).not.toContain("enter");
      expect(
        handleGroupTurnPress(
          {
            groupId: group.id,
            movesLeft: 2,
            awaitingPress: true,
            encounterPending: false,
            landedOnBuildingWithNoMoves: false,
          },
          `enter--${group.id}--${spaceId}`,
          "enter",
        ).movesLeft,
      ).toBe(2);
      expect(group.insideBuilding).toBe(false);
    } finally {
      closeHarness();
    }
  });

  it("EV-07 without the tower the drop is one seeded kingdom and nothing is held", () => {
    const h = boot("ev-07", ["a", "b"], false);
    try {
      let seq = 0;
      runDay(h, {
        onRoll: () => {
          seq = h.play.rngSeq;
        },
      });
      const kingdom = kingdomFromD4(eventRng(h.shell.seed, seq).roll("d4").total);
      expect(ensureClock(h.play).nightDrops).toEqual([
        { kingdom, spaceId: h.play.lastSkull?.spaceId },
      ]);
      expect(h.play.lastSkull?.spaceId).not.toBe("inside");
      expect(ensureClock(h.play).held).toBe(0);
      expect(takePendingTowerCommands()).toEqual([]);
      expect(dayTrace(h.play).nodes).toContain(".36");
      expect(dayTrace(h.play).nodes).not.toContain(".11");
    } finally {
      closeHarness();
    }
  });

  it("EV-08 the day start is the only step that splits or joins (CU/04: queued)", () => {
    const h = boot("ev-08", ["a", "b"], false);
    try {
      const board = h.play.content.board;
      h.play.groups = [
        {
          id: "G",
          heroIds: ["a", "b"],
          spaceId: citadelForKingdom(board, "N").id,
          insideBuilding: false,
          order: 0,
        },
      ];
      h.play.turnOrder = ["G"];
      const group = h.play.groups[0];
      expect(group).toBeDefined();
      if (!group) return;
      const before = groupSignature(h.play);
      const turned = handleGroupTurnPress(
        {
          groupId: group.id,
          movesLeft: 2,
          awaitingPress: true,
          encounterPending: false,
          landedOnBuildingWithNoMoves: false,
        },
        "regroup-split--G--a",
        "split",
      );
      expect(turned.movesLeft).toBe(2);
      expect(groupSignature(h.play)).toBe(before);
      handleDayPress(
        { ...idleLocal(), phase: "roll", awaitingPress: true },
        "regroup-split--G--a",
        "split",
      );
      expect(groupSignature(h.play)).toBe(before);
      // Nothing queued: the day start asks nothing and splits nothing.
      expect(beginDay(h)).toBe("prompt");
      expect(h.offers.map((offer) => offer.promptId)).toEqual(["day-1-roll-done"]);
      expect(groupSignature(h.play)).toBe(before);
      closeHarness();
      const q = boot("ev-08-queued", ["a", "b"], false);
      q.play.groups = structuredClone(h.play.groups);
      q.play.turnOrder = ["G"];
      expect(queueRegroupPick(q.play, "split", "a", "pad")).toBe(true);
      expect(groupSignature(q.play)).toBe(before);
      beginDay(q);
      expect(q.play.groups).toHaveLength(2);
    } finally {
      closeHarness();
    }
  });

  it("EV-09 a queued split applies at a day start, then a queued rejoin the next", () => {
    const h = boot("ev-09", ["hero-a", "hero-b"], false);
    try {
      const spaceId = citadelForKingdom(h.play.content.board, "N").id;
      h.play.groups = [
        {
          id: "G",
          heroIds: ["hero-a", "hero-b"],
          spaceId,
          insideBuilding: false,
          order: 0,
        },
      ];
      h.play.turnOrder = ["G"];
      queueRegroupPick(h.play, "split", "hero-a", "pad");
      runDay(h);
      expect(h.play.groups).toHaveLength(2);
      expect(new Set(ensureClock(h.play).turns).size).toBe(2);
      expect(regroupPicks(h.play)).toContainEqual({ kind: "join", heroId: "hero-a" });
      // The groups walked nowhere (the harness ends each turn in place): they still share a space.
      queueRegroupPick(h.play, "join", "hero-b", "pad");
      expect(h.play.groups).toHaveLength(2);
      beginDay(h);
      expect(h.play.groups).toHaveLength(1);
    } finally {
      closeHarness();
    }
  });

  it("EV-10 groups act in creation order, a split-off group last", () => {
    const h = boot("ev-10", ["hero-a", "hero-b", "hero-c"], false);
    try {
      const board = h.play.content.board;
      h.play.groups = [
        {
          id: "A",
          heroIds: ["hero-c"],
          spaceId: citadelForKingdom(board, "N").id,
          insideBuilding: false,
          order: 0,
        },
        {
          id: "B",
          heroIds: ["hero-b", "hero-a"],
          spaceId: citadelForKingdom(board, "E").id,
          insideBuilding: false,
          order: 1,
        },
      ];
      h.play.turnOrder = ["A", "B"];
      queueRegroupPick(h.play, "split", "hero-a", "pad");
      runDay(h);
      expect(ensureClock(h.play).turns).toEqual(["A", "B", "split-hero-a-2"]);
    } finally {
      closeHarness();
    }
  });

  it("EV-11 three days never run the adversary move", () => {
    const h = boot("ev-11", ["a", "b"], false);
    try {
      runDay(h);
      runDay(h);
      runDay(h);
      const trace = dayTrace(h.play);
      expect(trace.nodes.filter((node) => node === ".5").length).toBeGreaterThanOrEqual(3);
      expect(trace.nodes).not.toContain(".23");
      expect(trace.events.every((event) => !event.kind.includes("adversary"))).toBe(true);
    } finally {
      closeHarness();
    }
  });

  it("EV-12 four fallen buildings lose, and the tuning key can raise that", () => {
    const fell = (
      tuning?: unknown,
    ): { lost: DayResult["lost"]; fallen: number; supply: number } => {
      const h = boot(`ev-12-${tuning ? "five" : "four"}`, ["a", "b"], true);
      try {
        if (tuning) configureDayClock(h.play, { tuning, supply: 24 });
        const buildings = h.play.content.board.spaces.filter((space) => space.building).slice(0, 4);
        expect(buildings).toHaveLength(4);
        for (const space of buildings) setBuildingSkulls(h.play, space.id, 3);
        let last: DayResult = { dayNumber: 0, lost: null };
        for (let index = 0; index < 4; index++) {
          const spaceId = buildings[index]?.id;
          last = runDay(h, {
            place: () => spaceId,
            beforeRecord: () => {
              if (index === 3) expect(ensureClock(h.play).outcome).toBeNull();
            },
          });
          if (index < 3) expect(last.lost).toBeNull();
        }
        const fallen = Object.values(ensureClock(h.play).skulls).filter(
          (count) => count >= 4,
        ).length;
        return { lost: last.lost, fallen, supply: ensureClock(h.play).supply };
      } finally {
        closeHarness();
      }
    };

    const atFour = fell();
    expect(atFour.supply).toBeGreaterThan(0);
    expect(atFour.fallen).toBe(4);
    expect(atFour.lost).toEqual({ reason: "buildings" });

    const atFive = fell({ loss: { fallen_buildings: 5 } });
    expect(atFive.fallen).toBe(4);
    expect(atFive.lost).toBeNull();
  });

  it("EV-13 continue at a group turn does not re-roll, and the next drop matches", () => {
    const finishFromTurn = (h: Harness): void => {
      let status: "prompt" | "child" | "done" | "wait" = "child";
      for (let guard = 0; guard < 48 && status !== "done"; guard++) {
        if (status === "child") {
          const groupId = h.child ?? h.play.turnOrder[h.local.groupIndex];
          if (!groupId) throw new Error("Continue lost the group turn.");
          h.parent = { groupId };
          status = pump(h);
          continue;
        }
        if (status !== "prompt") throw new Error(`Continue stuck in ${h.local.phase}.`);
        const offer = h.offers.some((row) => row.promptId.includes("roll-done"))
          ? choose(h, "roll")
          : h.offers.some((row) => row.promptId.startsWith("skull-drop"))
            ? choose(h, "drop")
            : h.offers.some((row) => row.promptId.startsWith("skull-sim-day-"))
              ? (h.offers.find((row) => row.promptId.startsWith("skull-sim-day-")) as Offer)
              : choose(h, "record");
        status = pressOffer(h, offer);
      }
      if (status !== "done") throw new Error("Continue did not finish the day.");
    };

    const reach = (seed: string): Harness => {
      const h = boot(seed, ["a", "b"], false);
      runDay(h);
      runDay(h);
      let status = beginDay(h);
      while (status !== "child") {
        if (status !== "prompt") throw new Error(`Could not reach day 3 (${h.local.phase}).`);
        status = pressOffer(h, choose(h, "roll"));
      }
      return h;
    };

    const full = reach("ev-13");
    let uninterrupted: { kingdom: string; spaceId: string }[];
    let rolls: Record<string, number>;
    try {
      rolls = { ...full.play.dayRolls };
      const savedSeq = full.play.rngSeq;
      finishFromTurn(full);
      uninterrupted = ensureClock(full.play).nightDrops.map((drop) => ({ ...drop }));
      expect(full.play.rngSeq).toBeGreaterThan(savedSeq);
    } finally {
      closeHarness();
    }

    const resumed = reach("ev-13");
    try {
      expect(resumed.play.dayRolls).toEqual(rolls);
      const resume = captureDayResume(resumed.play, resumed.local);
      resumed.shell.towerLinked = true;
      takePendingTowerCommands();
      armDayResume(resumed.play, resume);
      resumed.local = dayLoop.enter(dayCtx(resumed));
      expect(takePendingTowerCommands()).toEqual([]);
      expect(resumed.play.dayRolls).toEqual(rolls);
      expect(resumed.play.rngSeq).toBe(resume.rngSeq);
      resumed.shell.towerLinked = false;
      resumed.child = resumed.play.turnOrder[resumed.local.groupIndex] ?? null;
      finishFromTurn(resumed);
      expect(ensureClock(resumed.play).nightDrops).toEqual(uninterrupted);
    } finally {
      closeHarness();
    }
  });

  it("EV-14 a restart rebuilt from the event log keeps supply and skulls", () => {
    const h = boot("ev-14", ["a", "b"], false);
    try {
      runDay(h);
      runDay(h);
      const live = clockSnapshot(h.play);
      const tuning = dayTuningFrom();
      const rebuilt = rebuildClock(tuning, clockLog(h.play));
      expect(rebuilt).toEqual(live);
      expect(rebuilt.supply).toBeLessThan(tuning.supply);
      expect(rebuilt.skulls).toEqual(live.skulls);
    } finally {
      closeHarness();
    }
  });
});

/** The die faces a test hands the draw, in order; `draws` counts how many were taken. */
const faces = (...order: Array<"N" | "E" | "S" | "W">) => {
  let draws = 0;
  return {
    draw: () => {
      const next = order[draws];
      draws += 1;
      if (!next) throw new Error("The test stream ran out of kingdom draws.");
      return next;
    },
    get draws() {
      return draws;
    },
  };
};

const inKingdom = (h: Harness, kingdom: string): string[] =>
  h.play.content.board.spaces
    .filter((space) => space.building && space.kingdom === kingdom)
    .map((space) => space.id);

const setCounts = (h: Harness, ids: string[], counts: number[]): void => {
  ids.forEach((id, index) => {
    setBuildingSkulls(h.play, id, counts[index] ?? 0);
  });
};

const landing = (
  seed: string,
  setup: (h: Harness) => void,
  order: Array<"N" | "E" | "S" | "W">,
) => {
  const h = boot(seed, ["a", "b"], false);
  try {
    setup(h);
    const stream = faces(...order);
    const result = simulateSkullDrop(seed, stream.draw);
    return { result, draws: stream.draws, skulls: { ...ensureClock(h.play).skulls }, h };
  } finally {
    closeHarness();
  }
};

const seeds = (count: number): string[] => Array.from({ length: count }, (_, i) => `cu03-${i}`);

describe("CU/03 no-tower skull drop (PT-07)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("EV-01 sim drop picks fewest skulls", () => {
    for (const seed of seeds(30)) {
      const row = landing(seed, (h) => setCounts(h, inKingdom(h, "N"), [2, 0, 1, 3]), ["N"]);
      const ids = ["N-egans-end", "N-dayside", "N-upper-ice-fangs", "N-radiant-mountains"];
      expect(row.result).toEqual({ landed: true, spaceId: ids[1] });
      expect(ids.map((id) => row.skulls[id] ?? 0)).toEqual([2, 1, 1, 3]);
    }
  });

  it("EV-02 ties go to the seeded pick", () => {
    const ids = ["N-egans-end", "N-dayside", "N-upper-ice-fangs"];
    const seen = new Set<string>();
    for (const seed of seeds(60)) {
      const row = landing(seed, (h) => setCounts(h, inKingdom(h, "N"), [0, 0, 0, 2]), ["N"]);
      if (!row.result.landed) throw new Error("A tied drop must land.");
      expect(ids).toContain(row.result.spaceId);
      seen.add(row.result.spaceId);
    }
    expect(seen.size).toBe(3);
    const again = (): unknown =>
      landing("cu03-S", (h) => setCounts(h, inKingdom(h, "N"), [0, 0, 0, 2]), ["N"]).result;
    expect(again()).toEqual(again());
  });

  it("EV-03 counts are read again between skulls of one night", () => {
    const h = boot("ev-03", ["a", "b", "c", "d"], false);
    try {
      const tuning = {
        skulls: {
          drops_a_night: { heroes_3_to_4: { each_night: 3 } },
          simulated_drop: { kingdom_die: "1d1" },
        },
      };
      configureDayClock(h.play, { tuning, supply: 24 });
      const north = inKingdom(h, "N");
      // citadel last: it is fallen, the other three stand with one skull each.
      setCounts(h, north, [1, 1, 1, 4]);
      runDay(h);
      const drops = ensureClock(h.play).nightDrops.map((drop) => drop.spaceId);
      expect(drops).toHaveLength(3);
      expect(new Set(drops).size).toBe(3);
      const counts = ensureClock(h.play).skulls;
      expect(north.slice(0, 3).map((id) => counts[id])).toEqual([2, 2, 2]);
    } finally {
      closeHarness();
    }
  });

  it("EV-04 a fallen building never takes a skull", () => {
    for (const seed of seeds(20)) {
      const row = landing(seed, (h) => setCounts(h, inKingdom(h, "N"), [4, 3, 4, 4]), ["N"]);
      expect(row.result).toEqual({ landed: true, spaceId: "N-dayside" });
      expect(row.skulls["N-egans-end"]).toBe(4);
    }
  });

  it("EV-05 an empty kingdom rerolls once", () => {
    for (const seed of seeds(10)) {
      const h = boot(seed, ["a", "b"], false);
      try {
        setCounts(h, inKingdom(h, "N"), [4, 4, 4, 4]);
        const first = faces("N", "E");
        const result = simulateSkullDrop(seed, first.draw);
        expect(result.landed).toBe(true);
        if (!result.landed) continue;
        expect(h.play.content.board.spaceById.get(result.spaceId)?.kingdom).toBe("E");
        expect(first.draws).toBe(2);
        const next = faces("S");
        expect(simulateSkullDrop(seed, next.draw).landed).toBe(true);
        expect(next.draws).toBe(1);
      } finally {
        closeHarness();
      }
    }
  });

  it("EV-15 a rerolled kingdom that is also empty drops no skull and logs one error", () => {
    for (const seed of seeds(20)) {
      const h = boot(seed, ["a", "b", "c", "d"], false);
      try {
        setCounts(h, inKingdom(h, "N"), [4, 4, 4, 4]);
        setCounts(h, inKingdom(h, "E"), [4, 4, 4, 4]);
        const supply = ensureClock(h.play).supply;
        const before = { ...ensureClock(h.play).skulls };
        const stream = faces("N", "E");
        expect(simulateSkullDrop(seed, stream.draw)).toEqual({
          landed: false,
          reason: "no-building",
        });
        expect(stream.draws).toBe(2);
        expect(ensureClock(h.play).supply).toBe(supply);
        expect(ensureClock(h.play).skulls).toEqual(before);
        const next = faces("S");
        expect(simulateSkullDrop(seed, next.draw).landed).toBe(true);
        expect(next.draws).toBe(1);
      } finally {
        closeHarness();
      }
    }
  });

  it("EV-15 the night logs one skull-no-building error the host accepts, and shows no line", () => {
    const h = boot("ev-15-loop", ["a", "b"], false);
    try {
      // N and E all fallen; the die is always N then E, so every drawn skull finds nothing.
      configureDayClock(h.play, {
        tuning: { skulls: { simulated_drop: { kingdom_die: "1d1" } } },
        supply: 24,
      });
      setCounts(h, inKingdom(h, "N"), [4, 4, 4, 4]);
      runDay(h);
      const errors = h.effects.filter(
        (effect) => (effect as { kind?: string }).kind === "press-error",
      );
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({ code: "skull-no-building" });
      expect(shellEffectSchema.safeParse(errors[0]).success).toBe(true);
      expect(ensureClock(h.play).nightDrops).toEqual([]);
      expect(ensureClock(h.play).supply).toBe(24);
      // No skull line is shown for it: the board view of that night carries none.
      h.shell.loops.stack.push({
        loopId: "day",
        phase: "body",
        local: { ...h.local, phase: "skull-sim" },
      } as never);
      h.shell.screen = "play";
      const skull = projectShellView(h.shell).table?.skull;
      expect(skull).toBeDefined();
      expect(skull?.lines).toEqual([]);
    } finally {
      closeHarness();
    }
  });

  it("EV-09 no unseeded randomness: a replay lands the same, another seed differs", () => {
    vi.spyOn(globalThis.Math, "random").mockImplementation(() => {
      throw new Error("Ambient randomness is not the seeded stream.");
    });
    const run = (seed: string): string[] => {
      const h = boot(seed, ["a", "b"], false);
      try {
        setCounts(h, inKingdom(h, "N"), [0, 0, 0, 0]);
        runDay(h);
        runDay(h);
        runDay(h);
        return clockLog(h.play).flatMap((event) => (event.kind === "drop" ? [event.spaceId] : []));
      } finally {
        closeHarness();
      }
    };
    const a = run("ev-09");
    expect(run("ev-09")).toEqual(a);
    expect(a.length).toBeGreaterThan(0);
    const others = seeds(10).map((seed) => run(seed));
    expect(others.some((row) => row.join() !== a.join())).toBe(true);
  });

  it("EV-11 the same seed and log land the same skulls after a rebuild", () => {
    const play3 = (): { landed: string[]; h: Harness } => {
      const h = boot("ev-11", ["a", "b"], false);
      runDay(h);
      runDay(h);
      runDay(h);
      return {
        landed: clockLog(h.play).flatMap((event) => (event.kind === "drop" ? [event.spaceId] : [])),
        h,
      };
    };
    const first = play3();
    const live = clockSnapshot(first.h.play);
    const log = clockLog(first.h.play);
    closeHarness();
    const second = play3();
    try {
      expect(second.landed).toEqual(first.landed);
      expect(first.landed.length).toBeGreaterThan(0);
      expect(rebuildClock(dayTuningFrom(), log).skulls).toEqual(live.skulls);
    } finally {
      closeHarness();
    }
  });

  it("EV-12 and EV-13 counts, supply and the fallen set survive Continue, and fallen stays fallen", () => {
    const h = boot("ev-12-cu03", ["a", "b"], false);
    try {
      setCounts(h, inKingdom(h, "N"), [4, 3, 3, 3]);
      runDay(h);
      runDay(h);
      const clock = ensureClock(h.play);
      const saved = captureClock(h.play);
      if (!saved) throw new Error("No clock to save.");
      const before = {
        skulls: { ...clock.skulls },
        supply: clock.supply,
        nightDrops: [...clock.nightDrops],
      };
      const fresh = boot("ev-12-cu03", ["a", "b"], false);
      restoreClock(fresh.play, saved);
      const restored = ensureClock(fresh.play);
      expect(restored.skulls).toEqual(before.skulls);
      expect(restored.supply).toBe(before.supply);
      expect(restored.nightDrops).toEqual(before.nightDrops);
      const fallenBefore = Object.keys(before.skulls).filter((id) => (before.skulls[id] ?? 0) >= 4);
      runDay(fresh);
      for (const id of fallenBefore)
        expect(ensureClock(fresh.play).skulls[id]).toBe(before.skulls[id]);
    } finally {
      closeHarness();
    }
  });
});

/** A rngSeq where the next draws of 2d3 on `seed` read `raws`, in order (EV-05 fixes the roll). */
const seqWithRaws = (seed: string, raws: number[]): number => {
  for (let seq = 1; seq < 5000; seq++) {
    if (raws.every((raw, index) => eventRng(seed, seq + index).roll("2d3").total === raw))
      return seq;
  }
  throw new Error(`No stream position on ${seed} reads ${raws.join(", ")}.`);
};

const oneSpace = (h: Harness, groups: Array<{ id: string; heroIds: string[] }>): string => {
  const spaceId = citadelForKingdom(h.play.content.board, "N").id;
  h.play.groups = groups.map((group, order) => ({
    id: group.id,
    heroIds: [...group.heroIds],
    spaceId,
    insideBuilding: false,
    order,
  }));
  h.play.turnOrder = groups.map((group) => group.id);
  return spaceId;
};

const pressErrors = (h: Harness) =>
  h.effects.filter((effect) => (effect as { kind?: string }).kind === "press-error") as Array<{
    code: string;
    message: string;
    deviceId?: string;
  }>;

const MENU: MenuContext = {
  inGame: true,
  beforeBegin: false,
  sessionScreen: false,
  towerConnected: false,
  partySplit: false,
  regroupOpen: true,
  blockedItem: null,
};

const splitLabel = (h: Harness): string =>
  gearRows({ ...MENU, partySplit: partyIsSplit(h.play) }).find((row) => row.id === "split-party")
    ?.label ?? "missing";

/** A gear pick the way an iPad sends it on its open Split party panel. */
const gearPick = (h: Harness, kind: "split" | "join", heroId: string, deviceId = "pad") => {
  let state = applyGear(h.shell, { deviceId, action: "open", item: "split-party" });
  state = applyGear(state, { deviceId, action: "pick", item: "split", pick: kind, heroId });
  state = applyGear(state, { deviceId, action: "done" });
  h.shell = state;
  bindShellState(state);
};

describe("CU/04 queued split and rejoin (PT-18, PT-06)", () => {
  it("EV-02 Split party offers only heroes in a group of 2 or more, and a pick only queues", () => {
    const h = boot("cu04-ev02", ["hero-a", "hero-b", "hero-c"], false);
    try {
      oneSpace(h, [{ id: "G", heroIds: ["hero-a", "hero-b"] }]);
      h.play.groups.push({
        id: "L",
        heroIds: ["hero-c"],
        spaceId: citadelForKingdom(h.play.content.board, "S").id,
        insideBuilding: false,
        order: 1,
      });
      h.play.turnOrder = ["G", "L"];
      const splits = regroupPicks(h.play).filter((pick) => pick.kind === "split");
      expect(splits.map((pick) => pick.heroId)).toEqual(["hero-a", "hero-b"]);
      const row = gearRows({ ...MENU, partySplit: partyIsSplit(h.play) }).find(
        (item) => item.id === "split-party",
      );
      expect(row).toMatchObject({ label: "Split party", enabled: true, reason: null, panel: true });
      const before = groupSignature(h.play);
      gearPick(h, "split", "hero-b");
      expect(h.play.regroupQueue).toEqual([{ kind: "split", heroId: "hero-b", deviceId: "pad" }]);
      expect(groupSignature(h.play)).toBe(before);
      h.shell.screen = "play";
      h.play.dayNumber = 1;
      expect(projectShellView(h.shell).gear?.regroup?.queue).toEqual([
        { kind: "split", heroId: "hero-b", name: "hero-b" },
      ]);
      // A lone hero is never offered: a pick for hero-c changes nothing.
      gearPick(h, "split", "hero-c");
      expect(h.play.regroupQueue).toHaveLength(1);
    } finally {
      closeHarness();
    }
  });

  it("EV-03 a queued split applies at the next day start, before the roll, once", () => {
    const h = boot("cu04-ev03", ["hero-a", "hero-b"], false);
    try {
      oneSpace(h, [{ id: "G", heroIds: ["hero-a", "hero-b"] }]);
      runDay(h);
      runDay(h, {
        onTurn: () => {
          if ((h.play.regroupQueue ?? []).length === 0) gearPick(h, "split", "hero-b");
        },
      });
      expect(h.play.dayNumber).toBe(2);
      expect(Object.keys(ensureClock(h.play).shifts)).toEqual(["G"]);
      expect(h.play.groups).toHaveLength(1);
      expect(h.play.regroupQueue).toHaveLength(1);

      expect(beginDay(h)).toBe("prompt");
      expect(h.play.dayNumber).toBe(3);
      expect(h.play.groups).toHaveLength(2);
      const last = h.play.turnOrder.at(-1);
      const splitOff = h.play.groups.find((group) => group.id === last);
      expect(splitOff?.heroIds).toEqual(["hero-b"]);
      expect(splitOff?.order).toBe(Math.max(...h.play.groups.map((group) => group.order)));
      expect(Object.keys(ensureClock(h.play).shifts).sort()).toEqual([...h.play.turnOrder].sort());
      expect(h.play.regroupQueue).toEqual([]);
      expect(h.play.regroupCardDay).toBe(3);
      expect(dayTrace(h.play).nodes).toContain(".38");

      // Day 4 adds no further split and shows no card.
      runDay(h);
      expect(h.play.dayNumber).toBe(4);
      expect(h.play.groups).toHaveLength(2);
      expect(h.play.regroupCardDay).toBeNull();
    } finally {
      closeHarness();
    }
  });

  it("EV-04 Rejoin is queued the same way; the merged group keeps the older place", () => {
    const h = boot("cu04-ev04", ["hero-a", "hero-b"], false);
    try {
      oneSpace(h, [
        { id: "G", heroIds: ["hero-a"] },
        { id: "S", heroIds: ["hero-b"] },
      ]);
      runDay(h);
      runDay(h);
      expect(splitLabel(h)).toBe("Rejoin party");
      runDay(h, {
        onTurn: () => {
          if ((h.play.regroupQueue ?? []).length === 0) gearPick(h, "join", "hero-b");
        },
      });
      expect(h.play.dayNumber).toBe(3);
      expect(h.play.groups).toHaveLength(2);
      expect(splitLabel(h)).toBe("Rejoin party");
      expect(beginDay(h)).toBe("prompt");
      expect(h.play.groups).toEqual([
        expect.objectContaining({ id: "G", heroIds: ["hero-a", "hero-b"], order: 0 }),
      ]);
      expect(h.play.turnOrder).toEqual(["G"]);
      expect(Object.keys(ensureClock(h.play).shifts)).toEqual(["G"]);
      expect(splitLabel(h)).toBe("Split party");
    } finally {
      closeHarness();
    }
  });

  it("EV-05 each group takes the per-split-group shift while split, floor 2, read from tuning", () => {
    const seed = "cu04-ev05";
    const seq = seqWithRaws(seed, [4, 2]);
    const split = boot(seed, ["hero-a", "hero-b"], false);
    try {
      oneSpace(split, [
        { id: "G", heroIds: ["hero-a"] },
        { id: "S", heroIds: ["hero-b"] },
      ]);
      split.play.rngSeq = seq;
      beginDay(split);
      const shifts = ensureClock(split.play).shifts as Record<string, Record<string, number>>;
      expect(shifts.G).toEqual({ raw: 4, virtue: 0, corruption: 0, split: -1, total: 3 });
      // A split-off group of one also takes it; raw 2 stays at the floor.
      expect(shifts.S).toEqual({ raw: 2, virtue: 0, corruption: 0, split: -1, total: 2 });
      const rolls = projectShellView({ ...split.shell, screen: "play" }).table?.rolls ?? [];
      expect(rolls.map((roll) => rollLine(roll))).toEqual([
        "hero-a: 3 (−1 split)",
        "hero-b: 2 (−1 split)",
      ]);
      expect(rolls[0]).toMatchObject({ corruption: 0, split: -1 });
    } finally {
      closeHarness();
    }

    for (const [raw, total] of [
      [4, 4],
      [2, 2],
    ] as const) {
      const one = boot(seed, ["hero-a", "hero-b"], false);
      try {
        oneSpace(one, [{ id: "G", heroIds: ["hero-a", "hero-b"] }]);
        one.play.rngSeq = seqWithRaws(seed, [raw]);
        beginDay(one);
        expect(ensureClock(one.play).shifts.G).toEqual({ raw, virtue: 0, corruption: 0, total });
      } finally {
        closeHarness();
      }
    }

    // The shift is the tuning key's: -2 moves the total.
    const tuned = boot(seed, ["hero-a", "hero-b"], false);
    try {
      configureDayClock(tuned.play, { tuning: { day: { shifts: { per_split_group: -2 } } } });
      oneSpace(tuned, [
        { id: "G", heroIds: ["hero-a"] },
        { id: "S", heroIds: ["hero-b"] },
      ]);
      tuned.play.rngSeq = seqWithRaws(seed, [6, 6]);
      beginDay(tuned);
      expect(ensureClock(tuned.play).shifts.G?.total).toBe(4);
      expect(ensureClock(tuned.play).shifts.S?.total).toBe(4);
    } finally {
      closeHarness();
    }
  });

  it("EV-08 a pick mid-turn moves nothing until the day start", () => {
    const h = boot("cu04-ev08", ["hero-a", "hero-b", "hero-c"], false);
    try {
      const spaceId = oneSpace(h, [{ id: "G", heroIds: ["hero-a", "hero-b"] }]);
      h.play.groups.push({
        id: "L",
        heroIds: ["hero-c"],
        spaceId: citadelForKingdom(h.play.content.board, "S").id,
        insideBuilding: false,
        order: 1,
      });
      h.play.turnOrder = ["G", "L"];
      runDay(h);
      const seen: string[] = [];
      let movesAtPick = -1;
      runDay(h, {
        onTurn: (groupId, moves) => {
          seen.push(groupId);
          if (groupId === "G") {
            movesAtPick = moves;
            gearPick(h, "split", "hero-a");
            expect(h.play.groups).toHaveLength(2);
            expect(h.play.groups[0]).toMatchObject({
              id: "G",
              heroIds: ["hero-a", "hero-b"],
              spaceId,
            });
          }
        },
      });
      expect(movesAtPick).toBeGreaterThan(0);
      expect(seen).toEqual(["G", "L"]);
      expect(h.play.groups).toHaveLength(2);
      expect(h.play.turnOrder).toEqual(["G", "L"]);
      beginDay(h);
      expect(h.play.groups).toHaveLength(3);
    } finally {
      closeHarness();
    }
  });

  it("EV-11 a queue, its apply and the day start card send no tower command", () => {
    const commandsFor = (queue: boolean): unknown[] => {
      const h = boot("cu04-ev11", ["hero-a", "hero-b"], true);
      try {
        oneSpace(h, [{ id: "G", heroIds: ["hero-a", "hero-b"] }]);
        takePendingTowerCommands();
        const picked: unknown[] = [];
        if (queue) {
          const result = stepShell(h.shell, {
            kind: "gear",
            v: 1,
            deviceId: "pad",
            action: "pick",
            item: "split",
            pick: "split",
            heroId: "hero-b",
          });
          bindShellState(result.state);
          h.shell = result.state;
          picked.push(...result.effects.filter((effect) => effect.kind === "tower-command"));
          expect(h.play.regroupQueue).toHaveLength(1);
        }
        runDay(h, { place: () => undefined });
        if (queue) {
          expect(h.play.groups).toHaveLength(2);
          queueRegroupPick(h.play, "join", "hero-b", "pad");
        }
        beginDay(h);
        if (queue) expect(h.play.groups).toHaveLength(1);
        return [...picked, ...takePendingTowerCommands()];
      } finally {
        closeHarness();
      }
    };
    const control = commandsFor(false);
    const queued = commandsFor(true);
    expect(queued).toEqual(control);
    expect(queued.every((command) => JSON.stringify(command).includes("sound"))).toBe(true);
  });

  it("EV-22 groups, spaces and turn order survive a save and restore; the queue too", () => {
    const h = boot("cu04-ev22", ["hero-a", "hero-b", "hero-c"], false);
    try {
      oneSpace(h, [{ id: "G", heroIds: ["hero-a", "hero-b", "hero-c"] }]);
      queueRegroupPick(h.play, "split", "hero-c", "pad");
      runDay(h);
      queueRegroupPick(h.play, "split", "hero-a", "pad");
      const saved = JSON.parse(JSON.stringify(serializeShellState(h.shell)));
      const restored = deserializeShellState(saved);
      const play = restored.play;
      expect(play?.groups).toEqual(h.play.groups);
      expect(play?.turnOrder).toEqual(h.play.turnOrder);
      expect(play?.groups.map((group) => group.spaceId)).toEqual(
        h.play.groups.map((group) => group.spaceId),
      );
      expect(play?.turnOrder.at(-1)).toBe("split-hero-c-1");
      expect(play?.regroupQueue).toEqual([{ kind: "split", heroId: "hero-a", deviceId: "pad" }]);
    } finally {
      closeHarness();
    }
  });

  it("EV-23 an unsplit, unqueued party rolls as before, with no split term and no regroup node", () => {
    for (const heroes of [
      ["hero-a", "hero-b"],
      ["hero-a", "hero-b", "hero-c", "hero-d"],
    ]) {
      const h = boot(`cu04-ev23-${heroes.length}`, heroes, false);
      try {
        oneSpace(h, [{ id: "G", heroIds: heroes }]);
        for (let day = 1; day <= 5; day++) {
          const seq = h.play.rngSeq;
          // The roll is the first draw of the day: the stream is where it was with the prompt.
          const raw = eventRng(h.shell.seed, seq).roll("2d3").total;
          runDay(h);
          expect(ensureClock(h.play).shifts).toEqual({
            G: { raw, virtue: 0, corruption: 0, total: Math.max(2, raw) },
          });
        }
        const nodes = dayTrace(h.play).nodes;
        for (const node of [".38", ".39", ".40", ".41", ".42"]) expect(nodes).not.toContain(node);
        expect(h.play.regroupCardDay).toBeNull();
      } finally {
        closeHarness();
      }
    }
  });

  it("EV-24 an action that cannot apply is dropped with its code, told to its iPad, never silent", () => {
    // A queued Rejoin, then the groups stop sharing a space.
    const rejoin = boot("cu04-ev24-join", ["hero-a", "hero-b"], false);
    try {
      oneSpace(rejoin, [
        { id: "G", heroIds: ["hero-a"] },
        { id: "S", heroIds: ["hero-b"] },
      ]);
      expect(queueRegroupPick(rejoin.play, "join", "hero-b", "pad-2")).toBe(true);
      const away = rejoin.play.groups[1];
      if (!away) throw new Error("No second group.");
      away.spaceId = citadelForKingdom(rejoin.play.content.board, "S").id;
      const before = structuredClone(rejoin.play.groups);
      beginDay(rejoin);
      expect(rejoin.play.groups).toEqual(before);
      const errors = pressErrors(rejoin);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({ code: REGROUP_DROPPED, deviceId: "pad-2" });
      expect(errors[0]?.message).toContain("Rejoin");
      expect(shellEffectSchema.safeParse(errors[0]).success).toBe(true);
      expect(rejoin.play.regroupQueue).toEqual([]);
      expect(rejoin.play.regroupCardDay).toBeNull();
    } finally {
      closeHarness();
    }

    // A queued split of a hero who is no longer in a group of 2 or more.
    const split = boot("cu04-ev24-split", ["hero-a", "hero-b"], false);
    try {
      oneSpace(split, [{ id: "G", heroIds: ["hero-a", "hero-b"] }]);
      expect(queueRegroupPick(split.play, "split", "hero-b", "pad")).toBe(true);
      const group = split.play.groups[0];
      if (!group) throw new Error("No group.");
      group.heroIds = ["hero-b"];
      const before = structuredClone(split.play.groups);
      beginDay(split);
      expect(split.play.groups).toEqual(before);
      const errors = pressErrors(split);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({ code: REGROUP_DROPPED, deviceId: "pad" });
      expect(shellEffectSchema.safeParse(errors[0]).success).toBe(true);
      expect(split.play.regroupQueue).toEqual([]);
    } finally {
      closeHarness();
    }
  });

  it("EV-26 queued actions stack and apply in the order picked", () => {
    const run = (order: Array<["split" | "join", string]>) => {
      const h = boot("cu04-ev26", ["hero-a", "hero-b", "hero-c", "hero-d"], false);
      try {
        oneSpace(h, [{ id: "G", heroIds: ["hero-a", "hero-b", "hero-c", "hero-d"] }]);
        for (const [kind, heroId] of order) gearPick(h, kind, heroId);
        const queued = (h.play.regroupQueue ?? []).map((entry) => [entry.kind, entry.heroId]);
        h.shell.screen = "play";
        h.play.dayNumber = 1;
        const panel = projectShellView(h.shell).gear?.regroup?.queue ?? [];
        const before = groupSignature(h.play);
        beginDay(h);
        return {
          queued,
          panel: panel.map((row) => [row.kind, row.heroId]),
          unchangedBefore: before === "G:hero-a+hero-b+hero-c+hero-d",
          groups: groupSignature(h.play),
          left: h.play.regroupQueue,
          errors: pressErrors(h),
        };
      } finally {
        closeHarness();
      }
    };
    const first = run([
      ["split", "hero-a"],
      ["split", "hero-b"],
      ["join", "hero-c"],
    ]);
    const second = run([
      ["split", "hero-b"],
      ["split", "hero-a"],
      ["join", "hero-c"],
    ]);
    expect(first.queued).toEqual([
      ["split", "hero-a"],
      ["split", "hero-b"],
      ["join", "hero-c"],
    ]);
    expect(first.panel).toEqual(first.queued);
    expect(second.queued).toEqual([
      ["split", "hero-b"],
      ["split", "hero-a"],
      ["join", "hero-c"],
    ]);
    expect(second.panel).toEqual(second.queued);
    expect(first.unchangedBefore && second.unchangedBefore).toBe(true);
    // The rejoin merges the oldest other group back, which the pick order decided.
    expect(first.groups).toBe("G:hero-a+hero-c+hero-d|split-hero-b-2:hero-b");
    expect(second.groups).toBe("G:hero-b+hero-c+hero-d|split-hero-a-2:hero-a");
    for (const result of [first, second]) {
      expect(result.left).toEqual([]);
      expect(result.errors).toEqual([]);
    }
  });

  it("EV-27 an opposite pick for the same hero cancels the queued one, with no error", () => {
    const h = boot("cu04-ev27", ["hero-a", "hero-b"], false);
    try {
      oneSpace(h, [{ id: "G", heroIds: ["hero-a", "hero-b"] }]);
      gearPick(h, "split", "hero-b");
      expect(regroupPicks(h.play)).toContainEqual({ kind: "join", heroId: "hero-b" });
      gearPick(h, "join", "hero-b");
      expect(h.play.regroupQueue).toEqual([]);
      const before = groupSignature(h.play);
      beginDay(h);
      expect(groupSignature(h.play)).toBe(before);
      expect(h.play.regroupCardDay).toBeNull();
      expect(pressErrors(h)).toEqual([]);
    } finally {
      closeHarness();
    }
  });

  // The source half (no literal in the card, no tuning key) is in server/pack/tuning.test.ts:
  // the engine may not read files.
  it("EV-28 the groups card's time is the exported constant, and moves when it changes", async () => {
    expect(AUTO_ADVANCE_MS).toBe(4000);

    const cardHold = (project: typeof projectShellView): number | undefined => {
      const h = boot("cu04-ev28", ["hero-a", "hero-b"], false);
      try {
        oneSpace(h, [{ id: "G", heroIds: ["hero-a", "hero-b"] }]);
        queueRegroupPick(h.play, "split", "hero-b", "pad");
        // The day loop does not wait for the card: the roll is offered at once.
        expect(beginDay(h)).toBe("prompt");
        expect(h.offers.map((offer) => offer.promptId)).toEqual(["day-1-roll-done"]);
        h.shell.screen = "play";
        h.shell.loops.stack.push({ loopId: "day", phase: "body", local: h.local } as never);
        return project(h.shell).table?.groupsCard?.holdMs;
      } finally {
        closeHarness();
      }
    };
    expect(cardHold(projectShellView)).toBe(AUTO_ADVANCE_MS);
    vi.resetModules();
    vi.doMock("../../../protocols/v2/views.ts", async (original) => ({
      ...(await original<object>()),
      AUTO_ADVANCE_MS: 1234,
    }));
    try {
      const changed = await import("../session/view.ts");
      expect(cardHold(changed.projectShellView)).toBe(1234);
    } finally {
      vi.doUnmock("../../../protocols/v2/views.ts");
      vi.resetModules();
    }
  });

  it("EV-29 the host's split action queues exactly as an iPad pick does", () => {
    const viaPanel = boot("cu04-ev29", ["hero-a", "hero-b"], false);
    let panelQueue: unknown;
    try {
      oneSpace(viaPanel, [{ id: "G", heroIds: ["hero-a", "hero-b"] }]);
      gearPick(viaPanel, "split", "hero-b");
      panelQueue = structuredClone(viaPanel.play.regroupQueue);
    } finally {
      closeHarness();
    }
    const viaHost = boot("cu04-ev29", ["hero-a", "hero-b"], false);
    try {
      oneSpace(viaHost, [{ id: "G", heroIds: ["hero-a", "hero-b"] }]);
      // The host's act: a split pick with no panel open (the act a Continue replays, too).
      viaHost.shell = applyGear(viaHost.shell, {
        deviceId: "pad",
        action: "pick",
        item: "split",
        pick: "split",
        heroId: "hero-b",
      });
      expect(viaHost.shell.gearPanel).toBeNull();
      expect(viaHost.play.regroupQueue).toEqual(panelQueue);
      expect(viaHost.play.groups).toHaveLength(1);
      beginDay(viaHost);
      expect(groupSignature(viaHost.play)).toBe("G:hero-a|split-hero-b-1:hero-b");
      // While another iPad's panel is open, the host act is refused: one owner at a time.
      const open = applyGear(viaHost.shell, { deviceId: "other", action: "open", item: "volume" });
      const refused = applyGear(open, {
        deviceId: "pad",
        action: "pick",
        item: "split",
        pick: "join",
        heroId: "hero-b",
      });
      expect(refused.play?.regroupQueue).toEqual([]);
    } finally {
      closeHarness();
    }
  });

  it("applySplit and applyJoin still refuse an impossible change", () => {
    const h = boot("cu04-apply", ["hero-a", "hero-b"], false);
    try {
      oneSpace(h, [{ id: "G", heroIds: ["hero-a"] }]);
      expect(applySplit(h.play, "G", "hero-a")).toBeNull();
      expect(applyJoin(h.play, "G", "G")).toBe(false);
      expect(projectedGroups(h.play).groups).toEqual(h.play.groups);
    } finally {
      closeHarness();
    }
  });
});

describe("C3-08 EV-01 a third corruption stops the day loop", () => {
  it("loses with reason corruption: no later group, drop or night runs", () => {
    const h = boot("c3-08-day", ["a", "b"], true);
    try {
      setHeroSheet(h.play, "a", { helpingVirtues: 0, corruptions: 2, named: ["cruel", "greedy"] });
      const turns: string[] = [];
      const result = runDay(h, {
        onTurn: (groupId) => {
          turns.push(groupId);
          if (turns.length === 1) expect(gainCorruption(h.play, "seed", "a").lost).toBe(true);
        },
      });
      expect(result.lost).toEqual({ reason: "corruption" });
      // Only the first group played; no skull dropped; the day never reached its night.
      expect(turns).toHaveLength(1);
      expect(ensureClock(h.play).nightDrops).toEqual([]);
      expect(dayTrace(h.play).nodes).not.toContain(".35");
    } finally {
      closeHarness();
    }
  });
});

describe("C3/20 EV-01 the effects wait is an engine step", () => {
  /** Plays one night to the effects wait. `cleanse` stands for a Cleanse's "+1 day" earlier in the day. */
  const toEffects = (seed: string, cleanse = false) => {
    const h = boot(seed, ["a", "b", "c", "d"], false);
    let status = beginDay(h);
    if (cleanse) ensureClock(h.play).effects.push("+1 day");
    for (let guard = 0; guard < 48 && h.local.phase !== "effects"; guard++) {
      if (status === "child") {
        if (h.child && !cleanse) markQuestWon(h.play);
        h.parent = { groupId: h.child ?? "" };
        status = pump(h);
        continue;
      }
      const offer = h.offers[0];
      if (!offer) throw new Error(`Stuck in ${h.local.phase}.`);
      status = pressOffer(h, offer);
    }
    return h;
  };

  it("offers the wait as data: its id, 4 s at most, no line, and no press", () => {
    const h = toEffects("c3-20-ev01");
    try {
      expect(h.local.phase).toBe("effects");
      expect(h.local.wait).toEqual({ id: "effects-day-1", maxMs: AUTO_ADVANCE_MS, lineId: null });
      expect(AUTO_ADVANCE_MS).toBe(4000);
      expect(h.offers).toEqual([]);
    } finally {
      closeHarness();
    }
  });

  it("lists the night's effect and its drop, one line each, and only moves on at wait-end", () => {
    const h = toEffects("c3-20-ev01-lines", true);
    try {
      const lines = ensureClock(h.play).effects;
      expect(ensureClock(h.play).nightDrops).toHaveLength(1);
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe("+1 day");
      expect(lines[1]).toMatch(/^A skull lands on /);
      // Pumping again changes nothing: the engine never advances on its own.
      for (let i = 0; i < 3; i++) expect(pump(h)).toBe("wait");
      expect(h.local.phase).toBe("effects");
      h.local = { ...h.local, waitDone: true };
      expect(pump(h)).toBe("done");
    } finally {
      closeHarness();
    }
  });
});

describe("C3/20 EV-03 the night's drop reads the seed", () => {
  it("lands in the seeded kingdom and each building keeps its seeded count", () => {
    const inE = PROVING_GROUNDS_PLAY.board.spaces.filter((s) => s.building && s.kingdom === "E");
    const first = inE[0];
    if (!first) throw new Error("The board needs a building in E.");
    const h = boot(`c3-20-ev03~test-skulls:${first.id}=3~test-kingdom:E`, ["a", "b"], false);
    try {
      runDay(h);
      const clock = ensureClock(h.play);
      expect(clock.nightDrops).toHaveLength(1);
      expect(clock.nightDrops[0]?.kingdom).toBe("E");
      const landed = clock.nightDrops[0]?.spaceId ?? "";
      for (const space of inE) {
        const seeded = space.id === first.id ? 3 : 0;
        expect(clock.skulls[space.id] ?? 0).toBe(seeded + (space.id === landed ? 1 : 0));
      }
      expect(clock.seedKingdoms).toEqual([]);
    } finally {
      closeHarness();
    }
  });
});

describe("C3/20 EV-05 two heroes on one space: no Regroup prompt, the queued split applies at day start", () => {
  it("seats both on one space by the marker, offers no regroup, and splits at the next day start", () => {
    const h = boot("c3-20-ev05~test-seat-together", ["hero-a", "hero-b"], false);
    try {
      expect(h.play.groups).toHaveLength(1);
      expect(h.play.groups[0]?.heroIds).toEqual(expect.arrayContaining(["hero-a", "hero-b"]));
      const first = beginDay(h);
      expect(first).toBe("prompt");
      expect(h.offers.filter((offer) => offer.promptId.startsWith("regroup"))).toEqual([]);
      expect(h.local.phase).toBe("roll");
      queueRegroupPick(h.play, "split", "hero-b", "pad");
      // Day 2's start applies it, with no prompt on the way.
      runDay(h);
      expect(h.play.groups).toHaveLength(2);
      expect(h.play.regroupCardDay).toBe(2);
    } finally {
      closeHarness();
    }
  });
});
