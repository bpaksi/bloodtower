import type { DeviceView } from "bloodtower-protocols";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { helpScreenFor } from "./gearMenu.ts";
import { PlaceMenu, questCostLine, questGainLine } from "./PlaceMenu.tsx";

type Building = NonNullable<NonNullable<DeviceView["table"]>["building"]>;
type QuestOption = NonNullable<Building["quest"]>["options"][number];

const option = (over: Partial<QuestOption>): QuestOption => ({
  promptId: "p1",
  optionId: "o",
  needsItem: null,
  held: true,
  cost: null,
  gains: [],
  ...over,
});

const building = (quest: Building["quest"], options: Building["options"]): Building => ({
  title: "Village",
  step: "quest",
  heroIds: ["hero-a"],
  prompt: null,
  options,
  result: null,
  holdMs: 4000,
  skulls: 0,
  movesLeft: 1,
  quest,
});

const render = (b: Building) =>
  renderToStaticMarkup(
    createElement(PlaceMenu, {
      building: b,
      heldHeroIds: ["hero-a"],
      live: true,
      offered: true,
      onAct: () => {},
    }),
  );

describe("C3/14 the quest on the iPad", () => {
  it("EV-01: each option is a button with its gain; the prompt is 'Will you help?'", () => {
    const html = render(
      building(
        {
          questId: "herald",
          phase: "choose",
          track: { done: 0, total: 1 },
          optionId: null,
          options: [
            option({
              promptId: "a",
              optionId: "ask-pay-first",
              gains: [{ kind: "gold", amount: 10 }],
            }),
            option({
              promptId: "b",
              optionId: "take-the-job",
              gains: [{ kind: "item", item: "tomas-map" }],
            }),
          ],
          pending: null,
          reveal: null,
          rewards: null,
        },
        [
          { promptId: "a", label: "Ask for pay first", detail: null, enabled: true, reason: null },
          { promptId: "b", label: "Take the job", detail: null, enabled: true, reason: null },
        ],
      ),
    );
    expect(html).toContain("Will you help?");
    expect(html).toContain("+10 gold");
    expect(html).toContain("Tomas&#x27;s Map");
    expect(html.match(/data-building-option/g)).toHaveLength(2);
  });

  it("EV-02: a missing item greys the option with its name; a held one says Use", () => {
    const quest = (held: boolean): Building["quest"] => ({
      questId: "lock",
      phase: "choose",
      track: { done: 0, total: 1 },
      optionId: null,
      options: [option({ promptId: "a", needsItem: "signet", held })],
      pending: null,
      reveal: null,
      rewards: null,
    });
    const row = (enabled: boolean): Building["options"] => [
      { promptId: "a", label: "Turn the Signet", detail: null, enabled, reason: null },
    ];
    const missing = render(building(quest(false), row(false)));
    expect(missing).toContain("Needs The Warden&#x27;s Signet");
    expect(missing).toContain('data-building-enabled="false"');
    expect(render(building(quest(true), row(true)))).toContain("Use The Warden&#x27;s Signet");
  });

  it("EV-06: the toll reads 10 gold, or the purse and the hit points when short", () => {
    const toll = (purse: number | null) =>
      option({ cost: { kind: "toll", amount: 10, hitPoints: 2, purse } });
    expect(questCostLine(toll(12))).toBe("10 gold");
    expect(questCostLine(toll(null))).toBe("10 gold");
    expect(questCostLine(toll(6))).toBe("6 gold · 2 hit points each");
    expect(
      questCostLine(option({ cost: { kind: "gold", amount: 2, hitPoints: 0, purse: 5 } })),
    ).toBe("cost: 2 gold");
    expect(questGainLine(option({}))).toBeNull();
  });

  it("the rewards step keeps only the tick on the iPad, and the help sheet is the quest's", () => {
    const html = render({
      ...building(
        {
          questId: "herald",
          phase: "rewards",
          track: { done: 1, total: 1 },
          optionId: "ask-pay-first",
          options: [],
          pending: null,
          reveal: null,
          rewards: { gold: 10, questGold: 5, items: [], presentHeroes: 1, tollShort: false },
        },
        [],
      ),
      step: "result",
      result: { pick: "quest", line: "The quest is done.", detail: null, badge: null, auto: true },
    });
    expect(html).toContain("Moves on by itself.");
    expect(html).not.toContain("The quest is done.");
    expect(html).not.toContain("data-building-option");
    expect(helpScreenFor({ table: { building: { quest: {} } } }, false)).toBe("quest-scene");
    expect(helpScreenFor({ table: { building: {} }, gear: { helpScreen: "play" } }, false)).toBe(
      "play",
    );
  });
});
