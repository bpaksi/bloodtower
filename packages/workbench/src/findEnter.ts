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

export type OpenPlan =
  | { kind: "jump"; hash: string; rescroll: boolean }
  | { kind: "navigate"; openDetail: boolean };

/** How to open a hit: jump within the page (scroll again if the hash is unchanged) or navigate. */
export function resolveOpen(href: string, pathname: string, currentHash: string): OpenPlan {
  const [path, hash] = href.split("#");
  if (hash && path === pathname) {
    // Stub: an unchanged hash fires no hashchange, so nothing scrolls (the bug).
    void currentHash;
    return { kind: "jump", hash, rescroll: false };
  }
  return { kind: "navigate", openDetail: /[?&]focus=/.test(path ?? "") };
}

/** What Esc does in the find box: close the list and leave the box, and keep the key to itself. */
export function findEscape(): { closeList: boolean; blur: boolean; preventDefault: boolean } {
  return { closeList: true, blur: true, preventDefault: false }; // stub (the bug)
}
