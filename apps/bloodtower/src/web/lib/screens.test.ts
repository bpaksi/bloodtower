import { describe, expect, it } from "vitest";
import {
  claimedCount,
  currentStory,
  FORTUNE_LINE,
  focusedStory,
  joinedDeviceIds,
  neighborStory,
  partyJoinNextReason,
  playersText,
  SCREEN_NEXT,
  SCREEN_TITLE,
  towerReady,
  towerStripState,
} from "./screens";

describe("story doors", () => {
  const card = (id: string, loadable = true) => ({
    id,
    title: id,
    blurb: null,
    players: { min: 1, max: 4 },
    loadable,
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

  it("offers no arrows for a single story", () => {
    expect(
      neighborStory({ cards: [card("alpha")], focus: "alpha", current: "alpha" }, 1),
    ).toBeNull();
    expect(neighborStory(undefined, 1)).toBeNull();
  });

  it("words the player range", () => {
    expect(playersText({ min: 1, max: 4 })).toBe("1–4 hunters");
    expect(playersText({ min: 2, max: 2 })).toBe("2 hunters");
    expect(playersText({ min: 1, max: 1 })).toBe("1 hunter");
    expect(playersText(null)).toBeNull();
  });
});

describe("opening screen copy", () => {
  it("names every flow step and what happens next", () => {
    expect(SCREEN_TITLE["tower-connect"]).toBe("Tower Connect");
    expect(SCREEN_NEXT.splash).toBe("Next: connect the tower");
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
