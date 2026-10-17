import { describe, expect, it } from "vitest";
import {
  claimedCount,
  FORTUNE_LINE,
  joinedDeviceIds,
  partyJoinNextReason,
  SCREEN_NEXT,
  SCREEN_TITLE,
  TABLE_STORY,
  towerReady,
  towerStripState,
} from "./screens";

describe("opening screen copy", () => {
  it("names every flow step and what happens next", () => {
    expect(SCREEN_TITLE["tower-connect"]).toBe("Tower Connect");
    expect(SCREEN_NEXT.splash).toBe("Next: connect the tower");
    expect(SCREEN_NEXT["party-join"]).toBe("Next: set up the story");
    expect(TABLE_STORY.title).toBe("Proving ground");
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
      { id: "alpha", name: "Alpha", holders: ["device-1"], disconnected: false },
      { id: "beta", name: "Beta", holders: ["device-1"], disconnected: false },
      { id: "gamma", name: "Gamma", holders: [], disconnected: false },
    ];
    expect(claimedCount(hunters)).toBe(2);
    expect(joinedDeviceIds(hunters)).toEqual(["device-1"]);
    expect(
      partyJoinNextReason(
        ["gamma"],
        new Map([
          ["alpha", "Alpha"],
          ["gamma", "Gamma"],
        ]),
      ),
    ).toBe("Claim Gamma first");
    expect(partyJoinNextReason([], new Map())).toBeNull();
  });
});
