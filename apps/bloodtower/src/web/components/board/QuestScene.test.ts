import type { BoardView } from "bloodtower-protocols";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuestScene, questWords } from "./QuestScene.tsx";

type Quest = NonNullable<NonNullable<NonNullable<BoardView["table"]>["building"]>["quest"]>;

const base: Quest = {
  questId: "herald",
  phase: "choose",
  track: { done: 0, total: 1 },
  optionId: null,
  options: [],
  pending: null,
  reveal: null,
  rewards: null,
};
const render = (quest: Quest) => renderToStaticMarkup(createElement(QuestScene, { quest }));

describe("C3/14 the quest scene's words (Copy table)", () => {
  it("EV-01: the Herald's opening, with one step to come (EV-08)", () => {
    const html = render(base);
    expect(questWords(base)).toEqual([
      'Tomas the herald meets you at the well. "They take a cart a week now. Will you go?"',
    ]);
    expect(html).toContain("The Herald");
    expect(html).toContain('data-track-done="0"');
    expect(html).toContain('data-track-total="1"');
  });

  it("EV-03: the hero pick shows the Reveal and the reward question", () => {
    const html = render({ ...base, phase: "hero", pending: "item", reveal: "tomas-map" });
    expect(html).toContain("Who takes the reward?");
    expect(html).toContain('data-reveal-item="tomas-map"');
    expect(html).toContain("Tomas&#x27;s Map");
    expect(render({ ...base, phase: "hero", pending: "corruption" })).toContain(
      "Who takes the corruption?",
    );
  });

  it("EV-04: the rewards step lists quest gold for each present hero, and moves on by itself", () => {
    const html = render({
      ...base,
      phase: "rewards",
      optionId: "ask-pay-first",
      track: { done: 1, total: 1 },
      rewards: { gold: 10, questGold: 5, items: [], presentHeroes: 2, tollShort: false },
    });
    expect(html).toContain("Tomas counts ten gold out of the village box.");
    expect(html).toContain("You gain: 10 gold, 5 gold each");
    expect(html.match(/data-badge="quest-gold"/g)).toHaveLength(2);
    expect(html).toContain("quest +5");
    expect(html).toContain("Moves on by itself.");
    expect(html).toContain('data-track-done="1"');
  });

  it("the Ambush words a paid toll and a short one apart, and ends on its hook", () => {
    const paid: Quest = {
      ...base,
      questId: "ambush",
      phase: "rewards",
      optionId: "pay-the-toll",
      rewards: { gold: 0, questGold: 5, items: [], presentHeroes: 1, tollShort: false },
    };
    expect(questWords(paid)[0]).toContain("Ten gold, and you walk.");
    const short = { ...paid, rewards: { ...(paid.rewards as object), tollShort: true } } as Quest;
    expect(questWords(short)[0]).toBe(
      "You don't have ten. They take what you have, and a beating for the rest.",
    );
    expect(questWords({ ...paid, phase: "end" })).toEqual([
      "The road is clear. Past the trees, the old keep stands on its hill.",
    ]);
    expect(questWords({ ...base, phase: "end" })).toEqual([
      '"The forest road," Tomas says. "That\'s where they wait."',
    ]);
  });
});
