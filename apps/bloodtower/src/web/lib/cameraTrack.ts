/** Subset of talking-avatar camera-track contract v1 (draft). */

export type CameraFrame = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CameraCue = {
  start: number;
  end: number;
  from: CameraFrame;
  to: CameraFrame;
  ease?: string;
};

export type CameraTrack = {
  id: string;
  still: string;
  standeeOff?: boolean;
  opening?: "letterbox-hold-push";
  cues: CameraCue[];
};

export const STILL_ASPECT_DEFAULT = 16 / 9;

const DEFAULT_EASE = "ease-in-out";

const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Maps contract ease strings to a 0..1 easing curve. Unknown values use ease-in-out. */
export const applyEase = (t: number, ease?: string): number => {
  const clamped = Math.min(1, Math.max(0, t));
  const name = ease ?? DEFAULT_EASE;
  if (name === "linear") return clamped;
  if (name === "ease-in") return clamped * clamped;
  if (name === "ease-out") return 1 - (1 - clamped) ** 2;
  return easeInOut(clamped);
};

export const interpolateFrame = (from: CameraFrame, to: CameraFrame, t: number): CameraFrame => ({
  x: from.x + (to.x - from.x) * t,
  y: from.y + (to.y - from.y) * t,
  w: from.w + (to.w - from.w) * t,
  h: from.h + (to.h - from.h) * t,
});

const holdFrame = (track: CameraTrack): CameraFrame => {
  const last = track.cues.at(-1);
  if (last) return last.to;
  return { x: 0.5, y: 0.5, w: 1, h: 1 };
};

/** Visible still fraction under `object-fit: cover` with no extra transform. */
export const coverVisibleFraction = (
  containerAspect: number,
  stillAspect: number = STILL_ASPECT_DEFAULT,
): CameraFrame => {
  if (containerAspect >= stillAspect) {
    return { x: 0.5, y: 0.5, w: stillAspect / containerAspect, h: 1 };
  }
  return { x: 0.5, y: 0.5, w: 1, h: containerAspect / stillAspect };
};

/** Frame at `seconds` on the track clock. Gaps hold the previous cue's `to`. */
export const frameAtTime = (track: CameraTrack, seconds: number): CameraFrame => {
  if (track.cues.length === 0) return holdFrame(track);
  const t = Math.max(0, seconds);
  let previousTo: CameraFrame | null = null;
  for (const cue of track.cues) {
    if (t < cue.start) {
      return previousTo ?? cue.from;
    }
    if (t <= cue.end) {
      const span = cue.end - cue.start;
      const raw = span > 0 ? (t - cue.start) / span : 1;
      const hold =
        cue.from.x === cue.to.x &&
        cue.from.y === cue.to.y &&
        cue.from.w === cue.to.w &&
        cue.from.h === cue.to.h;
      const eased = applyEase(raw, hold ? undefined : cue.ease);
      return interpolateFrame(cue.from, cue.to, eased);
    }
    previousTo = cue.to;
  }
  return holdFrame(track);
};

/**
 * CSS transform for an image with width/height 100% and `object-fit: cover`.
 * Frames are fractions of the still bitmap (1920×1080); container aspect may differ.
 */
export const frameToTransform = (
  frame: CameraFrame,
  containerAspect: number,
  stillAspect: number = STILL_ASPECT_DEFAULT,
): string => {
  const cover = coverVisibleFraction(containerAspect, stillAspect);
  const scale = Math.max(cover.w / frame.w, cover.h / frame.h);
  const tx = ((0.5 - frame.x) / cover.w) * scale * 100;
  const ty = ((0.5 - frame.y) / cover.h) * scale * 100;
  return `translate(${tx}%, ${ty}%) scale(${scale})`;
};

const PAUSE_TAG = /\[pause\s+(\d+(?:\.\d+)?)\]/gi;

/** Rough speech length for placeholder line audio (pack vo.* placeholders). */
export const estimateSpeechDurationSeconds = (text: string, wordsPerSecond = 2.5): number => {
  let pauses = 0;
  for (const match of text.matchAll(PAUSE_TAG)) {
    pauses += Number.parseFloat(match[1] ?? "0");
  }
  const spoken = text.replace(PAUSE_TAG, " ").replace(/\s+/g, " ").trim();
  const words = spoken.length === 0 ? 0 : spoken.split(" ").length;
  return pauses + words / wordsPerSecond;
};

export const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};
