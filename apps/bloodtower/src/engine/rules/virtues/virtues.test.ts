import { describe, expect, it } from "vitest";
import { initPlayState } from "../../loops/chapter/playState.ts";
import { ensureClock } from "../../loops/day/clock.ts";
import { PROVING_GROUNDS_PLAY } from "../../loops/session/playContent.ts";
import {
  applyVirtueChoice,
  groupVirtueIds,
  hasVirtuePanel,
  VIRTUE_TITLE,
  virtuePanel,
} from "./index.ts";

const SEED =
  "s~test-virtues:hero-a=infused+fortunate,hero-b=fixture~test-skulls:N-egans-end=2,N-dayside=1,N-upper-ice-fangs=0,N-radiant-mountains=4";
const play = (seed = SEED) => initPlayState(seed, PROVING_GROUNDS_PLAY);
const groupOf = (p: ReturnType<typeof play>, heroId: string) =>
  p.groups.find((g) => g.heroIds.includes(heroId))?.id ?? "";

describe("turn-start virtues (CU/14)", () => {
  it("the seed gives heroes virtues; a group holds each once", () => {
    const p = play();
    expect(groupVirtueIds(p, groupOf(p, "hero-a"))).toEqual(["infused", "fortunate"]);
    expect(groupVirtueIds(p, groupOf(p, "hero-c"))).toEqual([]);
  });

  it("EV-02: a group with no virtue has no panel", () => {
    const p = play();
    expect(hasVirtuePanel(p, groupOf(p, "hero-c"))).toBe(false);
    expect(virtuePanel(p, groupOf(p, "hero-c"), {}).lines).toEqual([]);
  });

  it("EV-01: the lines read {virtue}: {effect}; Fortunate asks nothing", () => {
    const p = play();
    const panel = virtuePanel(p, groupOf(p, "hero-a"), {});
    expect(panel.title).toBe(VIRTUE_TITLE);
    expect(panel.lines.map((l) => l.text)).toEqual([
      "Infused: remove 1 skull in Arisilon",
      "Fortunate: a second pick today",
    ]);
  });

  it("EV-16: Infused offers the standing buildings of the kingdom; 0 skulls is shown, not pressable", () => {
    const p = play();
    const choice = virtuePanel(p, groupOf(p, "hero-a"), {}).choice;
    expect(choice?.virtueId).toBe("infused");
    // The fallen citadel (4 skulls) is not offered; the 0-skull sanctuary is shown, disabled.
    expect(choice?.options.map((o) => [o.id, o.enabled])).toEqual([
      ["N-egans-end", true],
      ["N-dayside", true],
      ["N-upper-ice-fangs", false],
    ]);
  });

  it("EV-16: a pick removes one skull and returns it to the supply; no second pick", () => {
    const p = play();
    const group = groupOf(p, "hero-a");
    const supply = ensureClock(p).supply;
    expect(applyVirtueChoice(p, group, "infused", "N-egans-end")).toContain("Egan");
    expect(ensureClock(p).skulls["N-egans-end"]).toBe(1);
    expect(ensureClock(p).supply).toBe(Math.min(ensureClock(p).tuning.supply, supply + 1));
    // The line stays after the pick; the options are gone.
    const after = virtuePanel(p, group, { infused: "N-egans-end" });
    expect(after.lines[0]?.text).toContain("Infused");
    expect(after.choice).toBeNull();
  });

  it("refuses a disabled, unknown or foreign pick and changes nothing", () => {
    const p = play();
    const group = groupOf(p, "hero-a");
    expect(applyVirtueChoice(p, group, "infused", "N-upper-ice-fangs")).toBeNull();
    expect(applyVirtueChoice(p, group, "infused", "E-duwani")).toBeNull();
    expect(applyVirtueChoice(p, group, "fixture", "one")).toBeNull();
    expect(applyVirtueChoice(p, group, "fortunate", "x")).toBeNull();
    expect(ensureClock(p).skulls["N-egans-end"]).toBe(2);
  });

  it("no Infused line when no building has a skull", () => {
    const p = play("s~test-virtues:hero-a=infused");
    expect(hasVirtuePanel(p, groupOf(p, "hero-a"))).toBe(false);
  });

  it("EV-03: the fixture virtue asks the same generic list with three options", () => {
    const p = play();
    const choice = virtuePanel(p, groupOf(p, "hero-b"), {}).choice;
    expect(choice?.options).toHaveLength(3);
    expect(applyVirtueChoice(p, groupOf(p, "hero-b"), "fixture", "two")).toBe("Second");
  });
});
