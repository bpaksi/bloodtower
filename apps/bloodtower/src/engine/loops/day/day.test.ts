import { eventRng } from "@dark-tower/rng";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OPENING_MOMENTS, openingPromptId } from "../../../protocols/opening.ts";
import { projectDayClock } from "../../views/day.ts";
import { citadelForKingdom } from "../chapter/board.ts";
import { initPlayState, type PlayState } from "../chapter/playState.ts";
import { groupTurnLoop, handleGroupTurnPress } from "../group-turn/loop.ts";
import { shellEffectSchema } from "../session/effects.ts";
import { enterConnectEvents } from "../session/enterKit.ts";
import type { ShellEvent } from "../session/events.ts";
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
    regroup?: "done" | "split" | "join";
    splitHero?: string;
    questWins?: number;
    place?: (index: number) => string | undefined;
    onRoll?: () => void;
    beforeRecord?: () => void;
    onRegroup?: (offers: Offer[]) => void;
  },
): DayResult => {
  let status = beginDay(h);
  let regroup = opts?.regroup ?? "done";
  let wins = opts?.questWins ?? 0;
  let placed = 0;
  for (let guard = 0; guard < 48 && status !== "done"; guard++) {
    if (status === "child") {
      const groupId = h.child;
      if (!groupId) throw new Error("Group turn started without a group.");
      if (wins > 0) {
        markQuestWon(h.play);
        wins -= 1;
      }
      h.parent = { groupId };
      status = pump(h);
      continue;
    }
    if (status !== "prompt") throw new Error(`Day stuck in ${h.local.phase} (${status}).`);
    if (h.offers.some((offer) => offer.actionId === "done")) {
      opts?.onRegroup?.(h.offers);
      const kind = regroup === "split" && opts?.splitHero ? "split" : regroup;
      const id = kind === "split" ? opts?.splitHero : undefined;
      if (regroup !== "done") regroup = "done";
      h.local = handleDayPress(
        h.local,
        choose(h, kind, id).promptId,
        kind === "split" ? "split" : kind,
      );
      status = pump(h);
      continue;
    }
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
      let status = beginDay(h);
      expect(status).toBe("prompt");
      status = pressOffer(h, choose(h, "done"));
      expect(status).toBe("prompt");
      const shifts = ensureClock(h.play).shifts;
      const virtue = shifts.virtue;
      const corrupt = shifts.corrupt;
      expect(virtue).toBeDefined();
      expect(corrupt).toBeDefined();
      expect(eventRng(seed, 1).roll("2d3").total).toBe(virtue?.raw);
      expect(eventRng(seed, 2).roll("2d3").total).toBe(corrupt?.raw);
      expect(virtue).toMatchObject({
        virtue: 1,
        corruption: 0,
        total: Math.max(2, (virtue?.raw ?? 0) + 1),
      });
      expect(corrupt).toMatchObject({
        virtue: 0,
        corruption: -2,
        total: Math.max(2, (corrupt?.raw ?? 0) - 2),
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

  it("EV-08 regroup is the only step that splits or joins", () => {
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
      const status = beginDay(h);
      expect(status).toBe("prompt");
      pressOffer(h, choose(h, "split", "a"));
      expect(h.play.groups).toHaveLength(2);
      expect(groupSignature(h.play)).not.toBe(before);
    } finally {
      closeHarness();
    }
  });

  it("EV-09 regroup at day start splits, then the next day can join", () => {
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
      const regroupOffersSeen: string[][] = [];
      runDay(h, {
        regroup: "split",
        splitHero: "hero-a",
        onRegroup: (offers) => regroupOffersSeen.push(offers.map((offer) => offer.actionId)),
      });
      expect(regroupOffersSeen[0]).toContain("split");
      expect(regroupOffersSeen[1]).toContain("join");
      expect(h.play.groups).toHaveLength(2);
      expect(new Set(ensureClock(h.play).turns).size).toBe(2);
      const next = beginDay(h);
      expect(next).toBe("prompt");
      expect(h.offers.map((offer) => offer.actionId)).toContain("join");
      h.local = handleDayPress(h.local, choose(h, "join").promptId, "join");
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
      runDay(h, { regroup: "split", splitHero: "hero-a" });
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
            : h.offers.some((row) => row.actionId === "done")
              ? choose(h, "done")
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
        const offer = h.offers.some((row) => row.actionId === "done")
          ? choose(h, "done")
          : choose(h, "roll");
        status = pressOffer(h, offer);
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
