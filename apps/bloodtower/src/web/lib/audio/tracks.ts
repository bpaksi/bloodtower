/**
 * Which files the board plays. The signature sounds are app-level (`public/audio/signature`).
 * Each pack's moods are its files under `packs/<id>/audio/`, served at `/packs/<id>/audio/<file>`.
 * `frames` is the loop length N at 48 kHz (see loopPoints.ts). One-shots have no `frames`.
 */

export interface AudioFile {
  url: string;
  frames?: number;
}

export type Mood = "startup" | "night-1" | "night-2" | "waiting";

const signature = (file: string, frames?: number): AudioFile => ({
  url: `/audio/signature/${file}`,
  ...(frames === undefined ? {} : { frames }),
});

export const SIGNATURE = {
  /** Plays from the landing screen through the Sound dialog and Pick Game. */
  bed: signature("signature-bed.m4a", 5_472_000),
  /** The landing window lights come on (the first board click). */
  sting: signature("motif-sting.m4a"),
  /** A game is chosen. */
  soft: signature("motif-soft.m4a"),
} as const;

const packFile = (packId: string, file: string, frames: number): AudioFile => ({
  url: `/packs/${packId}/audio/${file}`,
  frames,
});

/** Mood → file, per pack id. A pack with no entry falls back to the signature bed. */
const PACK_MOODS: Readonly<Record<string, Readonly<Partial<Record<Mood, AudioFile>>>>> = {
  test: {
    startup: packFile("test", "startup-ambient.m4a", 4_608_000),
    "night-1": packFile("test", "night1-ambient.m4a", 4_800_000),
    "night-2": packFile("test", "night2-ambient.m4a", 4_320_000),
    waiting: packFile("test", "pg-music.m4a", 7_200_000),
  },
};

export const moodFile = (packId: string | null, mood: Mood): AudioFile | undefined =>
  packId === null ? undefined : PACK_MOODS[packId]?.[mood];

export const packHasMoods = (packId: string | null): boolean =>
  packId !== null && Object.keys(PACK_MOODS[packId] ?? {}).length > 0;
