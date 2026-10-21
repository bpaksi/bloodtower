"use client";

import { useEffect } from "react";
import type { Side } from "../panels.ts";
import { PANEL_SYNC, PANEL_TOGGLE } from "./Panels.tsx";

/** The button on a panel: collapses it to a 36 px rail, or opens it again. `Panels` does the work. */
export function PanelToggle({ side }: { side: Side }) {
  useEffect(() => {
    window.dispatchEvent(new Event(PANEL_SYNC));
  }, []);
  const [label, key] = side === "left" ? ["sidebar", "["] : ["details panel", "]"];
  return (
    <button
      type="button"
      className={`panel-toggle panel-toggle-${side}`}
      data-panel-toggle={side}
      aria-label={`Toggle ${label}`}
      title={`Toggle ${label} (${key})`}
      onClick={() => window.dispatchEvent(new CustomEvent(PANEL_TOGGLE, { detail: side }))}
    >
      <span className="panel-glyph" aria-hidden="true" />
    </button>
  );
}
