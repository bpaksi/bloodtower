import { FLOW_SCREENS } from "bloodtower-protocols";
import { describe, expect, it } from "vitest";
import {
  BOARD_MODE,
  carouselPeeks,
  claimedCount,
  currentStory,
  FORTUNE_LINE,
  focusedStory,
  gameSettingsNext,
  joinedDeviceIds,
  NOT_CHOSEN,
  neighborStory,
  partyJoinNextReason,
  playersText,
  SCREEN_NEXT,
  SCREEN_TITLE,
  setupStepTitle,
  summaryItems,
  TOWER_REQUIRED_REASON,
  towerReady,
  towerRequiredReason,
  towerStripState,
} from "./screens";

describe("story doors", () => {
  const card = (id: string, loadable = true) => ({
    id,
    title: id,
    blurb: null,
    tagline: null,
    cover: null,
    players: { min: 1, max: 4 },
    playable: true,
    loadable,
    tower: "optional" as const,
  });
  const stories = (focus: string) => ({
    cards: [card("alpha"), card("beta"), card("gamma", false)],
    focus,
    current: "alpha",
  });

  it("finds the highlighted and the bound story, and neither before the list arrives", () => {
    expect(focusedStory(stories("beta"))?.id).toBe("beta");
    expect(currentStory(stories("beta"))?.id).toBe("alpha");
    expect(focusedStory(undefined)).toBeNull();
    expect(currentStory(undefined)).toBeNull();
  });

  it("steps the highlight both ways and wraps at the ends", () => {
    expect(neighborStory(stories("alpha"), 1)?.id).toBe("beta");
    expect(neighborStory(stories("alpha"), -1)?.id).toBe("gamma");
    expect(neighborStory(stories("gamma"), 1)?.id).toBe("alpha");
  });

  it("wraps with two cards: both neighbours are the other story", () => {
    const two = { cards: [card("alpha"), card("beta")], focus: "alpha", current: "alpha" };
    expect(neighborStory(two, 1)?.id).toBe("beta");
    expect(neighborStory(two, -1)?.id).toBe("beta");
    expect(neighborStory({ ...two, focus: "beta" }, 1)?.id).toBe("alpha");
  });

  it("wraps with ten or more cards, from either end, with buttons only", () => {
    const ids = Array.from({ length: 12 }, (_, index) => `story-${index}`);
    const many = { cards: ids.map((id) => card(id)), focus: ids[0] ?? "", current: ids[0] ?? "" };
    expect(neighborStory(many, -1)?.id).toBe("story-11");
    expect(neighborStory({ ...many, focus: "story-11" }, 1)?.id).toBe("story-0");
    expect(neighborStory({ ...many, focus: "story-5" }, 1)?.id).toBe("story-6");
  });

  it("offers no arrows for a single story", () => {
    expect(
      neighborStory({ cards: [card("alpha")], focus: "alpha", current: "alpha" }, 1),
    ).toBeNull();
    expect(neighborStory(undefined, 1)).toBeNull();
  });

  it("peeks at each neighbour, and at the other story once (on the right) with two cards", () => {
    const three = carouselPeeks(stories("alpha"));
    expect(three.previous?.id).toBe("gamma");
    expect(three.next?.id).toBe("beta");
    const two = { cards: [card("alpha"), card("beta")], focus: "alpha", current: "alpha" };
    expect(carouselPeeks(two)).toEqual({ previous: null, next: two.cards[1] });
    expect(carouselPeeks({ ...two, focus: "beta" })).toEqual({
      previous: null,
      next: two.cards[0],
    });
  });

  it("peeks and wraps with ten or more cards from either end", () => {
    const ids = Array.from({ length: 12 }, (_, index) => `story-${index}`);
    const many = { cards: ids.map((id) => card(id)), focus: "story-0", current: "story-0" };
    expect(carouselPeeks(many).previous?.id).toBe("story-11");
    expect(carouselPeeks(many).next?.id).toBe("story-1");
    const last = carouselPeeks({ ...many, focus: "story-11" });
    expect([last.previous?.id, last.next?.id]).toEqual(["story-10", "story-0"]);
  });

  it("peeks at nothing with one story or none", () => {
    const one = { cards: [card("alpha")], focus: "alpha", current: "alpha" };
    expect(carouselPeeks(one)).toEqual({ previous: null, next: null });
    expect(carouselPeeks(undefined)).toEqual({ previous: null, next: null });
  });

  it("words the party size: every hunter is always in play, so the card reads the maximum", () => {
    expect(playersText({ min: 1, max: 4 })).toBe("4 hunters");
    expect(playersText({ min: 2, max: 2 })).toBe("2 hunters");
    expect(playersText({ min: 1, max: 1 })).toBe("1 hunter");
    expect(playersText(null)).toBeNull();
  });
});

