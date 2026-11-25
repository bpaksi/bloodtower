import { describe, expect, it } from "vitest";
import {
  type GameStatsInput,
  gameStatsLines,
  parseStatsLines,
  STATS_COPY,
  STATS_SHOWS_MAX,
} from "./stats.ts";

const MIN = 60_000;

/** The `c3-stats-loss` fixture of EV-01: lost, 42 min, 12 days, 1 quest, 2 corruptions, 7 gold. */
const LOSS: GameStatsInput = {
  outcome: "lost",
  activeMs: 42 * MIN,
  days: 12,
  questsDone: 1,
  corruptionsTaken: 2,
  goldLeft: 7,
  keyMoments: [],
  best: { state: "earlier", ms: 40 * MIN },
  averageMs: 45 * MIN,
};

describe("C3/17 the game stats lines", () => {
  it("lists every stat in the order of SCR-019, with no skulls or seals row (EV-01, EV-06, EV-18)", () => {
    expect(gameStatsLines(LOSS, [])).toEqual([
      "Outcome: Lost",
      "Time played: 42 min",
      "Days: 12",
      "Quests done: 1",
      "Corruptions: 2",
      "Gold: 7",
      "Length: 42 min (best 40 min · average 45 min)",
    ]);
  });

  it("shows a won game as Won (EV-17)", () => {
    expect(gameStatsLines({ ...LOSS, outcome: "won" }, [])[0]).toBe("Outcome: Won");
  });

  it("shows an unknown value as unavailable, never zero", () => {
    const lines = gameStatsLines(
      {
        ...LOSS,
        activeMs: null,
        days: null,
        questsDone: null,
        corruptionsTaken: null,
        goldLeft: null,
        averageMs: null,
      },
      [],
    );
    expect(lines).toEqual([
      "Outcome: Lost",
      "Time played: unavailable",
      "Days: unavailable",
      "Quests done: unavailable",
      "Corruptions: unavailable",
      "Gold: unavailable",
      "Length: unavailable (best 40 min · average unavailable)",
    ]);
  });

  it("puts the key moments between Gold and Length, in the order they happened (Q-C3-18)", () => {
    const lines = gameStatsLines(
      {
        ...LOSS,
        keyMoments: [
          { moment: "quest-done", day: 2, quest: "The Herald" },
          { moment: "corruption-taken", day: 3, hero: "Ada" },
          { moment: "item-gained", day: 4, hero: "Ada", item: "Moon Blade" },
          { moment: "building-fallen", day: 5, building: "Ironhold" },
          { moment: "chapter-won", day: 6 },
        ],
      },
      [],
    );
    expect(lines.slice(5, 12)).toEqual([
      "Gold: 7",
      STATS_COPY.momentsTitle,
      "• Day 2: The Herald done.",
      "• Day 3: Ada took a corruption.",
      "• Day 4: Ada gained Moon Blade.",
      "• Day 5: Ironhold fell.",
      "• Day 6: Chapter won.",
    ]);
    expect(lines[12]).toBe("Length: 42 min (best 40 min · average 45 min)");
  });

  it("names the first win as the best, with no best minutes (EV-14)", () => {
    const [length] = gameStatsLines(
      { ...LOSS, outcome: "won", best: { state: "this-game" } },
      [],
    ).filter((line) => line.startsWith("Length"));
    expect(length).toBe("Length: 42 min (Best: this game · average 45 min)");
  });

  it("says no win yet when no win exists under the key (EV-15)", () => {
    const [length] = gameStatsLines({ ...LOSS, best: { state: "none" } }, []).filter((line) =>
      line.startsWith("Length"),
    );
    expect(length).toBe("Length: 42 min (No win yet to compare · average 45 min)");
  });

  it("shows the ratings one per seat, a dash for a seat that did not rate (EV-11)", () => {
    expect(gameStatsLines(LOSS, [4, 2]).at(-1)).toBe("How was tonight?: 4 · 2");
    expect(gameStatsLines(LOSS, [null, 2]).at(-1)).toBe("How was tonight?: – · 2");
    expect(gameStatsLines(LOSS, [null, null]).at(-1)).toBe(
      "Length: 42 min (best 40 min · average 45 min)",
    );
  });

  it("keeps the lines inside one level's limit with many long moments, and counts the ones left out", () => {
    const name = "n".repeat(80);
    const keyMoments = Array.from({ length: 25 }, (_, index) => ({
      moment: "item-gained" as const,
      day: index + 1,
      hero: name,
      item: name,
    }));
    const lines = gameStatsLines({ ...LOSS, keyMoments }, [4, 2, 5, 1]);
    expect(lines.join("\n").length).toBeLessThanOrEqual(STATS_SHOWS_MAX);
    const shown = lines.filter((line) => line.startsWith("• Day")).length;
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(25);
    expect(lines.find((line) => line.startsWith("• and "))).toBe(`• and ${25 - shown} more`);
    // The rows after the moments are still there.
    expect(lines.at(-1)).toBe("How was tonight?: 4 · 2 · 5 · 1");
    expect(parseStatsLines(lines.join("\n")).moments.at(-1)).toBe(`and ${25 - shown} more`);
  });

  it("says nothing about more when every moment fits", () => {
    const keyMoments = Array.from({ length: 6 }, (_, index) => ({
      moment: "chapter-won" as const,
      day: index + 1,
    }));
    const lines = gameStatsLines({ ...LOSS, keyMoments }, []);
    expect(lines.filter((line) => line.startsWith("• Day"))).toHaveLength(6);
    expect(lines.some((line) => line.includes(" more"))).toBe(false);
  });

  it("rounds the minutes and never reads a short game as zero minutes", () => {
    const lines = gameStatsLines({ ...LOSS, activeMs: 20 * 1000 }, []);
    expect(lines[1]).toBe("Time played: 1 min");
  });

  it("parses its own lines back into rows, moments and nothing else", () => {
    const lines = gameStatsLines(
      { ...LOSS, keyMoments: [{ moment: "chapter-won", day: 6 }] },
      [4, 2],
    );
    expect(parseStatsLines(lines.join("\n"))).toEqual({
      rows: [
        { label: "Outcome", value: "Lost" },
        { label: "Time played", value: "42 min" },
        { label: "Days", value: "12" },
        { label: "Quests done", value: "1" },
        { label: "Corruptions", value: "2" },
        { label: "Gold", value: "7" },
        { label: "Length", value: "42 min (best 40 min · average 45 min)" },
        { label: "How was tonight?", value: "4 · 2" },
      ],
      moments: ["Day 6: Chapter won."],
      momentsAfter: 6,
    });
  });
});
