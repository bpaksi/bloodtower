import { describe, expect, it } from "vitest";
import { inventory } from "./inventory.ts";
import {
  ALL_SEALS,
  brokenSealsSchema,
  RECORD_KEYS,
  sealOrder,
  skullTallySchema,
  TOWER_VALUE_SCHEMAS,
} from "./towerValues.ts";

describe("tower value schemas", () => {
  it("name only inventory ids", () => {
    const ids = inventory.map((entry) => entry.id as string);
    for (const key of Object.keys(TOWER_VALUE_SCHEMAS)) expect(ids, key).toContain(key);
    for (const key of RECORD_KEYS) expect(Object.keys(TOWER_VALUE_SCHEMAS)).toContain(key);
  });

  it("list all 12 seals in level then side order", () => {
    expect(ALL_SEALS).toHaveLength(12);
    expect(ALL_SEALS[0]).toEqual({ side: "north", level: "top" });
    expect(ALL_SEALS.at(-1)).toEqual({ side: "west", level: "bottom" });
    expect(ALL_SEALS.map(sealOrder)).toEqual([...Array(12).keys()]);
  });

  it("accept broken seals once each in order, and nothing else", () => {
    const top = { side: "north", level: "top" };
    const middle = { side: "east", level: "middle" };
    expect(brokenSealsSchema.safeParse([]).success).toBe(true);
    expect(brokenSealsSchema.safeParse([top, middle]).success).toBe(true);
    expect(brokenSealsSchema.safeParse([middle, top]).success).toBe(false);
    expect(brokenSealsSchema.safeParse([top, top]).success).toBe(false);
    expect(brokenSealsSchema.safeParse([{ side: "up", level: "top" }]).success).toBe(false);
  });

  it("accept a skull count of 0 or more with its start time", () => {
    expect(skullTallySchema.safeParse({ count: 0, since: 1 }).success).toBe(true);
    expect(skullTallySchema.safeParse({ count: -1, since: 1 }).success).toBe(false);
    expect(skullTallySchema.safeParse({ count: 1.5, since: 1 }).success).toBe(false);
  });
});
