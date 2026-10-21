import type { FindHit } from "./find.ts";

/** What Enter does: open the active hit, fetch for the current text first, or nothing. */
export type EnterAction = { kind: "open"; hit: FindHit } | { kind: "fetch" } | { kind: "none" };

/**
 * Hits only count when they were fetched for the text now in the box. Otherwise Enter must
 * fetch for the current text, never open a hit from an earlier query.
 */
export function resolveEnter(
  text: string,
  hitsFor: string | null,
  hits: FindHit[],
  active: number,
): EnterAction {
  if (text === "") return { kind: "none" };
  if (hitsFor !== text) return { kind: "fetch" };
  const hit = hits[active];
  return hit ? { kind: "open", hit } : { kind: "none" };
}
