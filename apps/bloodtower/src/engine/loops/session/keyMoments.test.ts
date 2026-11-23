import { describe, expect, it } from "vitest";
import { POTION } from "../../rules/items/index.ts";
import { type ChapterPlan, configureChapters, tryChapters } from "../chapter/chapters.ts";
import type { PlayState } from "../chapter/playState.ts";
import { ensureClock, heroSheet, setBuildingSkulls, setHeroSheet } from "../day/clock.ts";
import { questPlay } from "../quest/fixtures.ts";
import { ensureQuests } from "../quest/store.ts";
import { momentsBetween, snapshotMoments } from "./keyMoments.ts";
import type { ShellState } from "./state.ts";

/*
 * Key moments from a step's before and after (Q-C3-18, Gamewright 2026-11-23): each new moment
 * is one effect with its day and the C3/17 fill-ins.
 */

const PLAN: ChapterPlan = {
  c3EndAfterChapter1: true,
  sealBreakMin: 2,
  foeLevel: { chapter1: 1, perChapter: 1 },
  seals: [{ id: "seal-a", glyph: "glyph-a", boon: "boon-a" }],
  chapters: [{ id: "ch-1", index: 1, kingdoms: ["N"], quests: [] }],
};

const shellOf = (play: PlayState, gameId: string | null = "game-1"): ShellState =>
  ({
    play,
    activeGameId: gameId,
    stories: [{ heroes: [{ id: "hero-a", name: "Arisilon" }] }],
  }) as unknown as ShellState;

const setUp = () => {
  const { play } = questPlay(["hero-a", "hero-b"]);
  play.dayNumber = 3;
  ensureClock(play);
  configureChapters(play, PLAN);
  const building = play.content.board.spaces.find((space) => space.building);
  if (!building) throw new Error("The test board needs a building.");
  return { play, shell: shellOf(play), building };
};

describe("key moments from a step (Q-C3-18)", () => {
  it("names each of the five kinds with its day, in the Q-C3-18 order", () => {
    const { play, shell, building } = setUp();
    ensureQuests(play).bySpace[building.id] = "herald";
    const before = snapshotMoments(shell);

    ensureQuests(play).done.push("herald");
    ensureQuests(play).items["hero-a"] = ["tomas-map"];
    setHeroSheet(play, "hero-b", { ...heroSheet(ensureClock(play), "hero-b"), items: [POTION] });
    setBuildingSkulls(play, building.id, 4);
    setHeroSheet(play, "hero-a", {
      ...heroSheet(ensureClock(play), "hero-a"),
      corruptions: 1,
      named: ["cruel"],
    });
    tryChapters(play)?.nodes.push("won");

    const moments = momentsBetween(shell, before, snapshotMoments(shell));
    expect(moments.map((row) => row.moment)).toEqual([
      "quest-done",
      "item-gained",
      "item-gained",
      "building-fallen",
      "corruption-taken",
      "chapter-won",
    ]);
    expect(moments.every((row) => row.day === 3 && row.gameId === "game-1")).toBe(true);
    expect(moments[0]).toMatchObject({ questId: "herald", quest: building.name });
    expect(moments[1]).toMatchObject({ heroId: "hero-a", hero: "Arisilon", item: "tomas-map" });
    expect(moments[2]).toMatchObject({ heroId: "hero-b", hero: "hero-b", item: "Healing potion" });
    expect(moments[3]).toMatchObject({ spaceId: building.id, building: building.name });
    expect(moments[4]).toMatchObject({ heroId: "hero-a", corruptionId: "cruel" });
    expect(moments[5]).toMatchObject({ chapter: 1 });
  });

  it("a step that changes nothing makes no moment", () => {
    const { shell } = setUp();
    const before = snapshotMoments(shell);
    expect(momentsBetween(shell, before, snapshotMoments(shell))).toEqual([]);
  });

  it("counts repeats: a second potion is one more moment, a used one is none", () => {
    const { play, shell } = setUp();
    const sheet = () => heroSheet(ensureClock(play), "hero-a");
    setHeroSheet(play, "hero-a", { ...sheet(), items: [POTION] });
    const before = snapshotMoments(shell);
    setHeroSheet(play, "hero-a", { ...sheet(), items: [POTION, POTION] });
    expect(momentsBetween(shell, before, snapshotMoments(shell))).toHaveLength(1);
    const after = snapshotMoments(shell);
    setHeroSheet(play, "hero-a", { ...sheet(), items: [POTION] });
    expect(momentsBetween(shell, after, snapshotMoments(shell))).toEqual([]);
  });

  it("a cleansed corruption, or a building already fallen, is no moment", () => {
    const { play, shell, building } = setUp();
    const sheet = () => heroSheet(ensureClock(play), "hero-a");
    setHeroSheet(play, "hero-a", { ...sheet(), corruptions: 2 });
    setBuildingSkulls(play, building.id, 4);
    const before = snapshotMoments(shell);
    setHeroSheet(play, "hero-a", { ...sheet(), corruptions: 1 });
    setBuildingSkulls(play, building.id, 5);
    expect(momentsBetween(shell, before, snapshotMoments(shell))).toEqual([]);
  });

  it("a day before day 1 is null, never 0", () => {
    const { play, shell } = setUp();
    play.dayNumber = 0;
    const before = snapshotMoments(shell);
    ensureQuests(play).done.push("ambush");
    const [moment] = momentsBetween(shell, before, snapshotMoments(shell));
    expect(moment).toMatchObject({ moment: "quest-done", day: null, quest: "ambush" });
  });

  it("no game id, no snapshot, or a new play object (Continue) makes no moment", () => {
    const { play, shell } = setUp();
    const before = snapshotMoments(shell);
    ensureQuests(play).done.push("herald");
    const after = snapshotMoments(shell);
    expect(momentsBetween(shellOf(play, null), before, after)).toEqual([]);
    expect(momentsBetween(shell, null, after)).toEqual([]);
    const rebuilt = questPlay(["hero-a", "hero-b"]).play;
    ensureClock(rebuilt);
    expect(momentsBetween(shell, before, snapshotMoments(shellOf(rebuilt)))).toEqual([]);
  });
});
