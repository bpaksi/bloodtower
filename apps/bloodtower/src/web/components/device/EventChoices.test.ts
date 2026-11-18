import { type DeviceView, deviceViewPayloadSchema } from "bloodtower-protocols";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CoreDeviceScreen } from "./CoreDeviceScreen.tsx";

const group = {
  heroId: "hero-a",
  heroName: "Hero A",
  kingdom: "N" as const,
  kingdomLabel: "Arisilon (N)",
  spaceId: "N-radiant-mountains",
  spaceName: "Radiant Mountains",
  building: "citadel",
  inside: false,
  alone: true,
};

const prompt = (id: string) => `day-event--g1--${id}`;
const scene = (
  type: "foes" | "hazard" | "quiet",
  optionIds: ("hit-points" | "lose-turn" | "go-around" | "pay-off" | "fight")[],
  stage: "choose" | "result" = "choose",
  payEnabled = true,
) => ({
  groupId: "g1",
  heroIds: ["hero-a"],
  type,
  hazard: type === "hazard" ? ("storm" as const) : null,
  offer: null,
  stage,
  options: optionIds.map((optionId) => ({
    promptId: prompt(optionId),
    optionId,
    enabled: optionId === "pay-off" ? payEnabled : true,
  })),
  result: stage === "result" ? { kind: "quiet" as const } : null,
  line: null,
  heroes: [],
  purse: null,
});

const LABELS: Record<string, string> = {
  "hit-points": "Lose 2 hit points",
  "lose-turn": "Lose a turn",
  "go-around": "Go around",
  "pay-off": "Pay them off (5 gold)",
  fight: "Fight",
};

const view = (
  event: ReturnType<typeof scene>,
  held: string[] = ["hero-a"],
  payEnabled = true,
): DeviceView =>
  deviceViewPayloadSchema.parse({
    deviceId: "device-1",
    screen: "play",
    shows: "An event",
    heroes: held.map((id) => ({ id, name: id, lines: [] })),
    actions: event.options.map((option) => ({
      promptId: option.promptId,
      actionId: "choose",
      label: LABELS[option.optionId],
      open: true,
    })),
    table: {
      chapter: "Proving Grounds",
      day: 1,
      health: "unavailable",
      purse: "unavailable",
      actingGroup: "Hero A",
      actingHeroId: "hero-a",
      movesLeft: null,
      moveRoll: null,
      modifier: "none",
      waitingFor: null,
      groups: [group],
      event: {
        ...event,
        options: event.options.map((o) => ({
          ...o,
          enabled: o.optionId === "pay-off" ? payEnabled : true,
        })),
      },
    },
  });

const html = (next: DeviceView) =>
  renderToStaticMarkup(
    createElement(CoreDeviceScreen, { live: true, view: next, onAct: () => undefined }),
  );

describe("C3/12 the event choices on the iPad", () => {
  it("foes: Go around and Pay them off, nothing else; Pay them off closes below 5 gold (EV-02)", () => {
    const open = html(view(scene("foes", ["go-around", "pay-off"])));
    expect(open).toContain("Go around");
    expect(open).toContain("Pay them off (5 gold)");
    expect(open).not.toMatch(/fight/i);
    const poor = html(view(scene("foes", ["go-around", "pay-off"]), ["hero-a"], false));
    expect(poor).toMatch(/data-event-option="pay-off"[^>]*disabled/);
  });

  it("a closed Pay them off, with no action, reads its Copy label and is disabled (EV-02)", () => {
    const base = view(scene("foes", ["go-around", "pay-off"]), ["hero-a"], false);
    const closed = {
      ...base,
      actions: base.actions.filter((row) => !row.promptId.endsWith("pay-off")),
    };
    const markup = html(closed);
    expect(markup).toMatch(
      /<button[^>]*data-event-option="pay-off"[^>]*disabled[^>]*>Pay them off \(5 gold\)<\/button>/,
    );
    expect(markup).not.toMatch(/>pay-off</);
  });

  it("never draws a Fight option, even if one is offered (Q-C3-02)", () => {
    const markup = html(view(scene("foes", ["fight", "go-around", "pay-off"])));
    expect(markup).not.toMatch(/fight/i);
  });

  it("an iPad with none of the present heroes shows the waiting line and no choices (EV-03)", () => {
    const markup = html(view(scene("hazard", ["hit-points", "lose-turn"]), ["hero-b"]));
    expect(markup).toContain("The other group is deciding.");
    expect(markup).not.toContain("data-event-option");
  });

  it("an auto-advancing step draws no choices and no Next (EV-13)", () => {
    const markup = html(view(scene("quiet", [], "result")));
    expect(markup).not.toContain("data-event-option");
    expect(markup).not.toContain("data-event-waiting");
    expect(markup).not.toMatch(/>Next</);
  });
});
