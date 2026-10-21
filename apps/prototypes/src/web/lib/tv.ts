// The TV frame is 16:9 and everything inside scales with its width. 1920 px wide (1080p) is the
// design size, so a size written in "design px" doubles at 3840 px wide (4K).

export const TV_DESIGN_WIDTH = 1920;
export const TV_ASPECT = 16 / 9;

/** Rendered px for a size written in design px, when the frame is `frameWidth` px wide. */
export function scaledPx(designPx: number, frameWidth: number): number {
  return (designPx * frameWidth) / TV_DESIGN_WIDTH;
}

/** The largest 16:9 frame that fits the viewport. */
export function frameSize(
  viewportWidth: number,
  viewportHeight: number,
): { width: number; height: number } {
  const width = Math.min(viewportWidth, viewportHeight * TV_ASPECT);
  return { width, height: width / TV_ASPECT };
}

/** CSS length that scales with the frame. Use inside a TvFrame: tvPx(28) is 28 px at 1080p, 56 px at 4K. */
export function tvPx(designPx: number): string {
  return `calc(${designPx} * var(--tv-px))`;
}
