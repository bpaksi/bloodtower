import { describe, expect, it } from "vitest";
import { springTrap, type TrapHero, type TrapKind, trapLoss } from "./index.ts";

/** D2 / 01: R04 EV-01 to EV-08 and EV-16 (the trap's loss and fall, as rules). */

const h = (id: string, hp: number, corruptions = 0): TrapHero => ({ id, hp, corruptions });
const by = (r: ReturnType<typeof springTrap>, id: string) => {
  const found = r.heroes.find((x) => x.id === id);
  if (!found) throw new Error(`no hero ${id}`);
  return found;
};

describe("R04-EV-01 Pit on a hero above the loss", () => {
  it("pays it and does not fall", () => {
    const r = springTrap("pit", "bold", [h("a", 5)], "a");
    expect(by(r, "a")).toMatchObject({ hp: 1, fell: false, corruptions: 0 });
    expect(r.allFell).toBe(false);
    expect(r.gameLost).toBe(false);
  });
});

describe("R04-EV-02 Pit to exactly 0", () => {
  it("is one corruption and 1 HP at once; the other hero is untouched", () => {
    const r = springTrap("pit", "bold", [h("a", 4), h("b", 6)], "a");
    expect(by(r, "a")).toMatchObject({ hp: 1, fell: true, corruptions: 1 });
    expect(by(r, "b")).toMatchObject({ hp: 6, fell: false, corruptions: 0 });
    expect(r.allFell).toBe(false);
  });
});

describe("R04-EV-03 Pit with a shortfall", () => {
  it("is the same single corruption, not two", () => {
    const r = springTrap("pit", "bold", [h("a", 3), h("b", 6)], "a");
    expect(by(r, "a")).toMatchObject({ hp: 1, fell: true, corruptions: 1 });
    expect(by(r, "b").hp).toBe(6);
  });
});

describe("R04-EV-04 on guard halves, then the same rule", () => {
  it("2 HP falls, 3 HP does not", () => {
    expect(trapLoss("pit", "on-guard")).toBe(2);
    expect(trapLoss("falling-rocks", "on-guard")).toBe(1);
    expect(by(springTrap("pit", "on-guard", [h("a", 2)], "a"), "a")).toMatchObject({
      hp: 1,
      corruptions: 1,
    });
    expect(by(springTrap("pit", "on-guard", [h("a", 3)], "a"), "a")).toMatchObject({
      hp: 1,
      corruptions: 0,
    });
  });
});

describe("R04-EV-05 Falling Rocks fells one of two: no sit-out", () => {
  it("the fallen hero is at 1 and still in the group", () => {
    const r = springTrap("falling-rocks", "bold", [h("a", 2), h("b", 5)]);
    expect(by(r, "a")).toMatchObject({ hp: 1, fell: true, corruptions: 1 });
    expect(by(r, "b")).toMatchObject({ hp: 3, fell: false, corruptions: 0 });
    expect(r.heroes.map((x) => x.id)).toEqual(["a", "b"]);
    expect(r.allFell).toBe(false);
  });
});

describe("R04-EV-06 a trap fells every hero (rule half)", () => {
  it("flags allFell, no gold, the room spent", () => {
    const rocks = springTrap("falling-rocks", "bold", [h("a", 2), h("b", 1)]);
    const pit = springTrap("pit", "bold", [h("a", 4)], "a");
    for (const r of [rocks, pit]) {
      expect(r.allFell).toBe(true);
      expect(r.goldLoss).toBe(0);
      expect(r.roomCleared).toBe(true);
      expect(r.gameLost).toBe(false);
      for (const x of r.heroes) expect([x.hp, x.corruptions]).toEqual([1, 1]);
    }
  });
});

describe("R04-EV-07 a trap's third corruption loses at once", () => {
  it("flags the game lost, once", () => {
    let calls = 0;
    const r = springTrap("pit", "bold", [h("a", 3, 2)], "a", {
      corrupt: () => {
        calls += 1;
        return { count: 3, lost: true };
      },
    });
    expect(r.gameLost).toBe(true);
    expect(calls).toBe(1);
    expect(by(r, "a").corruptions).toBe(3);
    expect(springTrap("pit", "bold", [h("a", 3, 2)], "a").gameLost).toBe(true);
  });
});

describe("R04-EV-08 never 0, never two corruptions (sweep)", () => {
  it("holds for every start", () => {
    for (const kind of ["pit", "falling-rocks"] as TrapKind[])
      for (const stance of ["bold", "on-guard"] as const)
        for (let hp = 1; hp <= 6; hp++)
          for (const corruptions of [0, 1]) {
            const r = springTrap(kind, stance, [h("a", hp, corruptions)], "a");
            const x = by(r, "a");
            expect(x.hp).toBeGreaterThanOrEqual(1);
            expect(x.corruptions - corruptions).toBe(hp <= trapLoss(kind, stance) ? 1 : 0);
          }
  });
});

describe("R04-EV-16 Falling Rocks is one effect, then the loss check", () => {
  it("every hero pays before the loss, in either order", () => {
    const counts: Record<string, number> = { a: 2, b: 0 };
    const port = (id: string) => {
      counts[id] = (counts[id] ?? 0) + 1;
      return { count: counts[id] as number, lost: (counts[id] as number) >= 3 };
    };
    for (const order of [
      ["a", "b"],
      ["b", "a"],
    ]) {
      counts.a = 2;
      counts.b = 0;
      const group = order.map((id) => h(id, 2, counts[id]));
      const r = springTrap("falling-rocks", "bold", group, null, { corrupt: port });
      expect(r.gameLost).toBe(true);
      expect(by(r, "a")).toMatchObject({ hp: 1, corruptions: 3 });
      expect(by(r, "b")).toMatchObject({ hp: 1, corruptions: 1 });
    }
  });
});
