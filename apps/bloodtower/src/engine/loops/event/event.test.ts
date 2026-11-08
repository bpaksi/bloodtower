import { describe, expect, it } from "vitest";
import { initPlayState, type PlayState } from "../chapter/playState.ts";
import { configureDayClock, setBuildingSkulls } from "../day/clock.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import {
  captureEventState,
  chooseOption,
  drawEvent,
  eventEligible,
  eventForGroup,
  eventOptions,
  eventState,
  eventTuningFrom,
  groupLost,
  purseOf,
  restoreEventState,
  setHeroLedger,
  settleEvent,
} from "./index.ts";
import { EVENT_TYPES, type EventType } from "./rules.ts";
import type { OpenEvent } from "./state.ts";

const tuning = eventTuningFrom();

const setup = (roles: Record<string, string> = {}, hp = 10, gold = 6) => {
  const play = initPlayState("ev", PROVING_GROUNDS_PLAY);
  play.dayNumber = 1;
  configureDayClock(play, {});
  const group = play.groups[0];
  if (!group) throw new Error("no group");
  group.heroIds = ["h1", "h2"];
  for (const id of group.heroIds) {
    setHeroLedger(play, id, { role: roles[id] ?? "fighter", hitPoints: hp, gold });
  }
  return { play, group };
};

const open = (play: PlayState, groupId: string, over: Partial<OpenEvent>): void => {
  eventState(play).open = {
    groupId,
    day: 1,
    type: "quiet",
    hazard: null,
    offer: null,
    status: "open",
    log: [],
    ...over,
  };
};

const hp = (play: PlayState, id: string) => eventState(play).heroes[id]?.hitPoints;

describe("EV-01 only the wild or a skulled building draws", () => {
  it("clean building never draws; wild and 1-skull building are eligible", () => {
    const { play, group } = setup();
    const board = play.content.board;
    const clean = board.spaces.find((s) => s.building);
    const wild = board.spaces.find((s) => !s.building);
    const skulled = board.spaces.filter((s) => s.building)[1];
    if (!clean || !wild || !skulled) throw new Error("board lacks spaces");
    group.spaceId = clean.id;
    expect(eventEligible(play, group.id)).toBe(false);
    for (let day = 1; day <= 200; day++) {
      play.dayNumber = day;
      expect(eventForGroup(play, "seed", group.id, tuning)).toBeNull();
    }
    group.spaceId = wild.id;
    expect(eventEligible(play, group.id)).toBe(true);
    group.spaceId = skulled.id;
    expect(eventEligible(play, group.id)).toBe(false);
    setBuildingSkulls(play, skulled.id, 1);
    expect(eventEligible(play, group.id)).toBe(true);
    const fired = Array.from({ length: 200 }, (_, i) => {
      play.dayNumber = i + 1;
      return eventForGroup(play, "seed", group.id, tuning);
    }).filter(Boolean);
    expect(fired.length).toBeGreaterThan(0);
  });
});

describe("EV-02 the draw is seeded and weighted", () => {
  const run = (length: "short" | "standard") => {
    const counts: Record<string, number> = {};
    let fired = 0;
    for (let i = 0; i < 10000; i++) {
      const e = drawEvent(`s${i}`, 1, "g", tuning, length);
      if (!e) continue;
      fired++;
      counts[e.type] = (counts[e.type] ?? 0) + 1;
    }
    return { fired, counts };
  };
  it("Standard fires 40% +-2 and types follow the weights", () => {
    const { fired, counts } = run("standard");
    expect(Math.abs(fired / 100 - 40)).toBeLessThanOrEqual(2);
    const want: Record<EventType, number> = {
      quiet: 30,
      windfall: 15,
      hazard: 20,
      foes: 20,
      disaster: 5,
      people: 10,
    };
    for (const t of EVENT_TYPES) {
      expect(Math.abs(((counts[t] ?? 0) / fired) * 100 - want[t])).toBeLessThanOrEqual(2);
    }
  });
  it("Short fires 30% +-2", () => {
    expect(Math.abs(run("short").fired / 100 - 30)).toBeLessThanOrEqual(2);
  });
  it("the same seed gives the same sequence; another seed differs", () => {
    const seq = (seed: string) =>
      Array.from({ length: 50 }, (_, d) => drawEvent(seed, d, "g", tuning, "standard"));
    expect(seq("a")).toEqual(seq("a"));
    expect(seq("a")).not.toEqual(seq("b"));
  });
});

