/**
 * The swap point for the landing painting's window mask and glow layers (R3-UI-02, visuals step
 * 2). Every file is 1920x1080 and pixel-aligned with `/landing/hero.webp`; see
 * `public/landing/window-mask/README.md`. This is the only module that names these paths.
 */
export const BOARD_WINDOW_MASK_URL = "/landing/window-mask/window-mask.png";

export type WindowGlowGroup = "a" | "b" | "c" | "d";

export type WindowGlow = {
  group: WindowGlowGroup;
  url: string;
  /** One flicker cycle, in seconds. Distinct per group so the lights never line up. */
  durationS: number;
  /** Negative, so each group starts part-way through its cycle. */
  delayS: number;
};

/** a is the tower window; b and c are the upper and lower stair lanterns; d is the lamp post. */
export const WINDOW_GLOWS: readonly WindowGlow[] = [
  { group: "a", url: "/landing/window-mask/window-glow-a.png", durationS: 2.9, delayS: 0 },
  { group: "b", url: "/landing/window-mask/window-glow-b.png", durationS: 3.7, delayS: -1.3 },
  { group: "c", url: "/landing/window-mask/window-glow-c.png", durationS: 4.3, delayS: -2.1 },
  { group: "d", url: "/landing/window-mask/window-glow-d.png", durationS: 3.1, delayS: -0.6 },
];
