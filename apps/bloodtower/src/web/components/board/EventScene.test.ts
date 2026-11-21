import type { BoardView } from "bloodtower-protocols";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EventScene, eventWords } from "./EventScene.tsx";

type Scene = NonNullable<NonNullable<BoardView["table"]>["event"]>;

const base: Scene = {
  groupId: "g1",
  heroIds: ["hero-a", "hero-b"],
  type: "hazard",
  hazard: "plague",
  offer: null,
  stage: "choose",
  options: [],
  result: null,
  line: null,
  heroes: [],
  purse: null,
};

const render = (scene: Scene) => renderToStaticMarkup(createElement(EventScene, { scene }));

describe("C3/12 the event scene's words (Copy table)", () => {
  it("says the counter saved the group, by name (EV-07)", () => {
    const scene: Scene = {
      ...base,
      stage: "result",
      result: { kind: "saved", counterHeroId: "hero-a", counterName: "Hero A" },
    };
    expect(eventWords(scene)).toBe("Hero A saved you. Nothing is lost.");
    const html = render(scene);
    expect(html).toContain("Hero A saved you. Nothing is lost.");
    expect(html).not.toContain("data-event-cost");
  });

  it("words a hazard, the cost line, foes, Quiet and people from the table", () => {
    expect(eventWords(base)).toBe("Trouble on the road. Lose 2 hit points.");
    const cost = render({
      ...base,
      stage: "result",
      result: { kind: "hit-points", amount: -2 },
    });
    expect(cost).toContain("−2 hit points each");
    expect(cost).toContain("Moves on by itself.");
    expect(eventWords({ ...base, type: "foes", hazard: null })).toBe(
      "Foes block the way. Stand fast or turn back.",
    );
    expect(eventWords({ ...base, type: "disaster", hazard: null })).toBe(
      "Foes block the way. Stand fast or turn back.",
    );
    expect(eventWords({ ...base, type: "quiet", hazard: null })).toBe(
      "The road is still. Nothing comes.",
    );
    expect(eventWords({ ...base, type: "people", hazard: null, offer: "rumour" })).toBe(
      "A stranger leans close.",
    );
  });

  it("shows the windfall as a Reveal with the amount", () => {
    const html = render({
      ...base,
      type: "windfall",
      hazard: null,
      stage: "result",
      result: { kind: "windfall", gold: 5 },
    });
    expect(html).toContain("+5 gold");
    expect(html).toContain("Fortune smiles. You find 5 gold.");
  });

  it("draws no Fight, no choice and no Next on the board", () => {
    const html = render({ ...base, type: "foes", hazard: null });
    expect(html).not.toMatch(/fight|<button|Next/i);
  });
});
