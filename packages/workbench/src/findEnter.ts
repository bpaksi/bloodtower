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
    // An unchanged hash fires no hashchange, so the caller must scroll itself.
    return { kind: "jump", hash, rescroll: currentHash.replace(/^#/, "") === hash };
  }
  return { kind: "navigate", openDetail: /[?&]focus=/.test(path ?? "") };
}

/** What Esc does in the find box: close the list and leave the box, and keep the key to itself. */
export function findEscape(): { closeList: boolean; blur: boolean; preventDefault: boolean } {
  return { closeList: true, blur: true, preventDefault: true };
}

export type OpenPlanActions = {
  dispatchHashChange: () => void;
  setHash: (hash: string) => void;
  openDetail: () => void;
  navigate: (href: string) => void;
};

/** Runs an open plan: re-dispatch hashchange on a same-hash re-pick, else set hash or navigate. */
export function applyOpenPlan(plan: OpenPlan, href: string, actions: OpenPlanActions): void {
  if (plan.kind === "jump") {
    if (plan.rescroll) actions.dispatchHashChange();
    else actions.setHash(plan.hash);
    return;
  }
  if (plan.openDetail) actions.openDetail();
  actions.navigate(href);
}

export type FindEscapeAct = { closeList: boolean; blur: boolean; preventDefault: boolean };

/** Runs find Esc: close list, keep the key from the overlay handler, leave the box. */
export function applyFindEscape(
  act: FindEscapeAct,
  actions: { closeList: () => void; preventDefault: () => void; blur: () => void },
): void {
  if (act.closeList) actions.closeList();
  if (act.preventDefault) actions.preventDefault();
  if (act.blur) actions.blur();
}
