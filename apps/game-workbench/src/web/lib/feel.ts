/**
 * A sound card's `feel:` block (plan step 7): how Bob heard it on the tower, as the sound review
 * tool (apps/sound-review-tool) records it. No Node imports.
 */

export const TONES = ["good", "bad", "neutral"] as const;

export type Tone = (typeof TONES)[number];

/** Every field is optional: one not recorded is left out, never written as 0 or "". */
export type Feel = {
  /** A few of Bob's words: growl, coins, metal on metal. */
  soundsLike?: string;
  tone?: Tone;
  /** From Bob's Play press to his Stopped press; the tower does not report when a sound ends. */
  lengthMs?: number;
};

const KEYS = ["soundsLike", "tone", "lengthMs"];

/** The card lint for `feel:`: only on sound cards, known keys, known words. Returns the problem, or null. */
export function checkFeel(type: string, data: Record<string, unknown>): string | null {
  if (!("feel" in data)) return null;
  if (type !== "sound") return "feel is only for sound cards";
  const f = data.feel;
  if (typeof f !== "object" || f === null || Array.isArray(f)) return "feel must be a block";
  const feel = f as Record<string, unknown>;
  for (const k of Object.keys(feel)) if (!KEYS.includes(k)) return `unknown feel field "${k}"`;
  if (feel.tone !== undefined && !(TONES as readonly unknown[]).includes(feel.tone))
    return `unknown tone "${String(feel.tone)}"`;
  const length = feel.lengthMs;
  if (length !== undefined && !(Number.isInteger(length) && (length as number) > 0))
    return "feel lengthMs must be a whole number above 0";
  if (
    feel.soundsLike !== undefined &&
    (typeof feel.soundsLike !== "string" || feel.soundsLike === "")
  )
    return "feel soundsLike must be text";
  return null;
}

/** The checked `feel:` block of a card, or null when it has none. */
export function feelOf(card: { data: Record<string, unknown> }): Feel | null {
  const f = card.data.feel;
  return typeof f === "object" && f !== null ? (f as Feel) : null;
}
