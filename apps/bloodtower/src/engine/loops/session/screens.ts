import type { SetupScreen } from "../../../protocols/v2/common.ts";

/** Flow screens the shell uses beyond protocol setup ids. */
export type ShellScreen =
  | SetupScreen
  | "table-join"
  | "base-board"
  | "tower-choice"
  | "tower-wake"
  | "pick-game"
  | "session"
  | "goodbye"
  | "play"
  | "pause"
  | "not-playable";

/** The session Enter's screens (MEC-039). They run once, before the first Pick story. */
export const ENTER_SCREENS: readonly ShellScreen[] = [
  "table-join",
  "base-board",
  "tower-choice",
  "tower-wake",
];

export const isSetupScreen = (screen: ShellScreen): screen is SetupScreen =>
  screen === "pick-story" ||
  screen === "game-settings" ||
  screen === "claim-heroes" ||
  screen === "setup" ||
  screen === "begin";