describe("opening screen copy", () => {
  it("names every flow step and what happens next", () => {
    expect(SCREEN_TITLE["tower-connect"]).toBe("Tower Connect");
    expect(SCREEN_NEXT.splash).toBe("Next: pick a story");
    expect(SCREEN_NEXT["game-settings"]).toBe("Next: connect the tower");
    expect(SCREEN_NEXT["tower-connect"]).toBe("Next: tower volume test");
    expect(SCREEN_TITLE["tower-volume-test"]).toBe("Tower volume test");
    expect(SCREEN_NEXT["tower-volume-test"]).toBe("Next: gather the party");
    expect(SCREEN_NEXT["party-join"]).toBe("Next: set up the story");
    expect(FORTUNE_LINE).toContain("tower");
  });

  it("maps tower connection to the status-strip words", () => {
    const reading = (
      connection: "connected" | "connecting" | "disconnected" | "unavailable",
      calibrated: { state: "unavailable" } | { state: "known"; calibrated: boolean },
    ) =>
      towerStripState({
        connection,
        battery: { state: "unavailable" },
        calibrated,
      });
    expect(reading("connected", { state: "unavailable" })).toBe("connected");
    expect(reading("connected", { state: "known", calibrated: true })).toBe("connected");
    expect(reading("connected", { state: "known", calibrated: false })).toBe("calibrating");
    expect(reading("connecting", { state: "unavailable" })).toBe("connecting");
    expect(reading("disconnected", { state: "unavailable" })).toBe("lost");
    expect(reading("unavailable", { state: "unavailable" })).toBe("no tower");
    expect(
      towerReady({
        connection: "connected",
        battery: { state: "unavailable" },
        calibrated: { state: "known", calibrated: true },
      }),
    ).toBe(true);
    expect(
      towerReady({
        connection: "connected",
        battery: { state: "unavailable" },
        calibrated: { state: "known", calibrated: false },
      }),
    ).toBe(false);
  });

  it("counts claimed hunters and unique joined devices", () => {
    const hunters = [
      { id: "alpha", name: "Agnes", holders: ["device-1"], disconnected: false },
      { id: "beta", name: "Tomas", holders: ["device-1"], disconnected: false },
      { id: "gamma", name: "Wren", holders: [], disconnected: false },
    ];
    expect(claimedCount(hunters)).toBe(2);
    expect(joinedDeviceIds(hunters)).toEqual(["device-1"]);
    expect(
      partyJoinNextReason(
        ["gamma"],
        new Map([
          ["alpha", "Agnes"],
          ["gamma", "Wren"],
        ]),
      ),
    ).toBe("Claim Wren first");
    expect(partyJoinNextReason([], new Map())).toBeNull();
  });
});

describe("Connect Tower by the pack's tower field (R3-UI-23)", () => {
  const card = (tower: "required" | "optional" | "none" | null) => ({
    id: "alpha",
    title: "Alpha",
    blurb: null,
    tagline: null,
    cover: null,
    players: { min: 1, max: 4 },
    playable: true,
    loadable: true,
    tower,
  });
  const tower = (
    connection: "connected" | "connecting" | "disconnected" | "unavailable",
    calibrated: { state: "unavailable" } | { state: "known"; calibrated: boolean },
  ) => ({ connection, battery: { state: "unavailable" as const }, calibrated });
  const ready = tower("connected", { state: "known", calibrated: true });

  it("names Connect Tower after Game settings unless the story does not use the tower", () => {
    expect(gameSettingsNext(card("optional"))).toBe("Next: connect the tower");
    expect(gameSettingsNext(card("required"))).toBe("Next: connect the tower");
    expect(gameSettingsNext(card("none"))).toBe("Next: gather the party");
    expect(gameSettingsNext(null)).toBe("Next: connect the tower");
  });

  it("holds Continue with the reason only for a required tower that is not connected and calibrated", () => {
    expect(TOWER_REQUIRED_REASON).toBe("Connect and calibrate the tower first");
    const held = [
      tower("unavailable", { state: "unavailable" }),
      tower("connecting", { state: "unavailable" }),
      tower("disconnected", { state: "unavailable" }),
      // Connected but calibration unknown or not done is not ready.
      tower("connected", { state: "unavailable" }),
      tower("connected", { state: "known", calibrated: false }),
    ];
    for (const reading of held) {
      expect(towerRequiredReason(card("required"), reading)).toBe(TOWER_REQUIRED_REASON);
    }
    expect(towerRequiredReason(card("required"), ready)).toBeNull();
    for (const mode of ["optional", "none", null] as const) {
      expect(towerRequiredReason(card(mode), held[0] ?? ready)).toBeNull();
    }
    expect(towerRequiredReason(null, held[0] ?? ready)).toBeNull();
  });
});

