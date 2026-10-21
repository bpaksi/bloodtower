/** A sound card's `feel:` block (plan step 7): how Bob heard it on the tower. No Node imports. */

export const MOODS = [
  "dread",
  "tension",
  "wonder",
  "triumph",
  "loss",
  "calm",
  "comic",
  "mystery",
  "menace",
] as const;
export const READS_AS = [
  "threat",
  "alert",
  "reward",
  "failure",
  "arrival",
  "magic",
  "voice",
  "transition",
] as const;
export const STRENGTHS = ["soft", "medium", "strong"] as const;

export type Mood = (typeof MOODS)[number];
export type ReadsAs = (typeof READS_AS)[number];
export type Strength = (typeof STRENGTHS)[number];

/** Every field is optional: one not recorded is left out, never written as 0 or "". */
export type Feel = {
  mood?: Mood;
  readsAs?: ReadsAs;
  strength?: Strength;
  /** Measured by Bob's Stopped press; the tower does not report when a sound ends. */
  lengthMs?: number;
  note?: string;
};

const KEYS = ["mood", "readsAs", "strength", "lengthMs", "note"];

function oneOf(list: readonly string[], v: unknown): boolean {
  return typeof v === "string" && list.includes(v);
}

/** The card lint for `feel:`: only on sound cards, known keys, known words. Returns the problem, or null. */
export function checkFeel(type: string, data: Record<string, unknown>): string | null {
  if (!("feel" in data)) return null;
  if (type !== "sound") return "feel is only for sound cards";
  const f = data.feel;
  if (typeof f !== "object" || f === null || Array.isArray(f)) return "feel must be a block";
  const feel = f as Record<string, unknown>;
  for (const k of Object.keys(feel)) if (!KEYS.includes(k)) return `unknown feel field "${k}"`;
  if (feel.mood !== undefined && !oneOf(MOODS, feel.mood))
    return `unknown mood "${String(feel.mood)}"`;
  if (feel.readsAs !== undefined && !oneOf(READS_AS, feel.readsAs))
    return `unknown readsAs "${String(feel.readsAs)}"`;
  if (feel.strength !== undefined && !oneOf(STRENGTHS, feel.strength))
    return `unknown strength "${String(feel.strength)}"`;
  if (
    feel.lengthMs !== undefined &&
    !(Number.isInteger(feel.lengthMs) && (feel.lengthMs as number) > 0)
  )
    return "feel lengthMs must be a whole number above 0";
  if (feel.note !== undefined && typeof feel.note !== "string") return "feel note must be text";
  return null;
}

/** The checked `feel:` block of a card, or null when it has none. */
export function feelOf(card: { data: Record<string, unknown> }): Feel | null {
  const f = card.data.feel;
  return typeof f === "object" && f !== null ? (f as Feel) : null;
}
