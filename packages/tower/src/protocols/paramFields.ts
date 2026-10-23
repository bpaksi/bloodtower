import { z } from "zod";

/**
 * The form a capability's `params` schema asks for (M3 step 3.1): one field per value, read from
 * the inventory's Zod schema so that a control and the service's validation cannot disagree on
 * what is allowed. Only flat values are described: enums, bounded integers and booleans, also
 * inside a nested object such as a seal's `{ side, level }`. A schema holding anything else (the
 * light lists of `lighting.set`) needs its own component, and `describeParams` says so.
 *
 * The form never decides what is valid. `buildParams` turns what the person entered into a value,
 * and the caller checks it with `validateCommand`, the same check the service makes.
 */

interface FieldBase {
  /** Where the value sits inside `params`, for example `["seal", "side"]`. */
  path: string[];
  /** `path` joined with dots: the field's key in a form's values. */
  key: string;
  /** Words from the path: `["seal", "side"]` reads "Seal side", `soundIndex` reads "Sound index". */
  label: string;
  /** May be left out of `params`; the library's default applies then. */
  optional: boolean;
}

export type ParamField =
  | (FieldBase & { kind: "enum"; options: readonly string[] })
  | (FieldBase & { kind: "integer"; min: number; max: number })
  | (FieldBase & { kind: "boolean" });

export type ParamForm = { ok: true; fields: ParamField[] } | { ok: false; reason: string };

/** What a person has entered, by field key. A text input gives a string, a checkbox a boolean. */
export type ParamValues = Record<string, string | boolean | undefined>;

const words = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();

const labelFor = (path: readonly string[]) => {
  const text = path.map(words).join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const describeObject = (
  schema: z.ZodObject,
  prefix: readonly string[],
  fields: ParamField[],
): string | undefined => {
  for (const [name, entry] of Object.entries(schema.shape)) {
    const path = [...prefix, name];
    let value = entry as z.ZodType;
    const optional = value instanceof z.ZodOptional;
    if (value instanceof z.ZodOptional) value = value.unwrap() as z.ZodType;
    const base = { path, key: path.join("."), label: labelFor(path), optional };

    if (value instanceof z.ZodEnum) {
      fields.push({ ...base, kind: "enum", options: value.options.map(String) });
    } else if (value instanceof z.ZodNumber) {
      const { minValue: min, maxValue: max } = value;
      // Every number in the inventory is a bounded integer (spec §4); anything else is not a field.
      // A bare `z.int()` reports the safe-integer limits as its bounds, which bound nothing.
      const bounded = (limit: number | null): limit is number =>
        limit !== null && Math.abs(limit) < Number.MAX_SAFE_INTEGER;
      if (!value.isInt || !bounded(min) || !bounded(max)) {
        return `${base.key} is not a bounded integer`;
      }
      fields.push({ ...base, kind: "integer", min, max });
    } else if (value instanceof z.ZodBoolean) {
      fields.push({ ...base, kind: "boolean" });
    } else if (value instanceof z.ZodObject && !optional) {
      const why = describeObject(value, path, fields);
      if (why) return why;
    } else {
      return `${base.key} is not an enum, a bounded integer, a boolean or a nested object`;
    }
  }
  return undefined;
};

/** The fields of a `params` schema, or why it needs a component of its own. */
export const describeParams = (schema: z.ZodObject): ParamForm => {
  const fields: ParamField[] = [];
  const why = describeObject(schema, [], fields);
  return why ? { ok: false, reason: why } : { ok: true, fields };
};

/**
 * `params` from what a person entered. An optional field left empty (or an optional checkbox left
 * unticked) is left out, so the library's default applies. A required field left empty is left
 * out too, and validation names it. Text that is not a whole number is passed on as text, so
 * validation names that field as well rather than this guessing.
 */
export const buildParams = (fields: readonly ParamField[], values: ParamValues) => {
  const params: Record<string, unknown> = {};
  for (const field of fields) {
    const entered = values[field.key];
    let value: unknown;
    if (field.kind === "boolean") {
      value = entered === true ? true : field.optional ? undefined : false;
    } else if (typeof entered === "string" && entered.trim() !== "") {
      const text = entered.trim();
      value = field.kind === "integer" && /^-?\d+$/.test(text) ? Number(text) : text;
    }
    if (value === undefined) continue;
    let target = params;
    for (const part of field.path.slice(0, -1)) {
      target[part] ??= {};
      target = target[part] as Record<string, unknown>;
    }
    target[field.path.at(-1) as string] = value;
  }
  return params;
};
