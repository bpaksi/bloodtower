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
  it("draws splash as a title lobby, not the protocol dump", () => {
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

  it("keeps the status strip on the debug face only", () => {
    const markup = html(splashView, true);
    expect(markup).toContain("data-status-strip");
    expect(markup).toContain('data-status="tower"');
    expect(markup).toContain('data-status="devices"');
    expect(markup).toContain('data-status="step"');
    expect(markup).not.toMatch(/<button/i);
  });

  it("draws pick-story as a door, not a level heading", () => {
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
    expect(markup).not.toContain("bt-door-motif");
    expect(markup).not.toContain("bt-carousel-cover");
    expect(markup).not.toContain(">pick-story</h2>");
    expect(markup).not.toContain("Hero A — waiting");
    expect(markup.match(/data-illusionist-asset="dialog-frame"/g)).toHaveLength(1);
  });

  it("paints a cover in place of the letter when the door names one", () => {
    const markup = html({
      ...splashView,
      screen: "pick-story",
      levels: [
        {
          id: "door-dracula",
          label: "The Count of Vellmoor",
          shows:
            "A door\nThe Count has taken Lenka. Bring her home before she's his.\n\nNot playable yet\n/packs/dracula/assets/cover.png",
        },
        {
          id: "door-test",
          label: "Proving Grounds",
          shows: "In focus\nAREA-077 day slice — Enter and Leave only.\n1–4 players\nPlayable",
        },
        { id: "pick-story", label: "Pick Story", shows: "Proving Grounds" },
      ],
    });
    expect(markup).toContain('data-story-focus="test"');
    expect(markup).toContain('data-playable="true"');
    expect(markup).toContain('data-story-peek="dracula"');
    expect(markup).toContain('data-carousel-side="next"');
    expect(markup).toContain('data-playable="false"');
    expect(markup).toContain('class="bt-carousel-cover"');
    expect(markup).toContain('src="/packs/dracula/assets/cover.png"');
    expect(markup.match(/bt-carousel-cover/g)).toHaveLength(1);
    expect(markup).not.toContain("bt-door-motif");
    expect(markup).not.toContain(">0<");
  });

  it("draws the not-ready stop with the focused title", () => {
    const markup = html({
      ...splashView,
      screen: "not-playable",
      levels: [
        {
          id: "table-status",
          label: "Status",
          shows: "tower: no tower\ndevices: 1\nstep: Not playable yet",
        },
        { id: "not-playable", label: "Not playable yet", shows: "The Count of Vellmoor" },
      ],
    });
    expect(markup).toContain('data-screen="not-playable"');
    expect(markup).toContain('data-startup-panel="not-playable"');
    expect(markup).toContain("Not playable yet");
    expect(markup).toContain("The Count of Vellmoor");
    expect(markup).not.toMatch(/<button/i);
  });

  it("draws claim-heroes as a party roster with the join code", () => {
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

  it("draws setup and begin as table instructions, not a map", () => {
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

  it("keeps the play band and waiting pulse, and drops the roster", () => {
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
        movesLeft: null,
        moveRoll: null,
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
          {
            heroId: "hero-b",
            heroName: "Hero B",
            kingdom: "E",
            kingdomLabel: "Brynthia (E)",
            spaceId: "e-citadel",
            spaceName: "Inner Kinghills",
            building: "citadel",
            inside: false,
            alone: true,
          },
        ],
      },
      place: null,
    });
    expect(markup).toContain('data-board-mode="play"');
    expect(markup).toContain('data-board-layer="move"');
    expect(markup).toContain("bt-board-backdrop");
    expect(markup).toContain("data-band");
    expect(markup).toContain("data-waiting");
    expect(markup).toContain("Hero A is choosing");
    expect(markup.match(/data-health=/g)).toHaveLength(2);
    expect(markup).toContain("unavailable");
    expect(markup).toContain(">Day 1<");
    expect(markup).not.toContain("data-roster");
    expect(markup).not.toContain("data-hero-place");
    expect(markup).not.toContain("data-kingdom");
    expect(markup).not.toContain("data-space-name");
    expect(markup).not.toContain("Arisilon (N)");
    expect(markup).not.toContain("modifier");
    expect(markup).not.toContain(">0<");
    expect(markup).not.toContain("data-waiting-dialog");
    expect(markup).not.toContain("data-visual-layer");
    expect(markup).not.toContain("data-place");
    expect(markup).not.toContain('data-board-mode="startup"');
    expect(markup).not.toContain("Hero A — waiting");
    expect(markup).not.toContain(">play</h2>");
    expect(markup).not.toMatch(/<(?:button|input|textarea|select|a)\b/i);
  });

  it("keeps the edge band and drops the waiting line when nobody is choosing", () => {
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
        waitingFor: null,
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
    expect(markup).toContain("data-chapter");
    expect(markup).not.toContain("data-waiting");
    expect(markup).not.toContain("data-waiting-dialog");
    expect(markup).not.toContain("<img");
    expect(markup).not.toContain("data-still");
    expect(markup).not.toContain("data-place");
    expect(markup).not.toContain("data-roster");
  });

  it("shows the place still on its own layer and hides the band", () => {
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
        movesLeft: 3,
        moveRoll: 4,
        modifier: "none",
        waitingFor: "Hero A is choosing",
        groups: [],
      },
      place: {
        building: "village",
        stillId: "place.village",
        caption: "Quiet roofs. A well, a few doors. Nothing stirs.",
      },
    });
    expect(markup).toContain('data-board-layer="place"');
    expect(markup).toContain('data-still="place.village"');
    expect(markup).toContain("Quiet roofs. A well, a few doors. Nothing stirs.");
    expect(markup).not.toContain("data-band");
    expect(markup).not.toContain("data-waiting");
    expect(markup).not.toContain("data-roster");
    expect(markup).not.toContain("data-waiting-dialog");
    expect(markup).not.toContain("data-visual-layer");
  });
});
