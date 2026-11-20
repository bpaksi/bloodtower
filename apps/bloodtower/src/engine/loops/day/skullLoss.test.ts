import { afterEach, describe, expect, it } from "vitest";
import { gainCorruption } from "../../rules/corruption/index.ts";
import { initPlayState, type PlayState } from "../chapter/playState.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import {
  bindShellState,
  clearShellState,
  takePendingCheckpoint,
  takePendingTowerCommands,
} from "../session/shellRef.ts";
import { initialShellState, type ShellState } from "../session/state.ts";
import {
  captureClock,
  clockLog,
  clockSnapshot,
  configureDayClock,
  dayTrace,
  ensureClock,
  rebuildClock,
  recordBuildingDrop,
  recordHeldSkull,
  restoreClock,
  setBuildingSkulls,
  setHeroSheet,
} from "./clock.ts";
import { type DayLocal, type DayResult, dayLoop } from "./loop.ts";
import { handleDayPress } from "./press.ts";
import { applySkullRecord, skullRecordPromptId } from "./skull.ts";

/*
 * D1 / 01-skull-loss-dispatch: a skull that empties the supply or fells the fourth building loses
 * the game at once (DEC-905, DEC-915, DEC-931, DEC-676). Fixtures: the base board, 4 skulls make a
 * building fall, the kingdom queue and skull counts set by the test.
 */

type Status = "prompt" | "child" | "done" | "wait";
type Offer = { promptId: string; actionId: string };

type Harness = {
  play: PlayState;
  shell: ShellState;
  local: DayLocal;
  offers: Offer[];
  child: string | null;
  parent: { groupId?: string } | undefined;
  effects: unknown[];
  phases: Set<string>;
};

const idleLocal = (): DayLocal => ({
  phase: "regroup",
  groupIndex: 0,
  awaitingPress: false,
  awaitingChild: false,
  skullPlaced: false,
  skullsLeft: 0,
});

const boot = (seed: string, tower: boolean, heroes = ["a", "b"]): Harness => {
  const kingdoms = ["N", "E", "S", "W"] as const;
  const play = initPlayState(seed, {
    ...PROVING_GROUNDS_PLAY,
    start: {
      mode: "one-per-kingdom-citadel",
      assignments: heroes.map((hero, index) => ({ hero, kingdom: kingdoms[index] ?? "N" })),
    },
  });
  const shell = initialShellState({ sessionId: "d1", seed, stories: [] });
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
    phases: new Set(),
  };
};

afterEach(() => {
  takePendingTowerCommands();
  takePendingCheckpoint();
  clearShellState();
});

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

const pump = (h: Harness): Status => {
  h.offers = [];
  h.child = null;
  const result = dayLoop.body(h.local, dayCtx(h));
  h.local = result.local;
  h.phases.add(h.local.phase);
  if (result.passComplete) return "done";
  if (h.child) return "child";
  if (h.offers.length > 0) return "prompt";
  return "wait";
};

const press = (h: Harness, offer: Offer): Status => {
  h.local = handleDayPress(h.local, offer.promptId, offer.actionId);
  return pump(h);
};

type Drive = {
  /** Stop when the tower's placement prompts are open. */
  stopAtRecord?: boolean;
  /** Stop when the no-tower skull line is up, before its Continue press. */
  stopAtSim?: boolean;
  /** The building each placement press picks, by order; absent: the first offered. */
  place?: (index: number) => string | undefined;
  onTurn?: (groupId: string, index: number) => void;
};

/** Plays the day the way the host and the table would. Returns where it stopped. */
const drive = (h: Harness, opts: Drive = {}, from?: Status): Status | "stopped" => {
  let status: Status;
  if (from) {
    status = from;
  } else {
    h.local = dayLoop.enter(dayCtx(h));
    status = pump(h);
  }
  let turns = 0;
  let placed = 0;
  for (let guard = 0; guard < 64 && status !== "done"; guard++) {
    if (status === "child") {
      const groupId = h.child as string;
      opts.onTurn?.(groupId, turns);
      turns += 1;
      h.parent = { groupId };
      status = pump(h);
      continue;
    }
    if (status === "wait" && (h.local.phase === "event" || h.local.phase === "effects")) {
      h.local = { ...h.local, waitDone: true };
      status = pump(h);
      continue;
    }
    if (status !== "prompt") throw new Error(`Day stuck in ${h.local.phase} (${status}).`);
    const eventChoice = h.offers.find((offer) => offer.actionId === "choose");
    if (eventChoice) {
      status = press(h, eventChoice);
      continue;
    }
    const roll = h.offers.find((offer) => offer.promptId.includes("roll-done"));
    if (roll) {
      status = press(h, roll);
      continue;
    }
    const drop = h.offers.find((offer) => offer.promptId.startsWith("skull-drop"));
    if (drop) {
      status = press(h, drop);
      continue;
    }
    const sim = h.offers.find((offer) => offer.promptId.startsWith("skull-sim-day-"));
    if (sim) {
      if (opts.stopAtSim) return "stopped";
      status = press(h, sim);
      continue;
    }
    if (h.offers.some((offer) => offer.actionId === "record")) {
      if (opts.stopAtRecord) return "stopped";
      const target = opts.place?.(placed);
      placed += 1;
      const offer = h.offers.find((row) =>
        target
          ? row.promptId.endsWith(`--${target}`)
          : row.actionId === "record" && !row.promptId.endsWith("--inside"),
      );
      if (!offer) throw new Error(`No record offer for ${target ?? "any building"}.`);
      status = press(h, offer);
      continue;
    }
    throw new Error(`Unhandled offers: ${h.offers.map((offer) => offer.promptId).join(", ")}`);
  }
  if (status === "done") return status;
  throw new Error(`Day did not finish (${h.local.phase}).`);
};

