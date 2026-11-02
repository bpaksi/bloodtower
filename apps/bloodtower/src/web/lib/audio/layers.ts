import type { ViewScreen } from "bloodtower-protocols";
import { type AudioFile, SIGNATURE } from "./tracks.ts";

export interface Layers {
  ambient: AudioFile | null;
  music: AudioFile | null;
}

export interface LayerInput {
  screen: ViewScreen;
  packId: string | null;
  night?: 1 | 2;
  visual: boolean;
}

export const isVisualMoment = (_moment: unknown): boolean => false;

export const isBeforePickGame = (screen: ViewScreen) =>
  screen === "splash" ||
  screen === "pick-game" ||
  screen === "table-join" ||
  screen === "base-board" ||
  screen === "tower-choice" ||
  screen === "tower-wake";

export const isLanding = (screen: ViewScreen) => isBeforePickGame(screen);

export const DUCK_NONE = 1;
export const DUCK_HARD = 0.05;
export const DUCK_BALANCE = 0.35;

export const duckLevel = (_test: unknown): number => DUCK_NONE;

const signatureOnly = (): Layers => ({ ambient: SIGNATURE.bed, music: null });

export const pickLayers = (input: LayerInput): Layers => {
  if (input.visual) return { ambient: null, music: null };
  if (input.screen === "goodbye") return signatureOnly();
  return { ambient: SIGNATURE.bed, music: null };
};

export const audioPackId = (_state: { screen: ViewScreen }): string | null => "test";

export const isGameChosen = (from: ViewScreen, to: ViewScreen) =>
  from === "pick-story" && to === "game-settings";
