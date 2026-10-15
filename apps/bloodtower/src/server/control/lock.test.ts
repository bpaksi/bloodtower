import { describe, expect, it } from "vitest";
import { lockPresses } from "./lock.ts";

describe("first press wins", () => {
  it("gives one prompt exactly one winner, in arrival order", () => {
    const first = lockPresses({}, [
      { promptId: "continue-0", action: "continue", deviceId: "device-1" },
      { promptId: "continue-0", action: "continue", deviceId: "device-2" },
    ]);
    expect(first.winners).toEqual([true, false]);
    expect(first.locks["continue-0"]?.winnerDeviceId).toBe("device-1");

    const reversed = lockPresses({}, [
      { promptId: "continue-0", action: "continue", deviceId: "device-2" },
      { promptId: "continue-0", action: "continue", deviceId: "device-1" },
    ]);
    expect(reversed.winners).toEqual([true, false]);
    expect(reversed.locks["continue-0"]?.winnerDeviceId).toBe("device-2");
  });

  it("lets two prompts each have a winner", () => {
    const result = lockPresses({}, [
      { promptId: "tower-connect", action: "tower-connect", deviceId: "device-1" },
      { promptId: "tower-calibrate", action: "tower-calibrate", deviceId: "device-2" },
    ]);
    expect(result.winners).toEqual([true, true]);
  });
});
