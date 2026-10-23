import { deviceViewPayloadSchema } from "bloodtower-protocols";
import { describe, expect, it } from "vitest";
import { liveDeviceBanner } from "./DeviceErrorBanner.tsx";

const waiting = deviceViewPayloadSchema.parse({
  deviceId: "d1",
  screen: "pick-game",
  shows: "Waiting",
  heroes: [],
  actions: [],
});

describe("device errors", () => {
  it("builds a banner model from a host error", () => {
    expect(liveDeviceBanner({ code: "invalid-state", message: "Nope." })).toEqual({
      code: "invalid-state",
      message: "Nope.",
    });
    expect(waiting.screen).toBe("pick-game");
  });
});
