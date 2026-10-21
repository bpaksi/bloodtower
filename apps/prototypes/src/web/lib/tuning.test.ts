import { describe, expect, it } from "vitest";
import { defaultValues, fromJson, setValue, type TuningField, toJson } from "./tuning.ts";

const fields: TuningField[] = [
  { key: "floor", label: "Floor", type: "number", default: 1, min: 0, max: 5 },
  { key: "dice", label: "Dice", type: "text", default: "2d6" },
  { key: "sneaky", label: "Sneaky", type: "boolean", default: false },
];

describe("tuning", () => {
  it("starts from the defaults", () => {
    expect(defaultValues(fields)).toEqual({ floor: 1, dice: "2d6", sneaky: false });
  });

  it("copies out as JSON in field order and reads it back", () => {
    const values = setValue(fields, defaultValues(fields), "floor", "3");
    const json = toJson(fields, values);
    expect(Object.keys(JSON.parse(json))).toEqual(["floor", "dice", "sneaky"]);
    expect(fromJson(fields, json)).toEqual({ floor: 3, dice: "2d6", sneaky: false });
  });

  it("clamps a number to its range and rejects non-numbers", () => {
    const v = defaultValues(fields);
    expect(setValue(fields, v, "floor", 99).floor).toBe(5);
    expect(() => setValue(fields, v, "floor", "abc")).toThrow(/needs a number/);
    expect(() => setValue(fields, v, "floor", "")).toThrow();
    expect(() => setValue(fields, v, "nope", 1)).toThrow();
  });

  it("rejects JSON with unknown keys or wrong types", () => {
    expect(() => fromJson(fields, '{"zzz":1}')).toThrow(/unknown key/);
    expect(() => fromJson(fields, '{"floor":"x"}')).toThrow(/number/);
    expect(() => fromJson(fields, "[]")).toThrow();
    expect(() => fromJson(fields, "not json")).toThrow();
  });
});
