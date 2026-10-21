// Tuning panel model. A prototype declares its invented numbers once; the panel edits them and
// copies them out as JSON for FINDINGS.md.

export type TuningField =
  | {
      key: string;
      label: string;
      type: "number";
      default: number;
      min?: number;
      max?: number;
      step?: number;
      note?: string;
    }
  | { key: string; label: string; type: "text"; default: string; note?: string }
  | { key: string; label: string; type: "boolean"; default: boolean; note?: string };

export type TuningValues = Record<string, number | string | boolean>;

export function defaultValues(fields: readonly TuningField[]): TuningValues {
  return Object.fromEntries(fields.map((f) => [f.key, f.default]));
}

/** Copy-as-JSON text: keys in field order, so two copies of the same values are identical. */
export function toJson(fields: readonly TuningField[], values: TuningValues): string {
  const out: TuningValues = {};
  for (const f of fields) out[f.key] = values[f.key] ?? f.default;
  return JSON.stringify(out, null, 2);
}

/** Reads values back from JSON text. Throws on a wrong type or an unknown key, never guesses. */
export function fromJson(fields: readonly TuningField[], text: string): TuningValues {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Tuning JSON must be an object of values.");
  }
  const values = defaultValues(fields);
  for (const [key, value] of Object.entries(parsed)) {
    const field = fields.find((f) => f.key === key);
    if (!field) throw new Error(`Tuning JSON has an unknown key "${key}".`);
    if (typeof value !== typeof field.default) {
      throw new Error(`Tuning value "${key}" should be a ${typeof field.default}.`);
    }
    values[key] = value as number | string | boolean;
  }
  return values;
}

/** Applies an edit from the panel's input. A number field that is not a number is rejected. */
export function setValue(
  fields: readonly TuningField[],
  values: TuningValues,
  key: string,
  raw: string | number | boolean,
): TuningValues {
  const field = fields.find((f) => f.key === key);
  if (!field) throw new Error(`No tuning field "${key}".`);
  let value: number | string | boolean;
  if (field.type === "number") {
    value = Number(raw);
    if (raw === "" || !Number.isFinite(value)) throw new Error(`"${field.label}" needs a number.`);
    if (field.min !== undefined) value = Math.max(field.min, value);
    if (field.max !== undefined) value = Math.min(field.max, value);
  } else if (field.type === "boolean") {
    value = Boolean(raw);
  } else {
    value = String(raw);
  }
  return { ...values, [key]: value };
}

/** True while a person is part-way through typing a number: empty, or only a sign or point. */
export function isMidEdit(raw: string): boolean {
  return /^\s*[-+]?\.?\s*$/.test(raw);
}

export type NumberCommit = { ok: true; value: number } | { ok: false; reason: string };

/**
 * Validates and clamps typed text for a number field. Call it on blur or Enter, not on each key:
 * a cleared field or a lone "-" is only an error if it is still there when the person commits.
 */
export function commitNumber(field: TuningField, raw: string): NumberCommit {
  if (field.type !== "number")
    return { ok: false, reason: `"${field.label}" is not a number field.` };
  const value = Number(raw);
  if (isMidEdit(raw) || !Number.isFinite(value)) {
    return { ok: false, reason: `"${field.label}" needs a number.` };
  }
  let out = value;
  if (field.min !== undefined) out = Math.max(field.min, out);
  if (field.max !== undefined) out = Math.min(field.max, out);
  return { ok: true, value: out };
}
