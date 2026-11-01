import { describe, expect, it } from "vitest";
import { applyGear } from "./gear.ts";
import { initialShellState } from "./state.ts";

describe("gear panels", () => {
  it("first open wins and a second open changes nothing", () => {
    let state = initialShellState({ sessionId: "s", seed: "seed" });
    state = applyGear(state, { deviceId: "device-a", action: "open", item: "volume" });
    expect(state.gearOpens).toBe(1);
    expect(state.gearPaused).toBe(true);
    expect(state.gearOwner).toBe("device-a");
    const again = applyGear(state, { deviceId: "device-b", action: "open", item: "volume" });
    expect(again.gearOpens).toBe(1);
    expect(again.gearOwner).toBe("device-a");
    expect(again.gearPanel).toBe("volume");
  });

  it("keep stores the volume and done clears the panel", () => {
    let state = initialShellState({ sessionId: "s", seed: "seed" });
    state = applyGear(state, { deviceId: "device-a", action: "open", item: "volume" });
    state = applyGear(state, {
      deviceId: "device-a",
      action: "pick",
      pick: "Volume 0",
      volume: 0,
    });
    state = applyGear(state, { deviceId: "device-a", action: "keep-volume", volume: 0 });
    expect(state.towerVolume).toBe(0);
    state = applyGear(state, { deviceId: "device-a", action: "done" });
    expect(state.gearPanel).toBeNull();
    expect(state.gearPaused).toBe(false);
    expect(state.towerVolume).toBe(0);
    state = applyGear(state, { deviceId: "device-a", action: "open", item: "volume" });
    expect(state.towerVolume).toBe(0);
  });

  it("a swap survives the enriched done event after the panel is cleared", () => {
    let state = initialShellState({ sessionId: "s", seed: "seed" });
    state = {
      ...state,
      holdings: { "hero-a": "device-1", "hero-b": "device-2" },
    };
    state = applyGear(state, {
      deviceId: "device-1",
      action: "open",
      item: "change-who-holds-whom",
    });
    state = applyGear(state, {
      deviceId: "device-1",
      action: "pick",
      pick: "Hero A",
      heroId: "hero-a",
    });
    state = applyGear(state, {
      deviceId: "device-1",
      action: "pick",
      pick: "Hero B",
      heroId: "hero-b",
    });
    const first = state.gearFirstHero;
    const second = state.gearSecondHero;
    state = applyGear(state, { deviceId: "device-1", action: "done" });
    expect(state.holdings["hero-a"]).toBe("device-2");
    expect(state.holdings["hero-b"]).toBe("device-1");
    expect(state.gearPanel).toBeNull();
    const restored = applyGear(
      {
        ...state,
        holdings: { "hero-a": "device-1", "hero-b": "device-2" },
        gearPanel: null,
        gearFirstHero: null,
        gearSecondHero: null,
      },
      { deviceId: "device-1", action: "done", heroId: first ?? "", otherHeroId: second ?? "" },
    );
    expect(restored.holdings["hero-a"]).toBe("device-2");
    expect(restored.gearPaused).toBe(false);
  });
});
