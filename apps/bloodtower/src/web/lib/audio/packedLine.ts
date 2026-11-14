import type { BoardView } from "bloodtower-protocols";
import { pageServerOrigin } from "../serverOrigin.ts";

/** The packed line on the board view (A1-8b-2, D49): ids and text only. */
export type PackedLine = NonNullable<BoardView["packedLine"]>;

/**
 * The play number this page last saw. `undefined` until the first host view arrives: whatever is
 * on that view was started before this page loaded (a reload or a restore), so it is not played.
 */
export type SeenPlay = number | null | undefined;

/**
 * Whether a host view starts the packed line on this page. Only a change of `play` after the
 * page's first view starts it, so a reload never replays the line by itself and an explicit
 * replay (a new play number) plays once.
 */
export const playOnView = (
  seen: SeenPlay,
  line: PackedLine | null | undefined,
): { start: PackedLine | null; seen: number | null } => {
  const next = line?.play ?? null;
  if (seen === undefined) return { start: null, seen: next };
  if (line && next !== seen) return { start: line, seen: next };
  return { start: null, seen: next };
};

/** A packed file on the session host, by asset id. The board never gets file bytes in a message. */
export const packedFileUrl = (
  packId: string,
  assetId: string,
  origin: string = pageServerOrigin(),
): string => `${origin}/packs/${encodeURIComponent(packId)}/by-id/${encodeURIComponent(assetId)}`;

/** How long the picture and caption stay after the voice ends. */
export const CAPTION_HOLD_MS = 1500;

/** Caption only (no audio, or audio that failed): a reading time, 4 to 12 seconds. */
export const captionOnlyMs = (caption: string): number =>
  Math.min(12_000, Math.max(4_000, caption.length * 70));

/**
 * How long to keep the picture and caption once the voice has ended, `elapsed` ms after it began:
 * the hold, or what is left of the caption's reading time if that is longer.
 */
export const afterVoiceMs = (caption: string, elapsed: number): number =>
  Math.max(CAPTION_HOLD_MS, captionOnlyMs(caption) - Math.max(0, elapsed));