const finish = (h: Harness, opts: Drive = {}): DayResult => {
  if (drive(h, opts) !== "done") throw new Error("The day did not finish.");
  return dayLoop.resultUp(h.local, dayCtx(h));
};

const inKingdom = (h: Harness, kingdom: string): string[] =>
  h.play.content.board.spaces
    .filter((space) => space.building && space.kingdom === kingdom)
    .map((space) => space.id);

const TWO_A_NIGHT = { skulls: { drops_a_night: { heroes_1_to_2: 2 } } };

/** `supply` skulls in the supply, two skulls due tonight, the kingdom queue as given. */
const fixture = (h: Harness, supply: number, kingdoms: Array<"N" | "E" | "S" | "W"> = []): void => {
  configureDayClock(h.play, { tuning: TWO_A_NIGHT, supply });
  ensureClock(h.play).seedKingdoms = [...kingdoms];
};

const fall = (h: Harness, ids: string[]): void => {
  for (const id of ids) setBuildingSkulls(h.play, id, 4);
};

const skullSnapshot = (h: Harness) => clockSnapshot(h.play);

const lines = (h: Harness): string[] =>
  ensureClock(h.play).nightDrops.map((drop) => {
    const name = h.play.content.board.spaceById.get(drop.spaceId)?.name ?? drop.spaceId;
    return `A skull falls on ${name}.`;
  });

