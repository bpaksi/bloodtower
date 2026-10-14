const MIN_MS = 20_000;
const SPAN_MS = 40_000;

/** FNV-1a over the seed and the accent index. The same pair always draws the same delay. */
const mix = (seed: string, index: number): number => {
  let hash = 2166136261;
  const text = `${seed}:${index}`;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

/**
 * Delay before the next E16 accent, in milliseconds, inside 20–60 s.
 * The asset kit has no separate accent audio, so the accent id is the screen pulse itself.
 */
export const ACCENT_ID = "screen-pulse";

export const accentDelayMs = (seed: string, index: number): number =>
  MIN_MS + (mix(seed, index) % (SPAN_MS + 1));
