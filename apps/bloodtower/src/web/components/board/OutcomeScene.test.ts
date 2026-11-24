import type { BoardView } from "bloodtower-protocols";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OutcomeScene } from "./OutcomeScene.tsx";

type Outcome = NonNullable<NonNullable<BoardView["table"]>["outcome"]>;

const base: Outcome = {
  stage: "scene",
  outcome: "won",
  reason: null,
  sceneId: "win",
  closingId: "win-chapter-1",
  caption: "Chapter cleared.",
  summary: "1 days. 2 quests done. 0 skulls on the board.",
  tick: "Moves on by itself.",
  cue: null,
  lineId: null,
  holdMs: 4000,
};

const render = (outcome: Outcome) => renderToStaticMarkup(createElement(OutcomeScene, { outcome }));

describe("C3/16 OutcomeScene on the Story board (SCR-018)", () => {
  it("EV-05: renders the win scene with its painting, caption, and no CUE-003", () => {
    const html = render(base);
    expect(html).toContain('data-outcome-scene="win"');
    expect(html).toContain('data-outcome-stage="scene"');
    expect(html).toContain('data-outcome="won"');
    expect(html).toContain("data-painting");
    expect(html).toContain("Chapter cleared.");
    expect(html).not.toContain("data-cue");
    expect(html).not.toContain("<button");
  });

  it("EV-03 & EV-05: renders closing stage with painting and exact Loremaster closing line", () => {
    const c3 = render({
      ...base,
      stage: "closing",
      closingId: "win-chapter-1",
      caption:
        "The roads are open. On the far hill, a fire burns in the old keep, where no one has lived for forty years.",
    });
    expect(c3).toContain('data-outcome-stage="closing"');
    expect(c3).toContain('data-outcome-closing="win-chapter-1"');
    expect(c3).toContain("data-painting");
    expect(c3).toContain("The roads are open.");

    const shattered = render({
      ...base,
      stage: "closing",
      closingId: "win-finale-shattered",
      caption: "The shard shatters. The Tower's call goes quiet, and the roads are yours.",
    });
    expect(shattered).toContain("The shard shatters.");
    expect(shattered).toContain('data-outcome-closing="win-finale-shattered"');
  });

  it("EV-01, EV-02, EV-07, PT-02: renders all three loss scenes with CUE-003 and painting", () => {
    const losses: Array<{
      reason: "skulls" | "corruption" | "buildings";
      sceneId: "loss-skulls" | "loss-corruption" | "loss-buildings";
      caption: string;
    }> = [
      {
        reason: "skulls",
        sceneId: "loss-skulls",
        caption:
          "The last skull falls. The Tower's shadow covers the land, and the roads are his for good.",
      },
      {
        reason: "corruption",
        sceneId: "loss-corruption",
        caption: "One of you hears the Tower call, and goes to it. Without them, the hunt is over.",
      },
      {
        reason: "buildings",
        sceneId: "loss-buildings",
        caption:
          "Four strongholds have fallen. There is nowhere left to hold, and his raiders own the land.",
      },
    ];
    for (const loss of losses) {
      const html = render({
        ...base,
        outcome: "lost",
        reason: loss.reason,
        sceneId: loss.sceneId,
        closingId: null,
        caption: loss.caption,
        cue: "CUE-003",
      });
      expect(html).toContain(`data-outcome-scene="${loss.sceneId}"`);
      expect(html).toContain('data-outcome="lost"');
      expect(html).toContain('data-cue="CUE-003"');
      expect(html).toContain("data-painting");
      expect(html).toContain(loss.caption.replace("'", "&#x27;"));
      expect(html).not.toContain("<button");
    }
  });

  it("EV-06: renders the summary stage as compact frame without painting or CUE-003", () => {
    const html = render({
      ...base,
      stage: "summary",
      caption: null,
      cue: null,
      summary: "3 days. 1 quests done. 4 skulls on the board.",
    });
    expect(html).toContain('data-outcome-stage="summary"');
    expect(html).toContain('data-dialog-size="compact"');
    expect(html).toContain("3 days. 1 quests done. 4 skulls on the board.");
    expect(html).not.toContain("data-painting");
    expect(html).not.toContain("data-cue");
    expect(html).not.toContain("<button");
  });
});
