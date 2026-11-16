import type { BoardView } from "bloodtower-protocols";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CORRUPTION_LOSS_LIMIT } from "../../../engine/loops/day/rules.ts";
import { CoreStoryBoard } from "./CoreStoryBoard.tsx";

// CU/10 EV-03 second case: the web reads the limit through the engine module, so a mock of it
// moves the threshold. The mutable holder lets one case run with a limit of 4.
const limit = vi.hoisted(() => ({ value: 3 }));
vi.mock("../../../engine/loops/day/rules.ts", () => ({
  get CORRUPTION_LOSS_LIMIT() {
    return limit.value;
  },
}));

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
      levels: [join, { id: "claim-heroes", label: "claim-heroes", shows: "1 of 4 picked" }],
      heroes: heroes.map((hero, index) => ({ ...hero, held: index === 0 })),
    });
    expect(markup).toContain('data-board-mode="startup"');
    expect(markup).toContain('data-join-code="124285"');
    expect(markup).toContain("1 of 4 picked");
    expect(markup).toContain("Open");
    expect(markup).toContain("Picked");
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
    expect(markup).toContain("/packs/test/assets/place-village.jpg");
    expect(markup).toContain("Quiet roofs. A well, a few doors. Nothing stirs.");
    expect(markup).not.toContain("data-band");
    expect(markup).not.toContain("data-waiting");
    expect(markup).not.toContain("data-roster");
    expect(markup).not.toContain("data-waiting-dialog");
    expect(markup).not.toContain("data-visual-layer");
  });
});

describe("session Enter board screens (C2/05)", () => {
  const enterView = (screen: string, label: string, shows: string) =>
    ({
      screen,
      levels: [join, { id: screen, label, shows }],
      heroes,
      narration: null,
      actions: [],
    }) as BoardView;

  it("draws the join as a large QR with no button", () => {
    const markup = html(enterView("table-join", "Join", "Scan with each iPad."));
    expect(markup).toContain('data-startup-panel="table-join"');
    expect(markup).toContain("bt-qr-lg");
    expect(markup).not.toContain("data-join-corner");
    expect(markup).not.toMatch(/<button/i);
  });

  it("draws the three base board steps and a corner QR, no button", () => {
    const markup = html(
      enterView(
        "base-board",
        "Base board",
        [
          "Set the tower on the board.",
          "Lay out the board, kingdom edges matched.",
          "Sort the pieces: heroes, foes, skulls.",
        ].join("\n"),
      ),
    );
    expect(markup.match(/<li/g)).toHaveLength(3);
    expect(markup).toContain("Set the tower on the board.");
    expect(markup).toContain("data-join-corner");
    expect(markup).not.toContain("bt-qr-lg");
    expect(markup).not.toMatch(/<button/i);
  });

  it("draws the tower question, and Tower not found after a failure", () => {
    const asked = html(
      enterView("tower-choice", "Tower", "Wake the tower, or play tonight without it?"),
    );
    expect(asked).toContain("Wake the tower, or play tonight without it?");
    expect(asked).not.toContain("data-tower-status");
    const failed = html(
      enterView(
        "tower-choice",
        "Tower not found",
        "The tower did not answer. Try again, or play without it.",
      ),
    );
    expect(failed).toContain("Tower not found");
    expect(failed).toContain("The tower did not answer. Try again, or play without it.");
    expect(failed).not.toMatch(/<button/i);
  });

  it("draws a progress line while the tower wakes", () => {
    const markup = html(enterView("tower-wake", "Tower", "Waking the tower..."));
    expect(markup).toContain("data-tower-progress");
    expect(markup).toContain("Waking the tower...");
    expect(markup).not.toMatch(/<button/i);
  });
});

