import { describe, expect, it } from "vitest";
import { ensureClock, heroSheet } from "../day/clock.ts";
import { ensurePicks, setHeroHp, setPurse } from "../encounter/picks.ts";
import { AMBUSH, HERALD, LOCK, questPlay } from "../quest/fixtures.ts";
import { beginQuest, chooseOption, pickHero } from "../quest/quest.ts";
import { chapterProgress, configureQuests, ensureQuests, heroItems } from "../quest/store.ts";
import { lintScene, type PlainScene } from "./scene.ts";

const ok = <T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> => {
  if (!r.ok) throw new Error(`refused: ${JSON.stringify(r)}`);
  return r as Extract<T, { ok: true }>;
};

describe("plain scenes", () => {
  it("EV-01: the Herald pays 10 gold, or the group picks who holds the map", () => {
    const a = questPlay(["h1", "h2"], 0);
    ok(beginQuest(a.play, a.groupId, "herald"));
    ok(chooseOption(a.play, a.groupId, "herald", "pay"));
    expect(ensurePicks(a.play).purse[a.groupId]).toBe(10 + 10); // +5 per present hero
    expect(heroItems(a.play, "h1")).toEqual([]);

    const b = questPlay(["h1", "h2"], 0);
    ok(beginQuest(b.play, b.groupId, "herald"));
    const view = ok(chooseOption(b.play, b.groupId, "herald", "job")).view;
    expect(view.pending).toEqual({ kind: "item", heroes: ["h1", "h2"] });
    expect(view.done).toBe(false);
    // A hero in another group is not pickable.
    expect(pickHero(b.play, b.groupId, "herald", "h3")).toEqual({
      ok: false,
      reason: "not-pickable",
    });
    ok(pickHero(b.play, b.groupId, "herald", "h2"));
    expect(heroItems(b.play, "h2")).toEqual(["tomas-map"]);
    expect(heroItems(b.play, "h1")).toEqual([]);
  });

  it("EV-02: an item option is disabled without the item and the Signet is kept", () => {
    const a = questPlay(["h1", "h2"]);
    const without = ok(beginQuest(a.play, a.groupId, "lock")).view;
    expect(without.options.find((o) => o.id === "open")).toMatchObject({ disabled: true });
    expect(chooseOption(a.play, a.groupId, "lock", "open")).toEqual({
      ok: false,
      reason: "disabled",
    });

    ensureQuests(a.play).items.h2 = ["signet"];
    const view = ok(beginQuest(a.play, a.groupId, "lock")).view;
    expect(view.options.find((o) => o.id === "open")).toMatchObject({ disabled: false });
    ok(chooseOption(a.play, a.groupId, "lock", "open"));
    expect(heroItems(a.play, "h2")).toEqual(["signet"]);
  });

  const costed = (
    cost: PlainScene["options"][number]["cost"],
    effects = [{ kind: "flag" as const, flag: "x" }],
  ) => ({
    id: "t",
    options: [
      { id: "a", label: "A", cost, effects },
      { id: "b", label: "B", effects: [{ kind: "flag" as const, flag: "y" }] },
    ],
  });

  it("EV-03: a hit-point cost stops at 1", () => {
    const { play, groupId } = questPlay(["h1", "h2"]);
    configureQuests(play, {
      defs: [{ id: "t", chapter: 1, scene: costed({ kind: "hp", amount: 3 }) }],
    });
    setHeroHp(play, "h1", 2, 10);
    setHeroHp(play, "h2", 8, 10);
    ok(beginQuest(play, groupId, "t"));
    ok(chooseOption(play, groupId, "t", "a"));
    expect(ensurePicks(play).hp.h1?.hp).toBe(1);
    expect(ensurePicks(play).hp.h2?.hp).toBe(5);
  });

  it("EV-04: a corruption cost goes to the one picked hero", () => {
    const { play, groupId } = questPlay(["h1", "h2"]);
    configureQuests(play, {
      defs: [{ id: "t", chapter: 1, scene: costed({ kind: "corruption" }) }],
    });
    ok(beginQuest(play, groupId, "t"));
    const view = ok(chooseOption(play, groupId, "t", "a")).view;
    expect(view.pending).toEqual({ kind: "corruption", heroes: ["h1", "h2"] });
    expect(heroSheet(ensureClock(play), "h1").corruptions).toBe(0);
    ok(pickHero(play, groupId, "t", "h2"));
    expect(heroSheet(ensureClock(play), "h2").corruptions).toBe(1);
    expect(heroSheet(ensureClock(play), "h1").corruptions).toBe(0);
    expect(ensureQuests(play).done).toContain("t");
  });

  it("EV-05: effects apply in listed order and too little gold disables the option", () => {
    const scene = costed(undefined, [
      { kind: "gold", amount: -10 } as never,
      { kind: "flag", flag: "paid" } as never,
    ]);
    const poor = questPlay(["h1"], 4);
    configureQuests(poor.play, { defs: [{ id: "t", chapter: 1, scene }] });
    const view = ok(beginQuest(poor.play, poor.groupId, "t")).view;
    expect(view.options.find((o) => o.id === "a")?.disabled).toBe(true);

    const rich = questPlay(["h1"], 12);
    configureQuests(rich.play, { defs: [{ id: "t", chapter: 1, scene }] });
    ok(beginQuest(rich.play, rich.groupId, "t"));
    ok(chooseOption(rich.play, rich.groupId, "t", "a"));
    expect(ensureQuests(rich.play).log).toEqual(["gold:-10", "flag:paid"]);
    expect(ensureQuests(rich.play).flags).toContain("paid");
    expect(ensurePicks(rich.play).purse[rich.groupId]).toBe(2 + 5);
  });

  it("EV-06: a done quest pays quest gold to present heroes only and counts", () => {
    const { play, groupId } = questPlay(["h1", "h2"], 0);
    ok(beginQuest(play, groupId, "herald"));
    ok(chooseOption(play, groupId, "herald", "pay"));
    expect(ensurePicks(play).purse[groupId]).toBe(10 + 5 * 2);
    expect(chapterProgress(play, 1)).toEqual({ done: 1, total: 2 });
    expect(ensureClock(play).questsWon).toBe(1);
  });

  it("EV-07: the board waits during a quest", () => {
    const { play, groupId } = questPlay(["h1"], 0);
    const clock = ensureClock(play);
    const before = JSON.stringify({ ...clock, questsWon: 0 });
    const day = play.dayNumber;
    ok(beginQuest(play, groupId, "herald"));
    ok(chooseOption(play, groupId, "herald", "job"));
    ok(pickHero(play, groupId, "herald", "h1"));
    expect(JSON.stringify({ ...ensureClock(play), questsWon: 0 })).toBe(before);
    expect(play.dayNumber).toBe(day);
  });

  it("EV-08: the Ambush hides Fight and the toll finishes it", () => {
    const view = (purse: number) => {
      const r = questPlay(["h1", "h2"], purse);
      setHeroHp(r.play, "h1", 2, 10);
      setHeroHp(r.play, "h2", 9, 10);
      const v = ok(beginQuest(r.play, r.groupId, "ambush")).view;
      return { ...r, v };
    };
    const a = view(14);
    expect(a.v.options).toEqual([{ id: "toll", label: "Pay the toll", disabled: false }]);
    ok(chooseOption(a.play, a.groupId, "ambush", "toll"));
    expect(ensurePicks(a.play).purse[a.groupId]).toBe(4 + 10);
    expect(ensureQuests(a.play).done).toContain("ambush");
    expect(chapterProgress(a.play, 1).done).toBe(1);
    expect(chooseOption(a.play, a.groupId, "ambush", "fight")).toEqual({
      ok: false,
      reason: "unknown-quest",
    });

    const b = view(6);
    expect(b.v.options[0]?.disabled).toBe(false);
    ok(chooseOption(b.play, b.groupId, "ambush", "toll"));
    expect(ensurePicks(b.play).purse[b.groupId]).toBe(10); // 0 + 5 per hero
    expect(ensurePicks(b.play).hp.h1?.hp).toBe(1);
    expect(ensurePicks(b.play).hp.h2?.hp).toBe(7);
    expect(ensureQuests(b.play).done).toContain("ambush");
    setPurse(b.play, b.groupId, 0);
  });

  it("EV-08: the lint takes the one-option Ambush and rejects other one-option scenes", () => {
    expect(lintScene(AMBUSH)).toEqual([]);
    expect(lintScene(HERALD)).toEqual([]);
    expect(lintScene(LOCK)).toEqual([]);
    const lone: PlainScene = {
      id: "lone",
      options: [{ id: "a", label: "A", effects: [{ kind: "flag", flag: "f" }] }],
    };
    expect(lintScene(lone)).not.toEqual([]);
    const four: PlainScene = {
      id: "four",
      options: ["a", "b", "c", "d"].map((id) => ({
        id,
        label: id,
        effects: [{ kind: "flag" as const, flag: id }],
      })),
    };
    expect(lintScene(four)).not.toEqual([]);
    const allBattle: PlainScene = {
      id: "all",
      options: [{ id: "a", label: "A", battle: true, effects: [{ kind: "flag", flag: "f" }] }],
    };
    expect(lintScene(allBattle)).not.toEqual([]);
  });
});