describe("Claim Hunters and setup steps", () => {
  it("names the screens Claim Hunters and Setup, and counts steps from one", () => {
    expect(SCREEN_TITLE["party-join"]).toBe("Claim Hunters");
    expect(SCREEN_TITLE.setup).toBe("Setup");
    expect(SCREEN_NEXT.setup).toBe("Press Done on any device");
    expect(setupStepTitle({ index: 0, count: 3 })).toBe("Setup · step 1 of 3");
    expect(setupStepTitle({ index: 2, count: 3 })).toBe("Setup · step 3 of 3");
  });
});

describe("board mode", () => {
  it("is startup on every pre-play screen, play in play, and neither on Quit", () => {
    const startup = [
      "splash",
      "tower-connect",
      "tower-volume-test",
      "pick-story",
      "game-settings",
      "not-playable",
      "party-join",
      "setup",
      "begin",
    ];
    for (const screen of FLOW_SCREENS) {
      const expected = startup.includes(screen) ? "startup" : screen === "play" ? "play" : null;
      expect(BOARD_MODE[screen], screen).toBe(expected);
    }
    expect(BOARD_MODE.quit).toBeNull();
    expect(FLOW_SCREENS.filter((screen) => BOARD_MODE[screen] === "startup")).toHaveLength(9);
  });
});

describe("start-up summary (R3-UI-25)", () => {
  const NO_TOWER = {
    connection: "unavailable" as const,
    battery: { state: "unavailable" as const },
    calibrated: { state: "unavailable" as const },
  };
  const READY = {
    connection: "connected" as const,
    battery: { state: "unavailable" as const },
    calibrated: { state: "known" as const, calibrated: true },
  };
  const empty = { game: null, settings: null, tower: null, hunters: null, setup: [] };
  const lines = (
    summary: Parameters<typeof summaryItems>[0],
    tower: Parameters<typeof summaryItems>[1] = NO_TOWER,
  ) => Object.fromEntries(summaryItems(summary, tower).map((item) => [item.id, item.lines]));

  it("reads not chosen yet for every empty item, in panel order", () => {
    const items = summaryItems(empty, NO_TOWER);
    expect(items.map((item) => item.id)).toEqual(["game", "settings", "tower", "hunters", "setup"]);
    expect(items.every((item) => item.empty && item.lines[0] === NOT_CHOSEN)).toBe(true);
  });

  it("echoes each choice as it is made", () => {
    const summary = {
      game: { id: "test", title: "Proving ground", cover: null },
      settings: [
        { id: "length", label: "Length", value: "Long" },
        { id: "difficulty", label: "Difficulty", value: null },
      ],
      tower: "without" as const,
      hunters: [
        { id: "alpha", name: "Agnes", holders: ["device-1"] },
        { id: "beta", name: "Tomas", holders: [] },
      ],
      setup: [
        { id: "a", label: "Lay out the board.", done: true },
        { id: "b", label: "Ready the decks.", done: false },
      ],
    };
    expect(lines(summary)).toEqual({
      game: ["Proving ground"],
      settings: ["Length: Long", "Difficulty: unavailable"],
      tower: ["Playing without tower"],
      hunters: ["Agnes: device-1", `Tomas: ${NOT_CHOSEN}`],
      setup: ["1 of 2 done", "Lay out the board."],
    });
  });

  it("names the tower outcome with the live reading once connected", () => {
    expect(lines({ ...empty, tower: "connected" }, READY).tower).toEqual(["Connected"]);
    expect(lines({ ...empty, tower: "connected" }, NO_TOWER).tower).toEqual([
      "Connected, now no tower",
    ]);
    expect(lines({ ...empty, tower: "not-used" }).tower).toEqual(["Not used by this story"]);
  });

  it("keeps an item empty until something is in it", () => {
    const summary = {
      ...empty,
      settings: [],
      hunters: [{ id: "alpha", name: "Agnes", holders: [] }],
      setup: [{ id: "a", label: "Lay out the board.", done: false }],
    };
    expect(lines(summary)).toMatchObject({
      settings: ["No settings"],
      hunters: [NOT_CHOSEN],
      setup: [NOT_CHOSEN],
    });
  });
});
