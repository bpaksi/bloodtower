import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  buildParams,
  type CapabilityId,
  describeParams,
  findCapability,
  inventory,
  isCommandable,
  type ParamField,
  type ParamValues,
  SOUND_COUNT,
  validateCommand,
} from "./index.ts";

/** Commandable capabilities whose schema the generated form cannot hold; each needs its own component. */
const DEDICATED: readonly CapabilityId[] = ["lighting.set"];

const commandable = inventory.filter(isCommandable);

const fieldsOf = (id: CapabilityId) => {
  const capability = findCapability(id);
  if (!capability) throw new Error(`no capability ${id}`);
  const form = describeParams(capability.params);
  if (!form.ok) throw new Error(form.reason);
  return form.fields;
};

/** Every field filled with its first allowed value. */
const filled = (fields: readonly ParamField[]): ParamValues =>
  Object.fromEntries(
    fields.map((field) => [
      field.key,
      field.kind === "enum" ? field.options[0] : field.kind === "integer" ? `${field.min}` : true,
    ]),
  );

describe("describeParams", () => {
  it("describes every commandable capability, except those named as needing their own component", () => {
    const undescribed = commandable
      .filter((capability) => !describeParams(capability.params).ok)
      .map((capability) => capability.id);
    expect(undescribed).toEqual(DEDICATED);
  });

  it.each(commandable.filter((capability) => !DEDICATED.includes(capability.id)).map((c) => c.id))(
    "a form for %s, filled in, passes the service's validation",
    (id) => {
      const fields = fieldsOf(id);
      const result = validateCommand(id, buildParams(fields, filled(fields)));
      expect(result).toMatchObject({ ok: true });
    },
  );

  it("reads enums, bounds, optional fields and nested objects from the schema", () => {
    expect(fieldsOf("sound.play-stateful")).toEqual([
      {
        kind: "integer",
        path: ["soundIndex"],
        key: "soundIndex",
        label: "Sound index",
        optional: false,
        min: 1,
        max: SOUND_COUNT,
      },
      {
        kind: "integer",
        path: ["volume"],
        key: "volume",
        label: "Volume",
        optional: true,
        min: 0,
        max: 3,
      },
    ]);
    expect(fieldsOf("seals.break")).toEqual([
      expect.objectContaining({
        kind: "enum",
        key: "seal.side",
        label: "Seal side",
        options: ["north", "east", "south", "west"],
      }),
      expect.objectContaining({
        kind: "enum",
        key: "seal.level",
        options: ["top", "middle", "bottom"],
      }),
    ]);
    expect(fieldsOf("mechanics.rotate-drum").at(-1)).toMatchObject({
      kind: "boolean",
      key: "playSound",
      optional: true,
    });
  });

  it("lists every catalog sequence, including the one the Lights page hides", () => {
    const sequence = fieldsOf("lighting.sequence").find((field) => field.key === "sequence");
    expect(sequence).toMatchObject({ kind: "enum" });
    expect(sequence?.kind === "enum" && sequence.options).toContain("rotationDrumMiddle");
  });

  it("refuses what it cannot render instead of guessing", () => {
    const cases = [
      z.strictObject({ list: z.array(z.int()) }),
      z.strictObject({ n: z.number().min(0).max(1) }),
      z.strictObject({ n: z.int() }),
      z.strictObject({ n: z.int().min(0) }),
      z.strictObject({ text: z.string() }),
      z.strictObject({ inner: z.strictObject({ a: z.boolean() }).optional() }),
    ];
    for (const schema of cases) expect(describeParams(schema)).toMatchObject({ ok: false });
  });
});

describe("buildParams", () => {
  const fields = fieldsOf("sound.play-stateful");

  it("turns whole-number text into numbers", () => {
    expect(buildParams(fields, { soundIndex: " 12 ", volume: "0" })).toEqual({
      soundIndex: 12,
      volume: 0,
    });
  });

  it("leaves out an empty optional field, so the library's default applies", () => {
    expect(buildParams(fields, { soundIndex: "3", volume: "" })).toEqual({ soundIndex: 3 });
  });

  it("leaves out an empty required field, and validation names it", () => {
    const result = validateCommand("sound.play-stateful", buildParams(fields, { volume: "1" }));
    expect(result).toMatchObject({ ok: false, issues: [{ path: ["soundIndex"] }] });
  });

  it("passes text that is not a whole number on as text, and validation names it", () => {
    for (const text of ["1.5", "3e2", "twelve", "0x10"]) {
      const result = validateCommand(
        "sound.play",
        buildParams(fieldsOf("sound.play"), { soundIndex: text }),
      );
      expect(result).toMatchObject({ ok: false, issues: [{ path: ["soundIndex"] }] });
    }
  });

  it("builds nested objects", () => {
    expect(
      buildParams(fieldsOf("seals.break"), { "seal.side": "west", "seal.level": "bottom" }),
    ).toEqual({ seal: { side: "west", level: "bottom" } });
  });

  it("sends an optional checkbox only when ticked, and a required one either way", () => {
    const rotate = fieldsOf("mechanics.rotate-drum");
    expect(buildParams(rotate, { playSound: false })).not.toHaveProperty("playSound");
    expect(buildParams(rotate, { playSound: true })).toMatchObject({ playSound: true });
    const required = describeParams(z.strictObject({ on: z.boolean() }));
    expect(required.ok && buildParams(required.fields, {})).toEqual({ on: false });
  });
});
