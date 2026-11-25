import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { gameStatsLines } from "../../../engine/views/stats.ts";
import { GameStats } from "./GameStats.tsx";

const MIN = 60_000;

const render = (label: string, lines: string[]) =>
  renderToStaticMarkup(createElement(GameStats, { label, shows: lines.join("\n") }));

const FINISHED = gameStatsLines(
  {
    outcome: "lost",
    activeMs: 42 * MIN,
    days: 12,
    questsDone: 1,
    corruptionsTaken: 2,
    goldLeft: 7,
    keyMoments: [{ moment: "chapter-won", day: 6 }],
    best: { state: "none" },
    averageMs: 42 * MIN,
  },
  [4, 2],
);

describe("C3/17 GameStats on the Story board (SCR-019)", () => {
  it("paints Tonight's tale with the rows in order and the key moments after the gold (EV-01)", () => {
    const html = render("Game 1", FINISHED);
    expect(html).toContain("Tonight&#x27;s tale");
    expect(html).toContain('data-game-stats-board="stored"');
    const order = [
      'data-stat-row="Outcome"',
      'data-stat-row="Time played"',
      'data-stat-row="Days"',
      'data-stat-row="Quests done"',
      'data-stat-row="Corruptions"',
      'data-stat-row="Gold"',
      "data-key-moments",
      'data-stat-row="Length"',
      'data-stat-row="How was tonight?"',
    ].map((needle) => html.indexOf(needle));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(html).toContain("Day 6: Chapter won.");
    expect(html).toContain("No win yet to compare");
    expect(html).toContain("4 · 2");
    expect(html).not.toContain("Skulls");
    expect(html).not.toContain("Seals");
    expect(html).not.toContain("<button");
  });

  it("leaves out the key moments block and the rating row when there are none", () => {
    const lines = gameStatsLines(
      {
        outcome: "won",
        activeMs: 5 * MIN,
        days: 3,
        questsDone: 0,
        corruptionsTaken: 0,
        goldLeft: 0,
        keyMoments: [],
        best: { state: "this-game" },
        averageMs: 5 * MIN,
      },
      [null],
    );
    const html = render("Game 2", lines);
    expect(html).not.toContain("data-key-moments");
    expect(html).not.toContain("How was tonight?");
    expect(html).toContain("Best: this game");
  });

  it("keeps a quit game's C2 read-out under its own title", () => {
    const html = render("Game 3", ["Story: Proving Grounds", "Outcome: quit", "Time played: —"]);
    expect(html).toContain('data-game-stats-board="quit"');
    expect(html).toContain("<h1");
    expect(html).toContain("Game 3");
    expect(html).not.toContain("Tonight&#x27;s tale");
  });
});
