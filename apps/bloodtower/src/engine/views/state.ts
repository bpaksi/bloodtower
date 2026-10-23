import type { ViewScreen } from "../../protocols/v2/common.ts";

export type PrivateLine = {
  id: string;
  text: string;
};

/** A hero at the table. `deviceId` is null until an iPad claims them. */
export type SeatedHero = {
  id: string;
  name: string;
  deviceId: string | null;
  lines: PrivateLine[];
};

export type LoopLevel = {
  id: string;
  label: string;
  /** Public text this level shows. The same string is safe on the board. */
  shows: string;
};

/**
 * An action the engine offers. `deviceId` null means every joined device.
 * The wire view drops `deviceId`: the client sees prompt, action, label, and open or a reason.
 */
export type ViewAction = {
  promptId: string;
  actionId: string;
  label: string;
  deviceId: string | null;
} & ({ open: true } | { open: false; reason: string });

/**
 * What `project` reads. Session and game loops fill this in later steps.
 * It is not the reducer state: step 5 does not change `step`.
 */
export type ViewState = {
  screen: ViewScreen;
  levels: LoopLevel[];
  heroes: SeatedHero[];
  actions: ViewAction[];
  narration: { lineId: string; text: string } | null;
};

export type Audience = { kind: "board" } | { kind: "device"; deviceId: string };
