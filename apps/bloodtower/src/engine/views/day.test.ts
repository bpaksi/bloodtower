import { describe, expect, it } from "vitest";
import { boardViewPayloadSchema } from "../../protocols/v2/views.ts";
import { BASE_TUNING } from "../loops/day/rules.ts";
import { comingDrop, dayPhaseView, rollLine, rollView } from "./day.ts";

const roll = (shift: { raw: number; virtue: number; corruption: number; total: number }) =>
  rollView({ groupId: "g", name: "A", shift });

describe("day roll line (EV-01)", () => {
  it("shows the total alone when there is no modifier", () => {
    expect(rollLine(roll({ raw: 4, virtue: 0, corruption: 0, total: 4 }))).toBe("A: 4");
  });

  it("orders virtue, terrain, corruption with a real minus sign", () => {
    expect(rollLine(roll({ raw: 4, virtue: 1, corruption: 0, total: 5 }))).toBe("A: 5 (+1 virtue)");
    expect(rollLine(roll({ raw: 4, virtue: 0, corruption: -1, total: 3 }))).toBe(
      "A: 3 (−1 corruption)",
    );
    expect(rollLine(roll({ raw: 4, virtue: 2, corruption: -1, total: 5 }))).toBe(
      "A: 5 (+2 virtue) (−1 corruption)",
    );
  });

  it("keeps the engine's floored total", () => {
    expect(rollLine(roll({ raw: 2, virtue: 0, corruption: -1, total: 2 }))).toBe(
      "A: 2 (−1 corruption)",
    );
  });
});

describe("threat bar (EV-07)", () => {
  it("is the coming drop only", () => {
    const four = (night: number) =>
      comingDrop({ heroes: 4, night, questWon: false, tuning: BASE_TUNING });
    expect(four(1)).toBe(1);
    expect(four(2)).toBe(2);
  });

  it("is 0 after a won quest and null with no heroes", () => {
    expect(comingDrop({ heroes: 4, night: 2, questWon: true, tuning: BASE_TUNING })).toBe(0);
    expect(comingDrop({ heroes: 0, night: 1, questWon: false, tuning: BASE_TUNING })).toBeNull();
  });
});

describe("day phase", () => {
  it("maps the day loop to a board panel", () => {
    expect(dayPhaseView("regroup", false)).toBe("regroup");
    expect(dayPhaseView("roll", false)).toBe("roll");
    expect(dayPhaseView("groups", false)).toBe("turn");
    expect(dayPhaseView("skull-place", false)).toBe("skull");
    expect(dayPhaseView("skull-sim", false)).toBe("skull-sim");
    expect(dayPhaseView("check", true)).toBe("effects");
    expect(dayPhaseView("check", false)).toBe("turn");
    // The day is over: no effects panel lingers past the loop (Review A).
    expect(dayPhaseView("done", true)).toBeNull();
    expect(dayPhaseView("done", false)).toBeNull();
    expect(dayPhaseView(undefined, false)).toBeNull();
  });
});

describe("wire schema", () => {
  it("accepts the day fields and refuses an unknown one", () => {
    const base = {
      screen: "play",
      levels: [{ id: "play", label: "Play", shows: "Day 1" }],
      heroes: [],
      narration: null,
      actions: [],
    };
    const table = {
      chapter: "Story",
      day: 1,
      daysLeft: 23,
      threat: 1,
      phase: "roll",
      rolls: [
        { groupId: "g", name: "A", rolled: 4, virtue: 1, terrain: 0, corruption: 0, total: 5 },
      ],
      effects: ["+1 day"],
      skull: null,
      corruptions: [{ heroId: "h", heroName: "Hero", panelHeroId: "h", count: 2 }],
      health: "unavailable",
      purse: "unavailable",
      actingGroup: null,
      actingHeroId: null,
      movesLeft: null,
      moveRoll: null,
      modifier: "none",
      waitingFor: null,
      groups: [],
    };
    const parsed = boardViewPayloadSchema.safeParse({ ...base, table });
    expect(parsed.success ? [] : parsed.error.issues).toEqual([]);
    expect(
      boardViewPayloadSchema.safeParse({ ...base, table: { ...table, extra: 1 } }).success,
    ).toBe(false);
  });
});
