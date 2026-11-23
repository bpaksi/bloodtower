import { describe, expect, it } from "vitest";
import { bestLineOf, type GameRecord, keyAverageMs } from "./gameStats.ts";

const MIN = 60_000;

let seq = 0;
/** A record under the key story `keep`, Standard, normal, 2 heroes unless the case says otherwise. */
const rec = (
  gameId: string,
  outcome: GameRecord["outcome"],
  minutes: number | null,
  key: Partial<Pick<GameRecord, "storyId" | "length" | "difficulty" | "partySize">> = {},
): GameRecord => {
  seq += 1;
  return {
    v: 1,
    gameId,
    outcome,
    storyId: "keep",
    length: "standard",
    difficulty: "normal",
    partySize: 2,
    activeMs: minutes === null ? null : minutes * MIN,
    seq,
    atWall: "2026-11-23T00:00:00.000Z",
    ...key,
  };
};

describe("the best line (C3/10, PT-04)", () => {
  it("EV-15: the best is the shortest earlier win under the whole key", () => {
    const records = [
      rec("a", "won", 40),
      rec("b", "won", 25, { partySize: 4 }),
      rec("c", "won", 20, { length: "short" }),
      rec("d", "won", 30, { difficulty: "hard" }),
      rec("e", "won", 50),
    ];
    expect(bestLineOf(records, "e")).toEqual({ state: "earlier", ms: 40 * MIN });
  });

  it("EV-15: a record with a key field missing matches nothing", () => {
    const records = [rec("a", "won", 20, { difficulty: null }), rec("b", "won", 50)];
    expect(bestLineOf(records, "b")).toEqual({ state: "this-game" });
  });

  it("EV-16: the first win under its key reads this-game, with no minutes", () => {
    const records = [
      rec("other", "won", 10, { partySize: 3 }),
      rec("loss", "lost", 15),
      rec("first", "won", 45),
    ];
    const best = bestLineOf(records, "first");
    expect(best).toEqual({ state: "this-game" });
    expect(best).not.toHaveProperty("ms");
  });

  it("EV-16: a win shorter than every earlier win is the new best: this-game", () => {
    const records = [rec("a", "won", 40), rec("b", "won", 35)];
    expect(bestLineOf(records, "b")).toEqual({ state: "this-game" });
  });

  it("EV-17 (a): a lost game whose key has no win reads none", () => {
    const records = [rec("other", "won", 10, { storyId: "else" }), rec("loss", "lost", 30)];
    expect(bestLineOf(records, "loss")).toEqual({ state: "none" });
  });

  it("EV-17 (b): a first game ever, lost, reads none", () => {
    expect(bestLineOf([rec("only", "lost", 30)], "only")).toEqual({ state: "none" });
  });

  it("EV-17 (c): a lost game with earlier wins under its key shows the shortest, 40", () => {
    const records = [rec("w1", "won", 40), rec("w2", "won", 55), rec("loss", "lost", 30)];
    expect(bestLineOf(records, "loss")).toEqual({ state: "earlier", ms: 40 * MIN });
  });

  it("a later game never changes an earlier game's best (drill-in matches the stats screen)", () => {
    const records = [rec("a", "won", 40), rec("b", "won", 20)];
    expect(bestLineOf(records, "a")).toEqual({ state: "this-game" });
  });

  it("a quit is never a best, and a win of unknown length is not compared", () => {
    const records = [rec("q", "quit", 5), rec("u", "won", null), rec("loss", "lost", 30)];
    expect(bestLineOf(records, "loss")).toEqual({ state: "none" });
  });

  it("throws for a game with no record: never a silent none", () => {
    expect(() => bestLineOf([rec("a", "won", 40)], "missing")).toThrow(/No record/);
  });
});

describe("the average under the key (C3/10, PT-03, PT-04)", () => {
  it("counts won and lost records under the key only, not a quit or another key", () => {
    const records = [
      rec("w40", "won", 40),
      rec("w50", "won", 50),
      rec("w60", "won", 60),
      rec("l30", "lost", 30),
      rec("q20", "quit", 20),
      rec("o10", "won", 10, { partySize: 3 }),
    ];
    expect(keyAverageMs(records, "w50")).toBe(45 * MIN);
  });

  it("is null, not zero, when no finished game under the key has a length", () => {
    expect(keyAverageMs([rec("q", "quit", 20)], "q")).toBeNull();
  });
});
