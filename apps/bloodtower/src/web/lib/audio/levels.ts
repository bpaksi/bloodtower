/** The Sound dialog's sliders. Tower volume is not here: it is set in Connect Tower (R3-UI-63). */
export const CHANNELS = ["music", "ambient", "voice"] as const;
export type Channel = (typeof CHANNELS)[number];
export type Levels = Record<Channel, number>;

export const LEVELS_KEY = "bloodtower.audioLevels";

export const DEFAULT_LEVELS: Levels = { music: 0.7, ambient: 0.7, voice: 0.8 };

export const clampLevel = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

/**
 * The Sound dialog's slider fraction (0–1) as the gain the board plays.
 * The dialog stores the fraction; the mixer applies this gain.
 */
export const levelToGain = (level: number): number => clampLevel(level, 0);

/** Reads the saved levels. A missing, broken or blocked store gives the defaults. */
export const readLevels = (storage: Pick<Storage, "getItem"> | undefined): Levels => {
  try {
    const raw = storage?.getItem(LEVELS_KEY);
    if (!raw) return { ...DEFAULT_LEVELS };
    const parsed = JSON.parse(raw) as Partial<Record<Channel, unknown>>;
    return {
      music: clampLevel(parsed.music, DEFAULT_LEVELS.music),
      ambient: clampLevel(parsed.ambient, DEFAULT_LEVELS.ambient),
      voice: clampLevel(parsed.voice, DEFAULT_LEVELS.voice),
    };
  } catch {
    return { ...DEFAULT_LEVELS };
  }
};

/** Saves the levels. A blocked store is not an error: the sliders still work for this visit. */
export const writeLevels = (
  storage: Pick<Storage, "setItem"> | undefined,
  levels: Levels,
): void => {
  try {
    storage?.setItem(LEVELS_KEY, JSON.stringify(levels));
  } catch {
    // Private windows and blocked site data can refuse writes.
  }
};