describe("Pick story volume line (CU/11 EV-03)", () => {
  const volume = (id: string): BoardView => ({
    ...splashView,
    screen: "pick-story",
    actions: [],
    levels: [
      join,
      { id, label: "Volume", shows: "How loud should the tower be? Press one to hear it." },
      { id: "pick-story", label: "Pick Story", shows: "Proving Grounds" },
    ],
  });

  it("shows the one volume line at full strength, with no buttons", () => {
    const markup = html(volume("volume-line"));
    expect(markup.match(/How loud should the tower be\? Press one to hear it\./g)).toHaveLength(1);
    expect(markup).not.toMatch(/<button/i);
  });

  it("shows the line at full strength from the first view", () => {
    const markup = html(volume("volume-line"));
    expect(markup).toContain("How loud should the tower be? Press one to hear it.");
    expect(markup).not.toContain("bt-row--disabled");
    expect(markup).not.toContain("aria-disabled");
  });
});

// CU/10 (PT-17): the corruption mark on the band.
describe("corruption mark on the band", () => {
  const groupOf = (id: string, name: string) => ({
    heroId: id,
    heroName: name,
    kingdom: "N" as const,
    kingdomLabel: "Arisilon (N)",
    spaceId: "n-citadel",
    spaceName: "Radiant Mountains",
    building: "citadel",
    inside: false,
    alone: true,
  });
  const band = (counts?: { a?: number; b?: number }, lead: "a" | "b" = "a") =>
    html({
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
        moveRoll: 3,
        modifier: "none",
        waitingFor: null,
        groups: [groupOf("hero-a", "Hero A"), groupOf("hero-c", "Hero C")],
        ...(counts
          ? {
              corruptions: [
                {
                  heroId: "hero-a",
                  heroName: "Hero A",
                  panelHeroId: "hero-a",
                  count: counts.a ?? 0,
                },
                {
                  heroId: "hero-b",
                  heroName: "Hero B",
                  panelHeroId: lead === "a" ? "hero-a" : "hero-b",
                  count: counts.b ?? 0,
                },
              ],
            }
          : {}),
      },
      place: null,
    } as BoardView);
  const marks = (markup: string) => markup.match(/data-corruption-mark="[^"]+"/g) ?? [];

  it("EV-02: no mark at 0 or 1, one at 2", () => {
    expect(marks(band({ a: 0 }))).toEqual([]);
    expect(marks(band({ a: 1 }))).toEqual([]);
    expect(marks(band({ a: 2 }))).toEqual(['data-corruption-mark="hero-a"']);
  });

  it("EV-01: the mark is an icon with the Copy label, no words, no button", () => {
    const markup = band({ a: 2 });
    const mark = /<span class="bt-corruption-mark"[^>]*>.*?<\/span>/.exec(markup)?.[0] ?? "";
    expect(mark).toContain('role="img"');
    expect(mark).toContain('aria-label="Hero A has two corruptions. A third ends the game."');
    expect(mark).toContain("<svg");
    expect(mark.replace(/<[^>]*>/g, "")).toBe("");
    expect(mark).not.toMatch(/<button|data-action/);
  });

  it("EV-10: a non-lead hero's mark sits in the lead's span, one per hero", () => {
    const markup = band({ a: 0, b: 2 });
    expect(marks(markup)).toEqual(['data-corruption-mark="hero-b"']);
    const span = /<span data-hero-panel="hero-a">.*?<\/span><span data-hero-panel="hero-c">/.exec(
      markup,
    )?.[0];
    expect(span).toContain('data-corruption-mark="hero-b"');
    expect(span).toContain("Hero B has two corruptions");
    expect(marks(band({ a: 2, b: 2 }))).toEqual([
      'data-corruption-mark="hero-a"',
      'data-corruption-mark="hero-b"',
    ]);
  });

  it("EV-03: the threshold is the engine's loss limit minus one", () => {
    limit.value = 3;
    expect(CORRUPTION_LOSS_LIMIT).toBe(3);
    expect(marks(band({ a: 2 }))).toHaveLength(1);
    limit.value = 4;
    expect(marks(band({ a: 2 }))).toEqual([]);
    expect(marks(band({ a: 3 }))).toHaveLength(1);
    limit.value = 3;
  });

  it("EV-08: unknown counts draw no mark and no zero", () => {
    const markup = band();
    expect(marks(markup)).toEqual([]);
    expect(markup).toContain('data-health="unavailable"');
    expect(markup).not.toMatch(/0 corruptions/);
  });
});
