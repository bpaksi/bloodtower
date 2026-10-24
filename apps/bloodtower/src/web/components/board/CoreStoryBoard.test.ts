import type { BoardView } from "bloodtower-protocols";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CoreStoryBoard } from "./CoreStoryBoard.tsx";

const join = {
  id: "join",
  label: "Join",
  shows: "Code 124285 — http://10.0.0.252:4787/join?code=124285",
};

const heroes = ["a", "b", "c", "d"].map((letter) => ({
  id: `hero-${letter}`,
  name: `Hero ${letter.toUpperCase()}`,
  held: false,
}));

const splashView = {
  screen: "splash",
  levels: [join, { id: "splash", label: "splash", shows: "Blood Tower" }],
  heroes,
  narration: null,
  actions: [
    { promptId: "splash-play", actionId: "continue", label: "Play", open: true },
    { promptId: "tower-connect", actionId: "tower-connect", label: "Connect tower", open: true },
  ],
} as BoardView;

const html = (view: BoardView, debug?: boolean) =>
  renderToStaticMarkup(createElement(CoreStoryBoard, { view, debug }));

describe("story board startup chrome", () => {
  it.fails("draws splash as a title lobby, not the protocol dump", () => {
    const markup = html(splashView);
    expect(markup).toContain('data-board-mode="startup"');
    expect(markup).toContain('data-screen="splash"');
    expect(markup).toContain('data-illusionist-asset="dialog-frame"');
    expect(markup).toContain('data-join-code="124285"');
    expect(markup).toContain("<h1");
    expect(markup).toContain("Blood Tower");
    expect(markup).toMatch(/iPad/);
    expect(markup).toMatch(/Join/);
    expect(markup).toContain("data-next-prompt");
    expect(markup).not.toContain("Hero A — waiting");
    expect(markup).not.toContain("Code 124285 — http://");
    expect(markup).not.toContain(">splash</h2>");
    expect(markup).not.toContain(">Join</h2>");
    expect(markup).not.toMatch(/<button/i);
    expect(markup).not.toMatch(/<(?:input|textarea|select|a)\b/i);
    expect(markup).not.toContain("data-status-strip");
    expect(markup.match(/data-illusionist-asset="dialog-frame"/g)).toHaveLength(1);
  });

  it.fails("keeps the status strip on the debug face only", () => {
    const markup = html(splashView, true);
    expect(markup).toContain("data-status-strip");
    expect(markup).toContain('data-status="tower"');
    expect(markup).toContain('data-status="devices"');
    expect(markup).toContain('data-status="step"');
    expect(markup).not.toMatch(/<button/i);
  });

  it.fails("draws pick-story as a door, not a level heading", () => {
    const markup = html({
      ...splashView,
      screen: "pick-story",
      levels: [
        join,
        {
          id: "door-test",
          label: "Proving Grounds",
          shows: "In focus\nAREA-077 day slice\n1–4 hunters\nPlayable",
        },
        { id: "pick-story", label: "pick-story", shows: "Proving Grounds" },
      ],
    });
    expect(markup).toContain('data-board-mode="startup"');
    expect(markup).toContain('data-story-focus="test"');
    expect(markup).toContain("Proving Grounds");
    expect(markup).toContain("AREA-077 day slice");
    expect(markup).toContain("1–4 hunters");
    expect(markup).not.toContain(">pick-story</h2>");
    expect(markup).not.toContain("Hero A — waiting");
    expect(markup.match(/data-illusionist-asset="dialog-frame"/g)).toHaveLength(1);
  });

  it.fails("draws claim-heroes as a party roster with the join code", () => {
    const markup = html({
      ...splashView,
      screen: "claim-heroes",
      levels: [join, { id: "claim-heroes", label: "claim-heroes", shows: "0 of 4 claimed" }],
      heroes: heroes.map((hero, index) => ({ ...hero, held: index === 0 })),
    });
    expect(markup).toContain('data-board-mode="startup"');
    expect(markup).toContain('data-join-code="124285"');
    expect(markup).toContain("1 of 4 claimed");
    expect(markup).toContain("Unclaimed");
    expect(markup).toContain("Claimed");
    expect(markup).toContain('data-portrait-card="Hero B"');
    expect(markup).not.toContain("Hero A — waiting");
    expect(markup).not.toContain("data-hero-place");
  });

  it.fails("draws setup and begin as table instructions, not a map", () => {
    const setup = html({
      ...splashView,
      screen: "setup",
      levels: [
        join,
        {
          id: "setup",
          label: "Step 2 of 3",
          shows: "Lay out the board and orient the kingdoms.",
        },
      ],
    });
    expect(setup).toContain('data-board-mode="startup"');
    expect(setup).toContain("Step 2 of 3");
    expect(setup).toContain("Lay out the board and orient the kingdoms.");
    expect(setup).toMatch(/table/i);
    expect(setup).not.toContain("data-hero-place");
    expect(setup).not.toContain("Hero A — waiting");
    expect(setup).not.toContain(">setup</h2>");

    const thin = html({
      ...splashView,
      screen: "setup",
      levels: [join, { id: "setup", label: "setup", shows: "Screen setup" }],
    });
    expect(thin).toContain('data-board-mode="startup"');
    expect(thin).not.toContain("Screen setup");
    expect(thin).not.toContain(">setup</h2>");

    const begin = html({
      ...splashView,
      screen: "begin",
      levels: [join, { id: "begin", label: "begin", shows: "Screen begin" }],
    });
    expect(begin).toContain('data-board-mode="startup"');
    expect(begin).toMatch(/table is set/i);
    expect(begin).not.toContain("Screen begin");
    expect(begin).not.toContain("Hero A — waiting");
    expect(begin).not.toContain("data-hero-place");
  });

  it.fails("keeps the play band, waiting pulse, still, and roster", () => {
    const markup = html({
      screen: "play",
      levels: [join, { id: "play", label: "play", shows: "Day 1" }],
      heroes,
      narration: null,
      actions: [],
      table: {
        chapter: "Proving Grounds",
        day: 1,
        health: "unavailable",
        purse: "unavailable",
        actingGroup: "Hero A",
        actingHeroId: "hero-a",
        movesLeft: 4,
        moveRoll: 4,
        modifier: "none",
        waitingFor: "Hero A is choosing",
        groups: [
          {
            heroId: "hero-a",
            heroName: "Hero A",
            kingdom: "N",
            kingdomLabel: "Arisilon (N)",
            spaceId: "n-citadel",
            spaceName: "Radiant Mountains",
            building: "citadel",
            inside: false,
            alone: true,
          },
        ],
      },
      place: null,
    });
    expect(markup).toContain("data-band");
    expect(markup).toContain("data-waiting");
    expect(markup).toContain("Hero A is choosing");
    expect(markup).toContain("data-roster");
    expect(markup).toContain('data-hero-place="hero-a"');
    expect(markup).toContain("Arisilon (N)");
    expect(markup).not.toContain('data-board-mode="startup"');
    expect(markup).not.toContain("Hero A — waiting");
    expect(markup).not.toContain(">play</h2>");
  });
});
