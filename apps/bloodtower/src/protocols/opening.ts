/**
 * Proving Grounds opening on the Story board after Begin and before the first move.
 * Prompt ids stay free of dots so they fit `promptIdSchema`.
 */
export const OPENING_MOMENTS = [
  "grey-stair.01",
  "grey-stair.02",
  "grey-stair.03",
  "grey-stair.04",
] as const;

export type OpeningMomentId = (typeof OPENING_MOMENTS)[number];

/** A line with no final copy. The Keeper plate may replace this with its own caption. */
export const OPENING_PLACEHOLDER = "The grey stair.";

export const openingPromptId = (momentId: string): string =>
  `continue-opening-${momentId.replaceAll(".", "-")}`;

export const isOpeningMomentId = (id: string): id is OpeningMomentId =>
  (OPENING_MOMENTS as readonly string[]).includes(id);

/** `openingIndex` while a moment is up. `-1` has not started. */
export const openingActiveIndex = (index: number): boolean =>
  index >= 0 && index < OPENING_MOMENTS.length;

export const openingFinishedIndex = (index: number): boolean => index >= OPENING_MOMENTS.length;
