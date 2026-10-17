import { describe, expect, it } from "vitest";
import {
  claimedCount,
  FORTUNE_LINE,
  joinedDeviceIds,
  partyJoinNextReason,
  SCREEN_NEXT,
  SCREEN_TITLE,
  TABLE_STORY,
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
    expect(towerStripState("connected")).toBe("connected");
    expect(towerStripState("connecting")).toBe("connecting");
    expect(towerStripState("disconnected")).toBe("lost");
    expect(towerStripState("unavailable")).toBe("no tower");
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
