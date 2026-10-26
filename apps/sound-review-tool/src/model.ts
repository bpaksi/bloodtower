// What Bob records for each tower sound: a few words of what it sounds like, a tone, and how long
// it ran. Pure functions, so they can be tested without the tower or a server. A value not entered
// is left out, never saved as 0 or "".

export const TONES = ["good", "bad", "neutral"] as const;
export type Tone = (typeof TONES)[number];

/** A measured length: a whole number of milliseconds, no longer than a minute. */
export const LENGTH_MAX_MS = 60_000;
/** The most "sounds like" may hold. */
export const SOUNDS_LIKE_MAX = 500;

export interface SoundRecord {
  index: number;
  soundsLike?: string;
  tone?: Tone;
  /** From Bob's Play press to his Stopped press; the tower does not say when a sound ends. */
  lengthMs?: number;
  /** Milliseconds since the epoch. */
  updatedAt: number;
}

/** The saved draft, `data/sounds.json`. Keys are sound indexes as strings. */
export interface Draft {
  version: 1;
  sounds: Record<string, SoundRecord>;
}

/** A change to one sound. A field left out keeps its value; null clears it. */
export interface SoundChange {
  index: number;
  soundsLike?: string | null;
  tone?: Tone | null;
  lengthMs?: number | null;
}

/** A change that cannot be saved. `code` is shown to Bob with the message. */
export class ModelError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ModelError";
    this.code = code;
  }
}

export const emptyDraft = (): Draft => ({ version: 1, sounds: {} });

const isTone = (value: unknown): value is Tone => TONES.includes(value as Tone);

/** Applies a change to the draft, in place, and returns the sound's record. Throws `ModelError`. */
export const applyChange = (
  draft: Draft,
  change: SoundChange,
  soundCount: number,
  now: number,
): SoundRecord => {
  const { index } = change;
  if (!Number.isInteger(index) || index < 1 || index > soundCount) {
    throw new ModelError("bad-sound", `There is no sound ${String(index)}.`);
  }
  const record: SoundRecord = { ...(draft.sounds[String(index)] ?? { index }), updatedAt: now };

  if (change.soundsLike !== undefined) {
    if (change.soundsLike !== null && typeof change.soundsLike !== "string") {
      throw new ModelError("bad-sounds-like", "Sounds like must be text.");
    }
    const words = change.soundsLike?.trim() ?? "";
    if (words.length > SOUNDS_LIKE_MAX) {
      throw new ModelError(
        "bad-sounds-like",
        `Sounds like holds at most ${SOUNDS_LIKE_MAX} characters.`,
      );
    }
    if (words === "") delete record.soundsLike;
    else record.soundsLike = words;
  }

  if (change.tone !== undefined) {
    if (change.tone === null) delete record.tone;
    else if (isTone(change.tone)) record.tone = change.tone;
    else throw new ModelError("bad-tone", `Tone must be one of ${TONES.join(", ")}.`);
  }

  if (change.lengthMs !== undefined) {
    if (change.lengthMs === null) delete record.lengthMs;
    else if (
      Number.isInteger(change.lengthMs) &&
      change.lengthMs >= 1 &&
      change.lengthMs <= LENGTH_MAX_MS
    ) {
      record.lengthMs = change.lengthMs;
    } else {
      throw new ModelError(
        "bad-length",
        "The length must be a whole number of milliseconds, up to a minute.",
      );
    }
  }

  draft.sounds[String(index)] = record;
  return record;
};

/** Whether anything is recorded for the sound. */
export const isReviewed = (record: SoundRecord | undefined) =>
  record !== undefined &&
  (record.soundsLike !== undefined || record.tone !== undefined || record.lengthMs !== undefined);

/** The game design's card ID for a tower sound: `SND-` and the index in three digits. */
export const soundCardId = (index: number) => `SND-${String(index).padStart(3, "0")}`;

export interface ExportEntry {
  id: string;
  index: number;
  soundsLike?: string;
  tone?: Tone;
  lengthMs?: number;
}

/** `research/game-design/sound-feel.json`: every sound with something recorded, by index. */
export const exportSounds = (draft: Draft): { version: 2; sounds: ExportEntry[] } => ({
  version: 2,
  sounds: Object.values(draft.sounds)
    .filter(isReviewed)
    .sort((a, b) => a.index - b.index)
    .map((record) => {
      const entry: ExportEntry = { id: soundCardId(record.index), index: record.index };
      if (record.soundsLike !== undefined) entry.soundsLike = record.soundsLike;
      if (record.tone !== undefined) entry.tone = record.tone;
      if (record.lengthMs !== undefined) entry.lengthMs = record.lengthMs;
      return entry;
    }),
});

/** One row of tower-poc's old `sound_feel` table. */
export interface OldFeelRow {
  index: number;
  mood: string | null;
  readsAs: string | null;
  lengthMs: number | null;
  note: string | null;
  updatedAt: number;
}

const GOOD = new Set(["triumph", "reward"]);
const BAD = new Set(["dread", "menace", "tension", "threat"]);

/**
 * The tone an old review points to, when it is clear: triumph or reward is good; dread, menace,
 * tension or threat is bad. Picks that point both ways, or neither, give no tone (intent 0001).
 */
export const oldTone = (row: Pick<OldFeelRow, "mood" | "readsAs">): Tone | undefined => {
  const picks = [row.mood, row.readsAs].filter((pick): pick is string => pick !== null);
  const good = picks.some((pick) => GOOD.has(pick));
  const bad = picks.some((pick) => BAD.has(pick));
  if (good === bad) return undefined;
  return good ? "good" : "bad";
};

/** The draft carried over from tower-poc's reviews: note to sounds like, length from Play, tone. */
export const carryOver = (rows: readonly OldFeelRow[]): Draft => {
  const draft = emptyDraft();
  for (const row of rows) {
    const record: SoundRecord = { index: row.index, updatedAt: row.updatedAt };
    const words = row.note?.trim();
    if (words) record.soundsLike = words;
    const tone = oldTone(row);
    if (tone) record.tone = tone;
    if (row.lengthMs !== null) record.lengthMs = row.lengthMs;
    if (isReviewed(record)) draft.sounds[String(row.index)] = record;
  }
  return draft;
};
