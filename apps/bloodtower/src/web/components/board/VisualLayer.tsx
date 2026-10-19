"use client";

import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";

/** The zoom in and out of the visual layer, in ms (R3-UI-31: about 0.6-1.0 s). */
export const VISUAL_ZOOM_MS = 800;
/** Under reduced motion the layer only fades (game-look.md section 5). */
export const VISUAL_FADE_MS = 300;
const ZOOM_EASE = "cubic-bezier(0.65, 0, 0.35, 1)";
/** `Animation.id` of the layer's animation, for tests and the debug tools. */
export const VISUAL_ZOOM_ID = "bt-visual-zoom";
export const VISUAL_FADE_ID = "bt-visual-fade";

type Phase = "in" | "out";

const reducedMotion = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Layer 2 of the board (R3-UI-10): one full-screen visual (a still, a clip or the Keeper) over
 * everything but action-needed messages. With children it zooms in and stays; when the children
 * go (the iPad's Continue, or Quit, moved the story on) it keeps the last visual on screen while
 * it zooms back out, then unmounts. A new visual while one shows is a straight cut: the layer stays
 * and only its content changes. The layer adds no controls; the Keeper scene brings its own
 * Captions on/off button (KeeperScene, step 11's area).
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

  useEffect(() => {
    if (!leaving) return;
    // Backstop for a zoom out that never reports its end (no Web Animations, or a hidden tab).
    const timer = window.setTimeout(() => setLeaving(false), VISUAL_ZOOM_MS + 200);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  if (!active && !leaving) return null;
  return (
    <LayerBox phase={active ? "in" : "out"} onGone={() => setLeaving(false)}>
      {active ? children : last.current}
    </LayerBox>
  );
}

/**
 * Points the layer's animation at `phase` from exactly where it is, never from the far end.
 * `play()` rewinds to the far end when the animation sits at the end it would play away from
 * (a zoom out at time 0, a zoom in at its end), so this never lets that happen:
 * - going out at time 0 (or not started yet: an unresolved time counts as 0): nothing has shown,
 *   so the layer is hidden and dropped at once;
 * - coming in at the end (a zoom out turned back before it moved): it is already fully in, so it
 *   is left finished there;
 * - otherwise the time is pinned and it plays on in the new direction from that time.
 */
export const turnAround = (
  animation: Animation,
  phase: Phase,
  element: HTMLElement,
  onGone: () => void,
) => {
  const rate = phase === "in" ? 1 : -1;
  const timing = animation.effect?.getComputedTiming();
  const end = Number(timing?.endTime ?? 0);
  const raw = animation.currentTime;
  const time = raw === null ? 0 : Math.min(end, Math.max(0, Number(raw)));
  if (rate < 0 && time <= 0) {
    element.style.opacity = "0";
    animation.cancel();
    onGone();
    return;
  }
  animation.playbackRate = rate;
  animation.currentTime = time;
  if (rate > 0 && time >= end) return;
  if (animation.playState !== "running") animation.play();
};

/**
 * Whether the layer's zoom out has really run out (going backwards and back at time 0), so the
 * layer may go. A `finish` event is dispatched a frame after it is queued: a zoom out turned back
 * at its end queues one with the rate at +1, and if the phase flips out again before it arrives
 * the rate already reads −1 while the layer is still fully shown. The time tells them apart.
 */
export const ranOut = (animation: Animation) =>
  animation.playbackRate < 0 && Number(animation.currentTime ?? 0) <= 0;

/**
 * The layer element and its one animation. The zoom (or, under reduced motion, the fade) runs
 * forward to come in and is reversed to go out. Reversing an animation that is still running
 * continues from where it is, so pressing Continue mid-zoom turns the zoom around smoothly: the
 * brightness never jumps (flash safety), whichever way and however often the phase flips.
 */
function LayerBox({
  phase,
  onGone,
  children,
}: {
  phase: Phase;
  onGone: () => void;
  children: ReactNode;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  const gone = useRef(onGone);
  gone.current = onGone;

  // Before paint, so the first frame is already the start of the zoom, never the full visual.
  useLayoutEffect(() => {
    const element = layer.current;
    if (!element) return;
    if (phase === "out") {
      // The table moved on: the leaving visual is not heard over the next moment.
      for (const media of element.querySelectorAll("audio, video")) {
        (media as HTMLMediaElement).pause();
      }
    }
    let current = animation.current;
    if (!current) {
      if (phase !== "in" || typeof element.animate !== "function") return;
      const reduced = reducedMotion();
      current = element.animate(
        reduced
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0, transform: "scale(0.5)" },
              { opacity: 1, transform: "none" },
            ],
        {
          duration: reduced ? VISUAL_FADE_MS : VISUAL_ZOOM_MS,
          // Linear: the gentlest fade, the same small change of brightness every frame.
          easing: reduced ? "linear" : ZOOM_EASE,
          // Backwards only: once the zoom is done the layer keeps no transform, and a reversed
          // zoom that has run out holds its first frame (hidden) until the layer unmounts.
          fill: "backwards",
        },
      );
      current.id = reduced ? VISUAL_FADE_ID : VISUAL_ZOOM_ID;
      current.onfinish = (event) => {
        if (ranOut(event.target as Animation)) gone.current();
      };
      animation.current = current;
      return;
    }
    turnAround(current, phase, element, () => gone.current());
  }, [phase]);

  return (
    <div
      ref={layer}
      className="bt-visual"
      data-visual-layer=""
      data-visual-phase={phase}
      aria-hidden={phase === "out" ? true : undefined}
    >
      {children}
    </div>
  );
}