describe("EV-03 hazard", () => {
  it("(a) no counter: two cost options, the pick costs each present hero 2 hit points", () => {
    const { play, group } = setup({ h1: "fighter", h2: "scout" });
    open(play, group.id, { type: "hazard", hazard: "plague" });
    expect(eventOptions(play, tuning).map((o) => o.id)).toEqual(["hit-points", "lose-turn"]);
    expect(() => settleEvent(play, tuning)).toThrow();
    expect(hp(play, "h1")).toBe(10);
    chooseOption(play, tuning, "hit-points");
    expect(hp(play, "h1")).toBe(8);
    expect(hp(play, "h2")).toBe(8);
    expect(purseOf(play, group.id)).toBe(12);
    expect(eventState(play).lostTurns).toEqual([]);
  });
  it("(b) a Healer cancels plague, every time", () => {
    const { play, group } = setup({ h1: "healer", h2: "fighter" });
    for (let i = 0; i < 2; i++) {
      open(play, group.id, { type: "hazard", hazard: "plague" });
      expect(eventOptions(play, tuning)).toEqual([]);
      const event = settleEvent(play, tuning);
      expect(event.log).toEqual(["cancelled by counter"]);
      expect(hp(play, "h1")).toBe(10);
      expect(hp(play, "h2")).toBe(10);
      expect(purseOf(play, group.id)).toBe(12);
      expect(eventState(play).heroes.h1?.role).toBe("healer");
    }
  });
});

describe("EV-04 go around never fells", () => {
  it("a hero at 2 ends at 1", () => {
    const { play, group } = setup({}, 2);
    open(play, group.id, { type: "foes" });
    chooseOption(play, tuning, "go-around");
    expect(hp(play, "h1")).toBe(1);
    expect(groupLost(play, group.id)).toBe(false);
  });
});

describe("EV-05 windfall splits", () => {
  it("2 heroes: shares +3 and +2, purse +5", () => {
    const { play, group } = setup({}, 10, 0);
    open(play, group.id, { type: "windfall" });
    settleEvent(play, tuning);
    expect(eventState(play).heroes.h1?.gold).toBe(3);
    expect(eventState(play).heroes.h2?.gold).toBe(2);
    expect(purseOf(play, group.id)).toBe(5);
  });
});

describe("EV-06 no event loses the game by itself", () => {
  it("5,000 seeded draws on a party at 1 hit point", () => {
    let resolved = 0;
    for (let i = 0; i < 5000; i++) {
      const { play, group } = setup({ h1: "fighter", h2: "fighter" }, 1, 20);
      const ev = drawEvent(`sim${i}`, 1, group.id, tuning, "standard");
      if (!ev) continue;
      eventState(play).open = ev;
      const options = eventOptions(play, tuning).filter((o) => o.enabled);
      if (options.length === 0) settleEvent(play, tuning);
      else chooseOption(play, tuning, options[i % options.length]?.id ?? "go-around");
      resolved++;
      expect(groupLost(play, group.id)).toBe(false);
      expect(hp(play, "h1")).toBeGreaterThanOrEqual(1);
    }
    expect(resolved).toBeGreaterThan(1500);
  });
});

