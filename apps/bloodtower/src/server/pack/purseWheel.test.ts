import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { BASE_PURSE_WHEEL, purseWheelFrom } from "../../engine/rules/purse/index.ts";

const basePack = join(import.meta.dirname, "../../../../../packs/base");

describe("CU/15 EV-09 the engine's wheel is the base pack's setup.purse_wheel", () => {
  it("matches packs/base/tuning.yaml, so the placeholder cannot drift from the data", () => {
    const tuning = parseYaml(readFileSync(join(basePack, "tuning.yaml"), "utf8"));
    expect(purseWheelFrom(tuning)).toEqual(BASE_PURSE_WHEEL);
    expect(tuning.setup.purse_wheel.sides).toEqual(BASE_PURSE_WHEEL.sides);
    expect(tuning.setup.purse_wheel.floor).toBe(BASE_PURSE_WHEEL.floor);
  });
});
