import type { StoryboardState } from "bloodtower-protocols";
import { isVisualMoment } from "../../lib/audio/layers.ts";

/**
 * Which presentation layer the board shows (R3-UI-10). `visual` is layer 2: a still, clip or
 * the Keeper fills the screen. `waiting` is play with nothing to show but text (the waiting
 * presentation, layer 3). `startup` is every screen that is not play (start-up dialogs and the
 * closing screen).
 */
export type BoardLayer = "visual" | "waiting" | "startup";

/**
 * The board's layer. `visual` is exactly the `visual` flag LiveBoard hands to `pickLayers`
 * (`screen === "play" && isVisualMoment(moment)`), so the picture zooms in when the waiting
 * audio fades out (R3-UI-60).
 */
export const boardLayer = (state: Pick<StoryboardState, "screen" | "moment">): BoardLayer => {
  if (state.screen !== "play") return "startup";
  return isVisualMoment(state.moment) ? "visual" : "waiting";
};
