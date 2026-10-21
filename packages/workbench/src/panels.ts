/** The two collapsible panels: the left sidebar and the right detail panel (or document rail). */
export type Side = "left" | "right";
export type PanelState = { left: boolean; right: boolean };

/** Open by default from this width up; below it both start closed. */
export const WIDE_FROM = 1200;
export const STORAGE_KEY = "workbench.panels";

/** The saved choice wins; with none, both panels are closed below 1200 px and open from 1200 px. */
export function initialPanels(width: number, stored: PanelState | null): PanelState {
  if (stored) return { left: stored.left, right: stored.right };
  const wide = width >= WIDE_FROM;
  return { left: wide, right: wide };
}

export function togglePanel(state: PanelState, side: Side): PanelState {
  return { ...state, [side]: !state[side] };
}

/** Reads a saved value; anything that is not `{left: boolean, right: boolean}` counts as no choice. */
export function parseStored(raw: string | null): PanelState | null {
  if (raw === null) return null;
  try {
    const v = JSON.parse(raw) as Partial<PanelState> | null;
    if (v && typeof v.left === "boolean" && typeof v.right === "boolean") {
      return { left: v.left, right: v.right };
    }
  } catch {
    // fall through: unreadable means no saved choice
  }
  return null;
}

/** What a toggle persists: the saved choice with only the toggled side changed. */
export function savedAfterToggle(
  saved: PanelState | null,
  width: number,
  current: PanelState,
  side: Side,
): PanelState {
  // Stub: saves the whole current state, an unsaved overlay included (the bug).
  void saved;
  void width;
  return togglePanel(current, side);
}

export type EscapeContext = {
  width: number;
  defaultPrevented: boolean;
  /** The graph's detail panel is on the page (a document page has a rail instead). */
  graphDetail: boolean;
  rightOpen: boolean;
  dialogOpen: boolean;
};

/** Esc closes only the graph's detail overlay below 1200 px. */
export function escapeClosesRight(c: EscapeContext): boolean {
  // Stub: also closes the doc rail (the bug).
  return !c.defaultPrevented && c.width < WIDE_FROM && c.rightOpen && !c.dialogOpen;
}

export type PendingEvent =
  | { type: "request"; hasRight: boolean }
  | { type: "ready"; hasRight: boolean }
  | { type: "unknown-id" };

/** The "open the detail panel once it exists" flag. `open` says to open the panel now. */
export function stepPending(
  pending: boolean,
  event: PendingEvent,
): { pending: boolean; open: boolean } {
  switch (event.type) {
    case "request":
      return event.hasRight ? { pending, open: true } : { pending: true, open: false };
    case "ready":
      return pending && event.hasRight ? { pending: false, open: true } : { pending, open: false };
    case "unknown-id":
      return { pending, open: false }; // stub: the flag stays (the bug)
  }
}
