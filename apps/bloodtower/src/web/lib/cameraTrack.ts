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

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Width of the still, in well heights, when `object-fit: cover` fills the well. */
const coverWidth = (containerAspect: number, stillAspect: number): number =>
  Math.max(containerAspect, stillAspect);

/**
 * The part of the still the well shows for `frame`, as fractions of the still. The still keeps
 * its aspect (one uniform scale), the whole cue rect is in view with the artwork around it filling
 * the rest of the well, the zoom never drops below cover (no bars), and the view stays inside the
 * still (the centre moves in from the edge when it must).
 */
export const visibleRegion = (
  frame: CameraFrame,
  containerAspect: number = STILL_ASPECT_DEFAULT,
  stillAspect: number = STILL_ASPECT_DEFAULT,
): CameraFrame => {
  const width = Math.max(
    coverWidth(containerAspect, stillAspect),
    Math.min(containerAspect / frame.w, stillAspect / frame.h),
  );
  const w = containerAspect / width;
  const h = stillAspect / width;
  return {
    x: clamp(frame.x, w / 2, 1 - w / 2),
    y: clamp(frame.y, h / 2, 1 - h / 2),
    w,
    h,
  };
};

/**
 * CSS transform for a camera still drawn with `object-fit: cover` at the well's size. Translate
 * percentages are of the well, so the result depends only on the two aspects (width / height).
 */
export const frameToTransform = (
  frame: CameraFrame,
  containerAspect: number = STILL_ASPECT_DEFAULT,
  stillAspect: number = STILL_ASPECT_DEFAULT,
): string => {
  const region = visibleRegion(frame, containerAspect, stillAspect);
  const base = coverWidth(containerAspect, stillAspect);
  const scale = containerAspect / region.w / base;
  const tx = (-scale * (region.x - 0.5) * base * 100) / containerAspect;
  const ty = (-scale * (region.y - 0.5) * base * 100) / stillAspect;
  return `translate(${tx}%, ${ty}%) scale(${scale})`;
};

const TRANSFORM_RE = /^translate\(([-\d.e]+)%, ([-\d.e]+)%\) scale\(([-\d.e]+)\)$/;

/** Decodes a {@link frameToTransform} string back into the still region it shows (for tests). */
export const regionFromTransform = (
  transform: string,
  containerAspect: number = STILL_ASPECT_DEFAULT,
  stillAspect: number = STILL_ASPECT_DEFAULT,
): CameraFrame => {
  const match = TRANSFORM_RE.exec(transform);
  if (!match) {
    throw new Error(`Unrecognized camera transform: ${transform}`);
  }
  const tx = Number(match[1]);
  const ty = Number(match[2]);
  const scale = Number(match[3]);
  const base = coverWidth(containerAspect, stillAspect);
  const width = scale * base;
  return {
    x: 0.5 - (tx * containerAspect) / (100 * scale * base),
    y: 0.5 - (ty * stillAspect) / (100 * scale * base),
    w: containerAspect / width,
    h: stillAspect / width,
  };
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
