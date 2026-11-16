import { describe, expect, it } from "vitest";
import { initPlayState } from "../../loops/chapter/playState.ts";
import { ensureClock, heroSheet } from "../../loops/day/clock.ts";
import { dayTuningFrom } from "../../loops/day/rules.ts";
import { PROVING_GROUNDS_PLAY } from "../../loops/session/playContent.ts";
import { heldItems, itemName, POTION, refusalMessage, useItem } from "./index.ts";

const SEED = "s~test-items:hero-b=potion+potion,hero-c=potion~test-hp:hero-b=2/10,hero-c=9/10";
const play = () => initPlayState(SEED, PROVING_GROUNDS_PLAY);

describe("items rule (CU/13)", () => {
  it("the seed gives heroes items and hit points; others hold nothing", () => {
    const p = play();
    expect(heldItems(p, "hero-b")).toEqual([POTION, POTION]);
    expect(heldItems(p, "hero-a")).toEqual([]);
    expect(heroSheet(ensureClock(p), "hero-b").hp).toEqual({ hp: 2, max: 10 });
  });

  it("EV-07: a potion raises hit points by the tuned amount and is gone once", () => {
    const p = play();
    const first = useItem(p, "hero-b", "hero-b", POTION);
    expect(first).toEqual({ ok: true, hp: 6 });
    expect(heldItems(p, "hero-b")).toEqual([POTION]);
    useItem(p, "hero-b", "hero-b", POTION);
    expect(heldItems(p, "hero-b")).toEqual([]);
    const third = useItem(p, "hero-b", "hero-b", POTION);
    expect(third).toMatchObject({ ok: false, reason: "not-held" });
    expect(heroSheet(ensureClock(p), "hero-b").hp?.hp).toBe(10);
  });

  it("reads the tuned amount from battle.potion_hit_points", () => {
    expect(dayTuningFrom({ battle: { potion_hit_points: 7 } }).potionHitPoints).toBe(7);
    expect(dayTuningFrom().potionHitPoints).toBe(4);
  });

  it("hit points stop at the maximum", () => {
    const p = play();
    expect(useItem(p, "hero-c", "hero-c", POTION)).toEqual({ ok: true, hp: 10 });
  });

  it("EV-20: another group's hero is refused and nothing changes", () => {
    const p = play();
    const refused = useItem(p, "hero-a", "hero-b", POTION);
    expect(refused).toMatchObject({ ok: false, reason: "not-acting" });
    expect(heldItems(p, "hero-b")).toEqual([POTION, POTION]);
    expect(heroSheet(ensureClock(p), "hero-b").hp?.hp).toBe(2);
    expect(useItem(p, null, "hero-b", POTION)).toMatchObject({ ok: false, reason: "not-acting" });
  });

  it("refuses an unknown hero, an unknown item and unknown hit points; none is silent", () => {
    const p = play();
    expect(useItem(p, "hero-b", "nobody", POTION)).toMatchObject({ reason: "no-hero" });
    expect(useItem(p, "hero-b", "hero-b", "elixir")).toMatchObject({ reason: "unknown-item" });
    const bare = initPlayState("s~test-items:hero-b=potion", PROVING_GROUNDS_PLAY);
    const refused = useItem(bare, "hero-b", "hero-b", POTION);
    expect(refused).toMatchObject({ ok: false, reason: "hp-unknown" });
    expect(heldItems(bare, "hero-b")).toEqual([POTION]);
    if (!refused.ok) expect(refusalMessage(refused, (id) => id)).toContain("not known");
  });

  it("EV-13: an item with no name reads unavailable, never blank", () => {
    expect(itemName(POTION)).toBe("Healing potion");
    expect(itemName("mystery")).toBeNull();
  });

  it("a bad seed marker is an error, not ignored", () => {
    expect(() => initPlayState("s~test-hp:hero-b=lots", PROVING_GROUNDS_PLAY)).toThrow(
      /test seed marker/,
    );
  });
});
