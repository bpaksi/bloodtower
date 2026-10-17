/**
 * Copy shown on the Story board or a device.
 * `[pause N]` pacing tags stay in the pack and the avatar source; they never reach the screen.
 */
export const displayCaption = (text: string): string =>
  text
    .replace(/\[pause[^\]]*\]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
