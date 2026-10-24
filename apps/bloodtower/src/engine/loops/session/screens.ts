import type { SetupScreen } from "../../../protocols/v2/common.ts";

/** Flow screens the shell uses beyond protocol setup ids. */
export type ShellScreen =
  | SetupScreen
  | "splash"
  | "pick-game"
  | "session"
  | "goodbye"
  | "play"
  | "pause";

export const isSetupScreen = (screen: ShellScreen): screen is SetupScreen =>
  screen !== "splash" &&
  screen !== "pick-game" &&
  screen !== "session" &&
  screen !== "goodbye" &&
  screen !== "play" &&
  screen !== "pause";
