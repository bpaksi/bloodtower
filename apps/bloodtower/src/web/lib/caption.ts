import { captionText } from "@talking-avatar/formats";

/** Only `[pause N]` with a numeric N. Words like `[paused]` stay on screen. */
const PAUSE_TAG = /\[pause\s+\d+(?:\.\d+)?\]/gi;

const stripPauseTags = (text: string): string =>
  text.replace(PAUSE_TAG, " ").replace(/\s+/g, " ").trim();

/**
 * Copy shown on the Story board or a device.
 * `[pause N]` pacing tags stay in the pack and the avatar source; they never reach the screen.
 * Uses `captionText` from `@talking-avatar/formats` so board, device, and avatar share one parser.
 */
export const displayCaption = (text: string): string => {
  try {
    return captionText(text);
  } catch {
    return stripPauseTags(text);
  }
};
