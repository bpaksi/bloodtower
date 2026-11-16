import { HINT_TEXT, type HintId } from "./copy.ts";

/** Error codes the host logs and toasts (never silent). */
export const HINT_TEXT_MISSING = "hint-text-missing" as const;
export const HINTS_AFTER_SETUP = "hints-after-setup" as const;
export const RULES_PAGE_MISSING = "rules-page-missing" as const;

/**
 * The five loops that open with a hint, by loop id, in the order a game first meets them.
 * `battle` and `event` have no loop on main yet: C4-02 wires `battle`, the event loop wires
 * `event`; both are tested with a synthetic loop-entered event.
 */
export const HINT_FOR_LOOP: Readonly<Record<string, HintId>> = {
  battle: "hint.first-battle",
  building: "hint.first-building",
  event: "hint.first-event",
  "skull-drop": "hint.first-skull-drop",
  "day-end": "hint.first-day-end",
};

export const HINT_IDS: readonly HintId[] = Object.values(HINT_FOR_LOOP) as HintId[];

/** What a game remembers about hints. `shown` is once per game, never per day or per hero. */
export type HintRecord = { on: boolean; shown: readonly string[] };

export type HintEffect = { kind: "hint"; v: 1; hintId: HintId; text: string };

/**
 * A loop was entered. Returns the hint to show, or null: Hints off, the hint already shown, or a
 * loop with no hint. An unknown loop id is the normal case (most loops have no hint), not an error.
 */
export const hintForLoopEntered = (
  record: HintRecord,
  loopId: string,
  texts: Readonly<Record<string, string>> = HINT_TEXT,
): HintEffect | null => {
  if (!record.on) return null;
  const hintId = HINT_FOR_LOOP[loopId];
  if (!hintId || record.shown.includes(hintId)) return null;
  return { kind: "hint", v: 1, hintId, text: texts[hintId] ?? "" };
};

/** Feed loop-entered events in order; each hint appears once. Pure: the record is not changed. */
export const hintsForLoops = (
  record: HintRecord,
  loopIds: readonly string[],
  texts: Readonly<Record<string, string>> = HINT_TEXT,
): HintEffect[] => {
  const shown = [...record.shown];
  const out: HintEffect[] = [];
  for (const loopId of loopIds) {
    const effect = hintForLoopEntered({ on: record.on, shown }, loopId, texts);
    if (!effect) continue;
    shown.push(effect.hintId);
    out.push(effect);
  }
  return out;
};
