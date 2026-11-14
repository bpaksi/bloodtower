import { describe, expect, it } from "vitest";
import { initPlayState } from "../chapter/playState.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import { openQuestAt } from "./quest.ts";
import {
  configureQuestsFromPack,
  ensureQuests,
  questsFromPack,
  restoreQuests,
  setQuestChapter,
  snapshotQuests,
} from "./store.ts";

const scene = { id: "s", title: "T", text: "x", options: [{ id: "o", label: "O", effects: [] }] };
const pack = {
  chapters: [
    { index: 1, quests: [{ id: "herald", scene: "s", place: { space: "N-a" } }] },
    { index: 3, quests: [{ id: "lock", scene: "s", place: { space: "N-b" } }] },
  ],
  // biome-ignore lint/suspicious/noExplicitAny: minimal scene row for the loader
  scenes: [scene as any],
};

describe("C3-19 quest markers per chapter", () => {
  it("EV-04: a chapter's marker is live only while that chapter is current", () => {
    const play = initPlayState("quest", PROVING_GROUNDS_PLAY);
    configureQuestsFromPack(play, pack, 1);
    expect(openQuestAt(play, "N-a")).toBe("herald");
    expect(openQuestAt(play, "N-b")).toBeNull();
    setQuestChapter(play, 3);
    expect(openQuestAt(play, "N-a")).toBeNull();
    expect(openQuestAt(play, "N-b")).toBe("lock");
  });

  it("EV-04: with no chapter given the first chapter is current, and defs keep every chapter", () => {
    const loaded = questsFromPack(pack);
    expect(loaded.bySpace).toEqual({ "N-a": "herald" });
    expect(loaded.defs.map((d) => [d.id, d.chapter])).toEqual([
      ["herald", 1],
      ["lock", 3],
    ]);
  });

  it("EV-06: a pre-C3-19 snapshot (no per-chapter markers) restores whole and keeps its marker", () => {
    const play = initPlayState("quest", PROVING_GROUNDS_PLAY);
    const old = {
      tuning: { tollGold: 10, tollHitPoints: 2, questGold: 5 },
      defs: [],
      bySpace: { "N-a": "herald" },
      done: [],
      progress: {},
      items: {},
      flags: [],
      log: [],
    };
    const restored = restoreQuests(play, JSON.stringify(old));
    expect(restored).toEqual(old);
    expect(openQuestAt(play, "N-a")).toBe("herald");
    setQuestChapter(play, 3);
    expect(ensureQuests(play).bySpace).toEqual({ "N-a": "herald" });
  });

  it("EV-06: a new snapshot round-trips with its current chapter's markers", () => {
    const play = initPlayState("quest", PROVING_GROUNDS_PLAY);
    configureQuestsFromPack(play, pack, 3);
    const again = initPlayState("quest", PROVING_GROUNDS_PLAY);
    restoreQuests(again, snapshotQuests(play));
    expect(openQuestAt(again, "N-b")).toBe("lock");
    expect(openQuestAt(again, "N-a")).toBeNull();
  });
});
