import { describe, expect, it } from "vitest";
import type { PlayState } from "../chapter/playState.ts";
import { ensureClock, heroSheet, isGameLost, setHeroSheet } from "../day/clock.ts";
import { cards, config, hero } from "./fixtures.ts";
import { playPorts, startBattle } from "./index.ts";

/** EV-28 through the game's own corruption record and loss path (DEC-676, DEC-905, DEC-907). */

const fakePlay = (): PlayState => ({ rngSeq: 1, groups: [] }) as unknown as PlayState;

describe("EV-28 the third corruption loses the game through the existing path", () => {
  it("sets the clock's loss once; the battle closes game-lost with no reward", () => {
    const play = fakePlay();
    setHeroSheet(play, "a", { helpingVirtues: 0, corruptions: 2, named: ["cruel", "greedy"] });
    const s = startBattle(
      config({
        heroes: [hero("a", { hp: 1, max: 5, corruptions: 2 })],
        stance: "on-guard",
        foe: { id: "o", level: 2, cards: cards(2) },
      }),
      playPorts(play, "seed"),
    );
    expect(s.result?.kind).toBe("game-lost");
    expect(s.result?.reward).toBeNull();
    expect(heroSheet(ensureClock(play), "a").corruptions).toBe(3);
    expect(isGameLost(play)).toBe(true);
    expect(s.log.filter((e) => e.kind === "battle.close")).toHaveLength(1);
  });
  it("a loss already on the clock stops a fresh battle at its first gate", () => {
    const play = fakePlay();
    ensureClock(play).outcome = { lost: true, reason: "skulls" };
    const s = startBattle(config(), playPorts(play, "seed"));
    expect(s.result?.kind).toBe("game-lost");
    expect(s.log.some((e) => e.kind === "round.choice")).toBe(false);
  });
});
