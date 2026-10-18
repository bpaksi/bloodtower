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

/** Frame at `seconds` on the track clock, before audio-end clamping. */
export const frameAtTime = (track: CameraTrack, seconds: number): CameraFrame => {
  if (track.cues.length === 0) return holdFrame(track);
  const t = Math.max(0, seconds);
  for (const cue of track.cues) {
    if (t < cue.start) {
      return cue.from;
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
  }
  return holdFrame(track);
};

/**
 * When speech ends before the last cue, hold the final framing (Bob, 2026-10-18).
 * When the clock runs past the last cue, keep the last `to` frame.
 */
export const frameAtClock = (
  track: CameraTrack,
  seconds: number,
  speechDurationSeconds: number,
): CameraFrame => {
  if (speechDurationSeconds > 0 && seconds >= speechDurationSeconds) {
    return holdFrame(track);
  }
  return frameAtTime(track, seconds);
};

/**
 * CSS transform for an image that fills its container (width and height 100%).
 * Uniform scale keeps aspect ratio; pan centers the crop window on (x, y).
 */
export const frameToTransform = (frame: CameraFrame): string => {
  const scale = Math.max(1 / frame.w, 1 / frame.h);
  const tx = (0.5 - frame.x) * scale * 100;
  const ty = (0.5 - frame.y) * scale * 100;
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
