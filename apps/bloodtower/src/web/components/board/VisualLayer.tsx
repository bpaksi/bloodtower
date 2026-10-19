"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

/** The zoom in and out of the visual layer, in ms (R3-UI-31: about 0.6-1.0 s). board.css matches. */
export const VISUAL_ZOOM_MS = 800;

/**
 * Layer 2 of the board (R3-UI-10): one full-screen visual (a still, a clip or the Keeper) over
 * everything but action-needed messages. With children it zooms in and stays; when the children
 * go (the iPad's Continue moved the story on) it keeps the last visual on screen while it zooms
 * back out, then unmounts. A new visual while one shows is a straight cut: the layer stays and
 * only its content changes. The board has no controls here; nothing in this layer is pressed.
 */
export function VisualLayer({ children }: { children: ReactNode }) {
  const active = children !== null && children !== undefined && children !== false;
  // The visual on screen, kept so the zoom out still shows it (and its camera track keeps moving).
  const last = useRef<ReactNode>(null);
  if (active) last.current = children;
  const [wasActive, setWasActive] = useState(active);
  const [leaving, setLeaving] = useState(false);
  // Decided during render, so the frame the visual ends is already the zoom out, never a gap.
  if (wasActive !== active) {
    setWasActive(active);
    setLeaving(!active);
  }
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!leaving) return;
    // The table pressed Continue: the leaving visual is not heard over the next moment.
    for (const media of layer.current?.querySelectorAll("audio, video") ?? []) {
      (media as HTMLMediaElement).pause();
    }
    // Backstop for a zoom out that never reports its end (animations off, or a hidden tab).
    const timer = window.setTimeout(() => setLeaving(false), VISUAL_ZOOM_MS + 200);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  if (!active && !leaving) return null;
  return (
    <div
      ref={layer}
      className="bt-visual"
      data-visual-layer=""
      data-visual-phase={active ? "in" : "out"}
      aria-hidden={active ? undefined : true}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget && !active) setLeaving(false);
      }}
    >
      {active ? children : last.current}
    </div>
  );
}
