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

/** The saved draft, `~/Desktop/sound-feel.json`. Keys are sound indexes as strings. */
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

/**
 * Reads a saved draft without ever stopping the tool. Bad entries and fields are dropped and listed
 * in `problems`; a file that is not a JSON object gives no draft at all.
 */
export const parseDraft = (
  text: string,
  soundCount: number,
): { draft: Draft | null; problems: string[] } => {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    return { draft: null, problems: [`the draft is not valid JSON (${(error as Error).message})`] };
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { draft: null, problems: ["the draft is not an object"] };
  }
  const problems: string[] = [];
  const draft = emptyDraft();
  const sounds = (raw as { sounds?: unknown }).sounds;
  if (sounds === undefined || sounds === null) return { draft, problems };
  if (typeof sounds !== "object" || Array.isArray(sounds)) {
    return { draft, problems: ["sounds is not an object; it was ignored"] };
  }
  for (const [key, value] of Object.entries(sounds)) {
    const index = Number(key);
    const entry = value as Partial<Record<keyof SoundRecord, unknown>> | null;
    if (!Number.isInteger(index) || index < 1 || index > soundCount || String(index) !== key) {
      problems.push(`there is no sound ${key}; its entry was dropped`);
      continue;
    }
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      problems.push(`sound ${key} is not an object; it was dropped`);
      continue;
    }
    const updatedAt = Number.isFinite(entry.updatedAt) ? (entry.updatedAt as number) : 0;
    if (updatedAt === 0) problems.push(`sound ${key} has no time it was changed; set to 0`);
    const record: SoundRecord = { index, updatedAt };
    if (entry.soundsLike !== undefined) {
      const words = typeof entry.soundsLike === "string" ? entry.soundsLike.trim() : "";
      if (words !== "" && words.length <= SOUNDS_LIKE_MAX) record.soundsLike = words;
      else problems.push(`sounds like for sound ${key} is not usable text; dropped`);
    }
    if (entry.tone !== undefined) {
      if (isTone(entry.tone)) record.tone = entry.tone;
      else problems.push(`tone ${JSON.stringify(entry.tone)} for sound ${key} is unknown; dropped`);
    }
    if (entry.lengthMs !== undefined) {
      const ms = entry.lengthMs;
      if (Number.isInteger(ms) && (ms as number) >= 1 && (ms as number) <= LENGTH_MAX_MS) {
        record.lengthMs = ms as number;
      } else problems.push(`length ${JSON.stringify(ms)} for sound ${key} is not usable; dropped`);
    }
    if (isReviewed(record)) draft.sounds[key] = record;
  }
  return { draft, problems };
};

/** Whether anything is recorded for the sound. */
export const isReviewed = (record: SoundRecord | undefined) =>
  record !== undefined &&
  (record.soundsLike !== undefined || record.tone !== undefined || record.lengthMs !== undefined);

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
