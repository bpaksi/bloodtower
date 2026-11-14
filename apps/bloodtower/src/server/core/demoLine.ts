import type { ShellStory } from "../../engine/loops/session/pack.ts";
import { assetIdSchema, type PackEffect } from "../../protocols/pack-v2/index.ts";

/**
 * The controlled once-only demo entry (A1-8b-2, G-A1-04, D49). It is off unless the host was
 * started with `BLOODTOWER_DEMO_LINE=<line asset id>`. Then a joined device's `act` with prompt
 * `demo-line` and action `play` plays that line once on the Story board; `replay` is the explicit
 * replay. No iPad shows a button for it, and it is no gameplay event: nothing about it is in the
 * event log or a checkpoint, so a restore or Continue never plays it again by itself.
 */
export const DEMO_LINE_ENV = "BLOODTOWER_DEMO_LINE";
export const DEMO_PROMPT_ID = "demo-line";
export const DEMO_ACTIONS = ["play", "replay"] as const;
export type DemoAction = (typeof DEMO_ACTIONS)[number];

/** The demo line plays over the manifest cover (`painting.cover`) and its mask (D41, D48). */
export const DEMO_PAINTING = "painting.cover";
export const DEMO_GLOW = "glow.cover";

export const isDemoAction = (value: string): value is DemoAction =>
  (DEMO_ACTIONS as readonly string[]).includes(value);

/** The line id the host was started with, or null. A value that is not an asset id is an error. */
export const demoLineFromEnv = (
  env: Readonly<Record<string, string | undefined>>,
): { lineId: string | null; error?: string } => {
  const raw = env[DEMO_LINE_ENV]?.trim() ?? "";
  if (raw === "") return { lineId: null };
  if (!assetIdSchema.safeParse(raw).success) {
    return {
      lineId: null,
      error: `${DEMO_LINE_ENV}="${raw.slice(0, 80)}" is not an asset id, so the demo entry is off.`,
    };
  }
  return { lineId: raw };
};

/** What the host knows about one story's packed media. Ids only; the files stay on the host. */
export type PackMedia = {
  packId: string;
  /** `type: line` rows of `assets[]` that carry a speaker and fixed text, by asset id (D48). */
  lines: ReadonlyMap<string, { speaker: string; text: string }>;
  /** `assets/index.json` entries whose file is on disk, by asset id, with their kind (D45). */
  indexed: ReadonlyMap<string, { kind: string }>;
};

/**
 * The catalog keeps each story's media beside it, keyed by the story object. The story itself is
 * engine data (and goes into checkpoints), so the media do not ride on it.
 */
const mediaByStory = new WeakMap<ShellStory, PackMedia>();

export const attachPackMedia = (story: ShellStory, media: PackMedia): void => {
  mediaByStory.set(story, media);
};

export const packMediaFor = (story: ShellStory): PackMedia | undefined => mediaByStory.get(story);

export type NarrateEffect = Extract<PackEffect, { kind: "narrate" }>;

/**
 * The demo's narrate effect, built from the pack's own line row: the speaker and text the pack
 * declares, voiced by that row's id. Undefined when the pack has no such line.
 */
export const demoNarrateEffect = (media: PackMedia, lineId: string): NarrateEffect | undefined => {
  const row = media.lines.get(lineId);
  if (!row) return undefined;
  return {
    kind: "narrate",
    target: "storyboard",
    lines: [{ speaker: row.speaker, text: row.text, voice: lineId }],
  };
};