describe("EV-07 Fight is hidden until C4", () => {
  it("offers Go around and Pay them off for foes and disaster; Fight once switched on", () => {
    for (const type of ["foes", "disaster"] as const) {
      const { play, group } = setup();
      open(play, group.id, { type });
      expect(eventOptions(play, tuning).map((o) => o.id)).toEqual(["go-around", "pay-off"]);
      expect(() => chooseOption(play, tuning, "fight")).toThrow();
      const on = eventTuningFrom({ fight_enabled: true });
      expect(eventOptions(play, on).map((o) => o.id)).toEqual(["fight", "go-around", "pay-off"]);
    }
  });
  it("seeded draws of foes and disaster show no Fight", () => {
    let seen = 0;
    for (let i = 0; i < 300 && seen < 20; i++) {
      const { play, group } = setup();
      const ev = drawEvent(`f${i}`, 1, group.id, tuning, "standard");
      if (ev?.type !== "foes" && ev?.type !== "disaster") continue;
      eventState(play).open = ev;
      seen++;
      expect(eventOptions(play, tuning).map((o) => o.id)).not.toContain("fight");
    }
    expect(seen).toBe(20);
  });
});

describe("EV-08 Pay them off costs events.pay_off", () => {
  it("purse 12 pays 5 and ends; Go around takes no gold", () => {
    const { play, group } = setup({}, 10, 6);
    open(play, group.id, { type: "foes" });
    chooseOption(play, tuning, "pay-off");
    expect(purseOf(play, group.id)).toBe(7);
    expect(eventState(play).open?.status).toBe("resolved");
    open(play, group.id, { type: "foes" });
    chooseOption(play, tuning, "go-around");
    expect(purseOf(play, group.id)).toBe(7);
  });
  it("purse 4 disables Pay them off; Go around still works", () => {
    const { play, group } = setup({}, 10, 2);
    open(play, group.id, { type: "foes" });
    expect(eventOptions(play, tuning).find((o) => o.id === "pay-off")?.enabled).toBe(false);
    expect(() => chooseOption(play, tuning, "pay-off")).toThrow();
    chooseOption(play, tuning, "go-around");
    expect(hp(play, "h1")).toBe(8);
  });
  it("reads the amount from tuning", () => {
    const { play, group } = setup({}, 10, 6);
    const t = eventTuningFrom({ events: { pay_off: 8 } });
    open(play, group.id, { type: "foes" });
    chooseOption(play, t, "pay-off");
    expect(purseOf(play, group.id)).toBe(4);
  });
  it("a short share is covered by the other hero", () => {
    const { play, group } = setup();
    setHeroLedger(play, "h1", { role: "fighter", hitPoints: 10, gold: 0 });
    setHeroLedger(play, "h2", { role: "fighter", hitPoints: 10, gold: 9 });
    open(play, group.id, { type: "foes" });
    chooseOption(play, tuning, "pay-off");
    expect(purseOf(play, group.id)).toBe(4);
  });
});

describe("EV-09 Continue resumes an open event", () => {
  it("restores the same event and does not redraw", () => {
    const { play, group } = setup();
    const wild = play.content.board.spaces.find((s) => !s.building);
    if (!wild) throw new Error("no wild space");
    group.spaceId = wild.id;
    let first: OpenEvent | null = null;
    for (let day = 1; day <= 100 && !first; day++) {
      play.dayNumber = day;
      const e = eventForGroup(play, "cont", group.id, tuning);
      if (e && (e.type === "foes" || e.type === "disaster")) first = e;
      else eventState(play).open = null;
    }
    if (!first) throw new Error("no foes event found");
    const saved = captureEventState(play);
    const before = eventOptions(play, tuning);
    const fresh = setup();
    fresh.play.dayNumber = play.dayNumber;
    restoreEventState(fresh.play, saved);
    expect(eventState(fresh.play).open).toEqual(first);
    expect(eventOptions(fresh.play, tuning)).toEqual(before);
    // The open event is kept, not redrawn, even from another seed.
    fresh.group.spaceId = wild.id;
    expect(eventForGroup(fresh.play, "another", fresh.group.id, tuning)).toEqual(first);
  });
});