describe("D1 skull loss dispatch", () => {
  it("EV-01 simulated night: the skull after the fatal one is never drawn", () => {
    const run = (due: number) => {
      const h = boot("d1-ev01", false);
      configureDayClock(h.play, {
        tuning: { skulls: { drops_a_night: { heroes_1_to_2: due } } },
        supply: 10,
      });
      ensureClock(h.play).seedKingdoms = ["E", "E"];
      const east = inKingdom(h, "E");
      fall(h, east.slice(0, 3));
      setBuildingSkulls(h.play, east[3] as string, 3);
      return h;
    };
    // The same night with one skull due: the play stream a second skull must not move.
    const reference = run(1);
    finish(reference);
    const referenceSeq = reference.play.rngSeq;
    clearShellState();

    const h = run(2);
    expect(drive(h, { stopAtSim: true })).toBe("stopped");
    // The loss is set at the skull, before the line's Continue press.
    expect(ensureClock(h.play).outcome).toEqual({ lost: true, reason: "buildings" });
    expect(ensureClock(h.play).supply).toBe(9);
    expect(h.local.phase).toBe("skull-sim");
    // Continue the line: the day ends lost, no effects panel, no second skull.
    h.local = handleDayPress(h.local, "skull-sim-day-1", "continue");
    expect(pump(h)).toBe("done");
    expect(dayLoop.resultUp(h.local, dayCtx(h)).lost).toEqual({ reason: "buildings" });
    expect(ensureClock(h.play).supply).toBe(9);
    const name = h.play.content.board.spaceById.get(inKingdom(h, "E")[3] as string)?.name;
    expect(lines(h)).toEqual([`A skull falls on ${name}.`]);
    expect(h.phases.has("effects")).toBe(false);
    // Only skull 1's draws moved the play stream; the second seeded kingdom was never taken.
    expect(h.play.rngSeq).toBe(referenceSeq);
    expect(ensureClock(h.play).seedKingdoms).toEqual(["E"]);
  });

  it("EV-02 with the tower: no placement prompt after the fatal skull", () => {
    const h = boot("d1-ev02", true);
    fixture(h, 10);
    const north = inKingdom(h, "N");
    fall(h, north.slice(0, 3));
    const fourth = inKingdom(h, "E")[0] as string;
    const other = inKingdom(h, "E")[1] as string;
    setBuildingSkulls(h.play, fourth, 3);
    expect(drive(h, { stopAtRecord: true })).toBe("stopped");
    h.local = handleDayPress(h.local, skullRecordPromptId(1, fourth), "record");
    expect(ensureClock(h.play).outcome).toEqual({ lost: true, reason: "buildings" });
    expect(pump(h)).toBe("done");
    expect(h.offers.filter((offer) => offer.promptId.startsWith("skull-record--"))).toEqual([]);
    const before = skullSnapshot(h);
    // A second press is refused: it changes no skull count and no supply.
    h.local = handleDayPress(h.local, skullRecordPromptId(1, other), "record");
    expect(applySkullRecord(1, other)).toBe(false);
    expect(skullSnapshot(h)).toEqual(before);
    expect(h.phases.has("effects")).toBe(false);
    expect(dayLoop.resultUp(h.local, dayCtx(h)).lost).toEqual({ reason: "buildings" });
  });

  it("EV-03 the last skull to leave the supply loses at once", () => {
    // (a) simulated
    const sim = boot("d1-ev03a", false);
    fixture(sim, 1);
    expect(drive(sim, { stopAtSim: true })).toBe("stopped");
    expect(ensureClock(sim.play).outcome).toEqual({ lost: true, reason: "skulls" });
    expect(ensureClock(sim.play).supply).toBe(0);
    expect(ensureClock(sim.play).nightDrops).toHaveLength(1);
    clearShellState();

    // (b) tower, placed on a building; (c) tower, kept inside
    for (const target of ["building", "inside"] as const) {
      const h = boot(`d1-ev03-${target}`, true);
      fixture(h, 1);
      expect(drive(h, { stopAtRecord: true })).toBe("stopped");
      const spaceId = target === "inside" ? "inside" : (inKingdom(h, "N")[0] as string);
      h.local = handleDayPress(h.local, skullRecordPromptId(1, spaceId), "record");
      expect(ensureClock(h.play).outcome).toEqual({ lost: true, reason: "skulls" });
      expect(ensureClock(h.play).supply).toBe(0);
      expect(pump(h)).toBe("done");
      expect(h.offers).toEqual([]);
      expect(h.phases.has("effects")).toBe(false);
      expect(dayLoop.resultUp(h.local, dayCtx(h)).lost).toEqual({ reason: "skulls" });
      clearShellState();
    }
  });

  it("EV-04 one loss, one reason", () => {
    // (i) the last skull empties the supply and fells the fourth building: skulls first.
    const h = boot("d1-ev04i", true);
    fixture(h, 1);
    fall(h, inKingdom(h, "N").slice(0, 3));
    const fourth = inKingdom(h, "E")[0] as string;
    setBuildingSkulls(h.play, fourth, 3);
    expect(drive(h, { stopAtRecord: true })).toBe("stopped");
    h.local = handleDayPress(h.local, skullRecordPromptId(1, fourth), "record");
    expect(ensureClock(h.play).outcome).toEqual({ lost: true, reason: "skulls" });
    expect(pump(h)).toBe("done");
    expect(dayLoop.resultUp(h.local, dayCtx(h)).lost).toEqual({ reason: "skulls" });
    clearShellState();

    // (ii) a third corruption first: no skull prompt follows, and a skull does not overwrite it.
    const c = boot("d1-ev04ii", true);
    fixture(c, 1);
    setHeroSheet(c.play, "a", { helpingVirtues: 0, corruptions: 2, named: ["cruel", "greedy"] });
    const result = finish(c, {
      onTurn: (_group, index) => {
        if (index === 0) expect(gainCorruption(c.play, "seed", "a").lost).toBe(true);
      },
    });
    expect(result.lost).toEqual({ reason: "corruption" });
    expect(ensureClock(c.play).nightDrops).toEqual([]);
    const spaceId = inKingdom(c, "N")[0] as string;
    expect(recordBuildingDrop(c.play, spaceId, "N")).toBe(false);
    expect(recordHeldSkull(c.play)).toBe(false);
    expect(ensureClock(c.play).outcome).toEqual({ lost: true, reason: "corruption" });
    expect(ensureClock(c.play).supply).toBe(1);
  });

  it("EV-06 no early loss", () => {
    const places = [
      { name: "supply 2, one skull leaves it", due: 1, supply: 2, fallen: 0, at: 0 },
      { name: "two fallen, a skull fells a third", due: 2, supply: 10, fallen: 2, at: 3 },
      { name: "three fallen, a skull on a building at 2", due: 2, supply: 10, fallen: 3, at: 2 },
    ];
    for (const row of places) {
      const h = boot(`d1-ev06-${row.fallen}-${row.supply}`, true);
      configureDayClock(h.play, {
        tuning: { skulls: { drops_a_night: { heroes_1_to_2: row.due } } },
        supply: row.supply,
      });
      fall(h, inKingdom(h, "N").slice(0, row.fallen));
      const target = inKingdom(h, "E")[0] as string;
      setBuildingSkulls(h.play, target, row.at);
      expect(drive(h, { stopAtRecord: true }), row.name).toBe("stopped");
      h.local = handleDayPress(h.local, skullRecordPromptId(1, target), "record");
      expect(ensureClock(h.play).outcome, row.name).toBeNull();
      const status = pump(h);
      if (row.due > 1) {
        expect(status, row.name).toBe("prompt");
        expect(h.offers.some((offer) => offer.actionId === "record")).toBe(true);
      }
      expect(drive(h, {}, status), row.name).toBe("done");
      expect(dayLoop.resultUp(h.local, dayCtx(h)).lost, row.name).toBeNull();
      expect(dayTrace(h.play).nodes).toContain("MEC-033.11");
      clearShellState();
    }
  });

  it("EV-08 a night with no loss reaches MEC-033.11 with lost null", () => {
    const h = boot("d1-ev08", false);
    fixture(h, 10);
    const result = finish(h);
    expect(result.lost).toBeNull();
    expect(dayTrace(h.play).nodes).toContain("MEC-033.11");
    expect(ensureClock(h.play).supply).toBe(8);
  });

  it("EV-10 Continue mid-night keeps the fatal skull fatal", () => {
    const setup = () => {
      const h = boot("d1-ev10", true);
      fixture(h, 10);
      fall(h, inKingdom(h, "N").slice(0, 3));
      setBuildingSkulls(h.play, inKingdom(h, "E")[0] as string, 3);
      return h;
    };
    // Uninterrupted run.
    const straight = setup();
    const target = inKingdom(straight, "E")[0] as string;
    drive(straight, { stopAtRecord: true });
    straight.local = handleDayPress(straight.local, skullRecordPromptId(1, target), "record");
    pump(straight);
    const want = { snapshot: skullSnapshot(straight), outcome: ensureClock(straight.play).outcome };
    clearShellState();

    // Save with the first prompt open, restore into a fresh process, then press.
    const first = setup();
    drive(first, { stopAtRecord: true });
    expect(ensureClock(first.play).outcome).toBeNull();
    const savedClock = captureClock(first.play);
    const savedLocal = structuredClone(first.local);
    const savedSeq = first.play.rngSeq;
    const savedDay = first.play.dayNumber;
    clearShellState();

    const again = boot("d1-ev10", true);
    restoreClock(again.play, savedClock as never);
    again.play.dayNumber = savedDay;
    again.play.rngSeq = savedSeq;
    again.local = savedLocal;
    expect(ensureClock(again.play).outcome).toBeNull();
    again.local = handleDayPress(again.local, skullRecordPromptId(1, target), "record");
    expect(ensureClock(again.play).outcome).toEqual({ lost: true, reason: "buildings" });
    expect(pump(again)).toBe("done");
    expect(again.offers.filter((offer) => offer.promptId.startsWith("skull-record--"))).toEqual([]);
    expect(skullSnapshot(again)).toEqual(want.snapshot);
    expect(ensureClock(again.play).outcome).toEqual(want.outcome);
    expect(dayLoop.resultUp(again.local, dayCtx(again)).lost).toEqual({ reason: "buildings" });
  });

  it("EV-12 the event-log rebuild after a skull loss never drops past an empty supply", () => {
    // EV-01's night, simulated.
    const a = boot("d1-ev12a", false);
    fixture(a, 10, ["E", "E"]);
    const east = inKingdom(a, "E");
    fall(a, east.slice(0, 3));
    setBuildingSkulls(a.play, east[3] as string, 3);
    finish(a);
    const clockA = ensureClock(a.play);
    expect(clockLog(a.play).filter((event) => event.kind === "drop")).toHaveLength(1);
    expect(rebuildClock({ ...clockA.tuning, supply: 10 }, clockLog(a.play)).supply).toBe(9);
    // The log starts after the preset fallen buildings, so compare the one skull it holds.
    expect(rebuildClock({ ...clockA.tuning, supply: 10 }, clockLog(a.play)).skulls).toEqual({
      [east[3] as string]: 1,
    });
    expect(clockA.supply).toBe(9);
    clearShellState();

    // EV-03 (b): the last skull, placed on a building.
    const b = boot("d1-ev12b", true);
    fixture(b, 1);
    finish(b, { place: () => inKingdom(b, "N")[0] as string });
    const clockB = ensureClock(b.play);
    const rebuilt = rebuildClock({ ...clockB.tuning, supply: 1 }, clockLog(b.play));
    expect(rebuilt).toEqual(clockSnapshot(b.play));
    expect(rebuilt.supply).toBe(0);
    expect(clockLog(b.play)).toEqual([
      { kind: "drop", spaceId: inKingdom(b, "N")[0], kingdom: "N" },
    ]);
  });
});
