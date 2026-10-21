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
