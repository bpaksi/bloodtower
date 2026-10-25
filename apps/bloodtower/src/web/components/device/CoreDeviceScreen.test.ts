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

const table = {
  chapter: "Proving Grounds",
  day: 1,
  health: "unavailable" as const,
  purse: "unavailable" as const,
  actingGroup: "Hero A",
  actingHeroId: "hero-a",
  movesLeft: 4,
  moveRoll: 4,
  modifier: "none" as const,
  waitingFor: "Hero A is choosing",
  groups: [group],
};

const view = (actions: DeviceView["actions"], inside = false): DeviceView =>
  deviceViewPayloadSchema.parse({
    deviceId: "device-1",
    screen: "play",
    shows: "Day 1",
    heroes: [],
    actions,
    table: { ...table, groups: [{ ...group, inside }] },
  });

const html = (next: DeviceView) =>
  renderToStaticMarkup(
    createElement(CoreDeviceScreen, {
      live: true,
      view: next,
      onAct: () => undefined,
    }),
  );

const mapMarkup = (markup: string): string => {
  const start = markup.indexOf("data-move-map");
  const end = markup.indexOf("</section>", start);
  return markup.slice(start, end);
};

describe("acting iPad move map", () => {
  it("groups adjacent walks, Enter, and End turn, with no image", () => {
    const markup = html(
      view([
        {
          promptId: "day-1-roll-done",
          actionId: "continue",
          label: "Take the move roll",
          open: true,
        },
        {
          promptId: "walk--hero-a--N-muted-forest",
          actionId: "walk",
          label: "Walk to Muted Forest",
          open: true,
        },
        {
          promptId: "enter--hero-a--N-radiant-mountains",
          actionId: "enter",
          label: "Enter Citadel",
          open: true,
        },
        { promptId: "end-turn--hero-a", actionId: "end-turn", label: "End turn", open: true },
      ]),
    );
    expect(markup).toContain('data-screen="play"');
    const map = mapMarkup(markup);
    expect(map).toContain('data-action-id="walk"');
    expect(map).toContain("walk--hero-a--N-muted-forest");
    expect(map).toContain("Walk to Muted Forest");
    expect(map).toContain('data-action-id="enter"');
    expect(map).toContain("Enter Citadel");
    expect(map).toContain('data-action-id="end-turn"');
    expect(map).toContain("End turn");
    expect(map).not.toContain("<img");
    expect(map).not.toContain("day-1-roll-done");
    expect(markup).not.toContain("walk--hero-a--N-the-tundra");
  });

  it("offers only Leave inside a place, with no move map", () => {
    const markup = html(
      view([{ promptId: "leave--hero-a", actionId: "leave", label: "Leave", open: true }], true),
    );
    expect(markup).not.toContain("data-move-map");
    expect(markup).toContain('data-action-id="leave"');
    expect(markup).toContain("Leave");
    expect(markup).not.toContain('data-action-id="walk"');
    expect(markup).not.toContain('data-action-id="end-turn"');
    expect(markup).not.toContain("<img");
    expect(markup).toContain('data-inside="true"');
  });
});
