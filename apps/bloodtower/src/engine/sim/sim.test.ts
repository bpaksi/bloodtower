import { createRng } from "@dark-tower/rng";
import { describe, expect, it } from "vitest";
import { initPlayState, rollGroupMoves } from "../loops/chapter/playState.ts";
import { PROVING_GROUNDS_PLAY } from "../loops/session/playContent.ts";
import { formatSimReport } from "./report.ts";
import { simulateBatch, simulateGame } from "./runner.ts";

describe("Proving Grounds day slice", () => {
  it("rolls 2d4 with floor 2", () => {
    const play = initPlayState("roll-test", PROVING_GROUNDS_PLAY);
    const moves = rollGroupMoves("roll-test", play, { dice: "2d4", floor: 2 });
    expect(moves).toBeGreaterThanOrEqual(2);
    expect(moves).toBeLessThanOrEqual(8);
  });

  it("starts one hero per kingdom at its citadel", () => {
    const play = initPlayState("start-test", PROVING_GROUNDS_PLAY);
    expect(play.groups).toHaveLength(4);
    for (const group of play.groups) {
      const space = play.content.board.spaceById.get(group.spaceId);
      expect(space?.building).toBe("citadel");
    }
  });

  it("simulates days headlessly with a stable report for the same seed", () => {
    const a = formatSimReport(simulateBatch(2, 2, "stable"), 1);
    const b = formatSimReport(simulateBatch(2, 2, "stable"), 1);
    expect(a).toBe(b);
    expect(a).toContain("games=2");
    expect(a).toContain("Day 1");
  });

  it("plays at least one group action per day in a short run", () => {
    const game = simulateGame("action-test", 1, createRng("action-test"));
    expect(game.days.length).toBeGreaterThanOrEqual(1);
    const day = game.days[0];
    const actionCount = Object.values(day?.groups ?? {}).reduce((n, acts) => n + acts.length, 0);
    expect(actionCount).toBeGreaterThan(0);
  });
});
