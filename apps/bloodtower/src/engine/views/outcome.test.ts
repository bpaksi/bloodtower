import { describe, expect, it } from "vitest";
import { CHAPTER_3_WIN_COPY, type GameEnd, lossSceneId, WIN_SCENE_ID } from "../loops/game/end.ts";
import {
  buildOutcomeView,
  OUTCOME_COPY,
  type OutcomeSnapshot,
  resolveOutcomeClosing,
} from "./outcome.ts";

const snap = (overrides: Partial<OutcomeSnapshot> = {}): OutcomeSnapshot => ({
  stage: "scene",
  end: { outcome: "lost", reason: "skulls", sceneId: lossSceneId("skulls"), chapter: 1 },
  closing: null,
  summary: { days: 4, questsDone: 1, skullsOnBoard: 7 },
  lineId: null,
  ...overrides,
});

describe("C3/16 outcome view and Copy table", () => {
  it("EV-01: skulls loss shows loss-skulls, exact loss.skulls copy, CUE-003, and summary format", () => {
    const scene = buildOutcomeView(snap());
    expect(scene).toMatchObject({
      stage: "scene",
      outcome: "lost",
      reason: "skulls",
      sceneId: "loss-skulls",
      caption:
        "The last skull falls. The Tower's shadow covers the land, and the roads are his for good.",
      closingId: null,
      summary: null,
      cue: "CUE-003",
      tick: "Moves on by itself.",
      holdMs: 4000,
      lineId: null,
    });

    const summary = buildOutcomeView(snap({ stage: "summary" }));
    expect(summary).toMatchObject({
      stage: "summary",
      sceneId: "loss-skulls",
      caption: null,
      summary: "4 days. 1 quests done. 7 skulls on the board.",
      cue: null,
      tick: "Moves on by itself.",
    });
    expect(summary.summary).toMatch(/^\d+ days\. \d+ quests done\. \d+ skulls on the board\.$/);
  });

  it("EV-02 & PT-02: corruption and fallen-buildings losses carry their exact Copy table lines and CUE-003", () => {
    const corruption = buildOutcomeView(
      snap({
        end: {
          outcome: "lost",
          reason: "corruption",
          sceneId: lossSceneId("corruption"),
          chapter: 1,
        },
      }),
    );
    expect(corruption.sceneId).toBe("loss-corruption");
    expect(corruption.caption).toBe(
      "One of you hears the Tower call, and goes to it. Without them, the hunt is over.",
    );
    expect(corruption.cue).toBe("CUE-003");

    const buildings = buildOutcomeView(
      snap({
        end: {
          outcome: "lost",
          reason: "buildings",
          sceneId: lossSceneId("buildings"),
          chapter: 1,
        },
      }),
    );
    expect(buildings.sceneId).toBe("loss-buildings");
    expect(buildings.caption).toBe(
      "Four strongholds have fallen. There is nowhere left to hold, and his raiders own the land.",
    );
    expect(buildings.cue).toBe("CUE-003");
  });

  it("EV-05 & EV-07: C3 chapter 1 win plays win.scene, then win.chapter-1, then summary, with no CUE-003", () => {
    const end: GameEnd = { outcome: "won", sceneId: WIN_SCENE_ID, chapter: 1 };
    const closing = resolveOutcomeClosing(end, { c3Chapter1: true, flags: new Set() });
    expect(closing).toEqual({
      id: "win-chapter-1",
      text: "The roads are open. On the far hill, a fire burns in the old keep, where no one has lived for forty years.",
    });

    const scene = buildOutcomeView(snap({ stage: "scene", end, closing }));
    expect(scene.sceneId).toBe("win");
    expect(scene.caption).toBe("Chapter cleared.");
    expect(scene.cue).toBeNull();

    const line = buildOutcomeView(snap({ stage: "closing", end, closing }));
    expect(line.caption).toBe(OUTCOME_COPY.winChapter1);
    expect(line.closingId).toBe("win-chapter-1");
    expect(line.cue).toBeNull();

    const summary = buildOutcomeView(snap({ stage: "summary", end, closing }));
    expect(summary.summary).toBe("4 days. 1 quests done. 7 skulls on the board.");
    expect(summary.cue).toBeNull();
  });

  it("EV-03: finale win picks two distinct closing lines from the last choice flag (DEC-664)", () => {
    const end: GameEnd = { outcome: "won", sceneId: WIN_SCENE_ID, chapter: 3 };
    const shattered = resolveOutcomeClosing(end, {
      c3Chapter1: false,
      flags: new Set(["ending-break"]),
    });
    const holds = resolveOutcomeClosing(end, {
      c3Chapter1: false,
      flags: new Set(["ending-oath"]),
    });
    expect(shattered).toEqual({
      id: "win-break",
      text: "The shard shatters. The Tower's call goes quiet, and the roads are yours.",
    });
    expect(holds).toEqual({
      id: "win-oath",
      text: "You swear his oath and take up his watch. The Tower called to him once. It will call to you.",
    });
    expect(shattered?.text).not.toBe(holds?.text);
    // No flag set plays no line, never a wrong one.
    expect(resolveOutcomeClosing(end, { c3Chapter1: false, flags: new Set() })).toBeNull();
    // C3 chapter 1 win ignores finale flags so no finale line shows in C3 (EV-05).
    expect(
      resolveOutcomeClosing(
        { outcome: "won", sceneId: WIN_SCENE_ID, chapter: 1 },
        { c3Chapter1: true, flags: new Set(["ending-break"]) },
      ),
    ).toEqual({ id: "win-chapter-1", text: OUTCOME_COPY.winChapter1 });
    // C4 chapter 3 end uses CHAPTER_3_WIN_COPY.
    expect(
      resolveOutcomeClosing(
        { outcome: "won", sceneId: WIN_SCENE_ID, chapter: 3, end: "chapter_3" },
        { c3Chapter1: false, flags: new Set() },
      ),
    ).toEqual({ id: "win-chapter-3", text: CHAPTER_3_WIN_COPY });
  });
});
