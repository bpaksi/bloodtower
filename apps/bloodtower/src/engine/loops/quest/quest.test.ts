import { describe, expect, it } from "vitest";
import { bindPlayState } from "../chapter/playState.ts";
import { handleQuestPick } from "../encounter/loop.ts";
import { ensurePicks } from "../encounter/picks.ts";
import { questPlay } from "./fixtures.ts";
import { beginQuest, chooseOption, leaveQuest, openQuestAt, pickHero } from "./quest.ts";
import {
  chapterProgress,
  configureQuests,
  ensureQuests,
  heroItems,
  restoreQuests,
  snapshotQuests,
} from "./store.ts";

const ok = <T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> => {
  if (!r.ok) throw new Error(`refused: ${JSON.stringify(r)}`);
  return r as Extract<T, { ok: true }>;
};

describe("quest survival", () => {
  it("EV-09: Continue keeps a done quest and its item", () => {
    const { play, groupId } = questPlay(["h1", "h2"]);
    ok(beginQuest(play, groupId, "herald"));
    ok(chooseOption(play, groupId, "herald", "job"));
    ok(pickHero(play, groupId, "herald", "h2"));
    const saved = snapshotQuests(play);

    const again = questPlay(["h1", "h2"]);
    restoreQuests(again.play, saved);
    expect(ensureQuests(again.play).done).toContain("herald");
    expect(heroItems(again.play, "h2")).toEqual(["tomas-map"]);
    expect(heroItems(again.play, "h1")).toEqual([]);
    expect(beginQuest(again.play, again.groupId, "herald")).toEqual({
      ok: false,
      reason: "already-done",
    });
    expect(chapterProgress(again.play, 1).done).toBe(1);
  });

  it("EV-10: Continue keeps a part-done quest and resumes at its step", () => {
    const { play, groupId } = questPlay(["h1", "h2"]);
    ok(beginQuest(play, groupId, "herald"));
    ok(chooseOption(play, groupId, "herald", "job")); // waits on the item pick
    expect(leaveQuest(play, "herald")).toBe(true);
    const saved = snapshotQuests(play);

    const again = questPlay(["h1", "h2"]);
    restoreQuests(again.play, saved);
    const store = ensureQuests(again.play);
    expect(store.done).not.toContain("herald");
    expect(chapterProgress(again.play, 1).done).toBe(0);
    expect(store.progress.herald).toEqual({ optionId: "job", costPaid: true, next: 0 });
    const view = ok(beginQuest(again.play, again.groupId, "herald")).view;
    expect(view.pending).toEqual({ kind: "item", heroes: ["h1", "h2"] });
    ok(pickHero(again.play, again.groupId, "herald", "h1"));
    expect(heroItems(again.play, "h1")).toEqual(["tomas-map"]);
    expect(ensureQuests(again.play).done).toContain("herald");
  });

  it("the Quest pick enters the open quest at the group's space", () => {
    const { play, groupId } = questPlay(["h1"]);
    const space = play.groups[0]?.spaceId ?? "";
    configureQuests(play, { bySpace: { [space]: "herald" } });
    bindPlayState(play);
    try {
      expect(openQuestAt(play, space)).toBe("herald");
      const result = ok(handleQuestPick(groupId));
      expect(result.view.questId).toBe("herald");
      ok(chooseOption(play, groupId, "herald", "pay"));
      expect(handleQuestPick(groupId)).toEqual({ ok: false, reason: "unknown-quest" });
      expect(ensurePicks(play).purse[groupId]).toBe(15);
    } finally {
      bindPlayState(null);
    }
  });
});
