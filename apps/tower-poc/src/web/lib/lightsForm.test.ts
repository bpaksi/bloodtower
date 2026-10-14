import { lightsParamsSchema, validateCommand } from "tower-poc-protocols";
import { describe, expect, it } from "vitest";
import { buildLightsParams, describeLights, LIGHT_EFFECTS, LIGHT_SLOTS } from "./lightsForm.ts";

describe("LIGHT_SLOTS", () => {
  it("names each light the schema allows once: 12 doorway, 4 ledge, 8 base", () => {
    const count = (group: string) => LIGHT_SLOTS.filter((slot) => slot.group === group).length;
    expect([count("doorway"), count("ledge"), count("base")]).toEqual([12, 4, 8]);
    expect(new Set(LIGHT_SLOTS.map((slot) => slot.key)).size).toBe(LIGHT_SLOTS.length);
  });

  it("offers the schema's six effects", () => {
    expect(LIGHT_EFFECTS).toEqual([
      "off",
      "on",
      "breathe",
      "breatheFast",
      "breathe50percent",
      "flicker",
    ]);
  });
});

describe("buildLightsParams", () => {
  it("sends every light at once, and the service's validation accepts it", () => {
    const everyLight = Object.fromEntries(
      LIGHT_SLOTS.map((slot) => [slot.key, "breathe" as const]),
    );
    const params = buildLightsParams(everyLight);
    expect(lightsParamsSchema.safeParse(params).success).toBe(true);
    expect(validateCommand("lighting.set", params).ok).toBe(true);
    expect(params.doorway).toHaveLength(12);
    expect(params.ledge).toHaveLength(4);
    expect(params.base).toHaveLength(8);
  });

  it("sends only the lights chosen, in the shapes the library takes", () => {
    expect(
      buildLightsParams({
        "doorway/middle/east": "on",
        "ledge/southwest": "flicker",
        "base/bottom/west": "off",
        "doorway/top/north": undefined,
      }),
    ).toEqual({
      doorway: [{ position: "east", level: "middle", style: "on" }],
      ledge: [{ position: "southwest", style: "flicker" }],
      base: [{ position: { side: "west", level: "bottom" }, style: "off" }],
    });
  });

  it("leaves a group out when none of its lights is chosen", () => {
    expect(buildLightsParams({ "ledge/northeast": "on" })).toEqual({
      ledge: [{ position: "northeast", style: "on" }],
    });
  });

  it("gives nothing for nothing chosen, which validation refuses by name", () => {
    const params = buildLightsParams({});
    expect(params).toEqual({});
    const validation = validateCommand("lighting.set", params);
    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.issues.map((issue) => issue.message)).toContain("Name at least one light.");
    }
  });
});

describe("describeLights", () => {
  it("names each light sent with its effect, in the form's order", () => {
    const params = buildLightsParams({
      "base/top/south": "breatheFast",
      "doorway/bottom/west": "on",
      "ledge/northeast": "off",
    });
    expect(describeLights(params)).toBe(
      "Doorway bottom west on, Ledge northeast off, Base top south breatheFast",
    );
  });

  it("reads the parsed params the service was sent, not only what the form built", () => {
    const validation = validateCommand("lighting.set", {
      base: [{ style: "on", position: { level: "bottom", side: "north" } }],
    });
    if (!validation.ok) throw new Error("expected valid params");
    expect(describeLights(validation.command.params)).toBe("Base bottom north on");
  });

  it("is empty for anything that is not a lights object", () => {
    expect(describeLights(undefined)).toBe("");
    expect(describeLights({ other: [{ position: "north" }] })).toBe("");
  });
});
