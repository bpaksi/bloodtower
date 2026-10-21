import { describe, expect, it } from "vitest";
import {
  commitNumber,
  defaultValues,
  fromJson,
  isMidEdit,
  setValue,
  type TuningField,
  toJson,
} from "./tuning.ts";

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

describe("typing into a number field", () => {
  const min10: TuningField = { key: "n", label: "N", type: "number", default: 12, min: 10 };

  it("treats a cleared field or a lone sign as mid-edit, not an error", () => {
    for (const raw of ["", " ", "-", "+", ".", "-."]) expect(isMidEdit(raw)).toBe(true);
    for (const raw of ["5", "-5", "1.5", "abc"]) expect(isMidEdit(raw)).toBe(false);
  });

  it("rejects a cleared field or a lone '-' only when committed", () => {
    expect(commitNumber(min10, "")).toEqual({ ok: false, reason: '"N" needs a number.' });
    expect(commitNumber(min10, "-").ok).toBe(false);
    expect(commitNumber(min10, "abc").ok).toBe(false);
  });

  it("commits '-5' as a number and clamps it to the minimum", () => {
    expect(commitNumber({ ...min10, min: undefined } as TuningField, "-5")).toEqual({
      ok: true,
      value: -5,
    });
    expect(commitNumber({ ...min10, min: -3 }, "-5")).toEqual({ ok: true, value: -3 });
  });

  it("lets '2' on the way to '25' pass; only the committed text is clamped", () => {
    expect(commitNumber(min10, "25")).toEqual({ ok: true, value: 25 });
    expect(commitNumber(min10, "2")).toEqual({ ok: true, value: 10 });
  });
});
