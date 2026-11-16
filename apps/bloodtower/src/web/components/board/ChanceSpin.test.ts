import { describe, expect, it } from "vitest";
import { COIN_NOTES } from "../../lib/audio/coinCue.ts";
import { chanceAmountText } from "./ChanceSpin.tsx";

describe("the game of chance on the board", () => {
  it("shows the amount as a number, nothing before the spin", () => {
    expect(chanceAmountText(30)).toBe("30");
    expect(chanceAmountText(null)).toBeNull();
  });

  it("EV-13: an amount that is missing reads unavailable, never 0 or empty", () => {
    expect(chanceAmountText("unavailable")).toBe("unavailable");
    expect(chanceAmountText("unavailable")).not.toBe("0");
  });

  it("the coin cue is two short notes, the second ringing longer", () => {
    expect(COIN_NOTES).toHaveLength(2);
    expect(COIN_NOTES[1]?.seconds).toBeGreaterThan(COIN_NOTES[0]?.seconds ?? 0);
  });
});
