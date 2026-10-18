import {
  FLOW_SCREENS,
  type FlowScreen,
  KEEPER_MOMENT_ID,
  type StoryboardState,
} from "bloodtower-protocols";
import { type AudioFile, moodFile, SIGNATURE } from "./tracks.ts";

/**
 * Which loop plays on each channel for the screen the board shows (R3-UI-64, layers 1-3).
 * `ambient` carries the beds; `music` carries the waiting music under the waiting dialog.
 * `null` means that channel is silent, which is how a visual zoom-in fades everything out.
 */
export interface Layers {
  ambient: AudioFile | null;
  music: AudioFile | null;
}

export interface LayerInput {
  screen: FlowScreen;
  /**
   * The pack whose moods play: the chosen story from Game settings on (see {@link audioPackId}),
   * otherwise the pack the session is bound to.
   */
  packId: string | null;
  /** Night 1 is the only night in the test pack. Night 2 is picked when a pack has it. */
  night?: 1 | 2;
  /** A visual or cut scene fills the board (see {@link isVisualMoment}). */
  visual: boolean;
}

/**
 * True when a visual or cut scene zooms in: a still, a clip or the Keeper scene. Text and pick
 * cards are the waiting dialog, so the night bed and waiting music keep playing under them
 * (R3-UI-60).
 */
export const isVisualMoment = (moment: StoryboardState["moment"]): boolean =>
  moment !== null &&
  (moment.kind === "still" ||
    moment.kind === "clip" ||
    moment.still !== null ||
    moment.id === KEEPER_MOMENT_ID);

/** Strictly before the Pick Game screen: the Sound dialog opens here (R3-UI-03). */
export const isBeforePickGame = (screen: FlowScreen) =>
  FLOW_SCREENS.indexOf(screen) < FLOW_SCREENS.indexOf("pick-story");

const signatureOnly = (): Layers => ({ ambient: SIGNATURE.bed, music: null });

export const pickLayers = (input: LayerInput): Layers => {
  if (input.screen === "quit") return signatureOnly();
  if (input.screen === "play") {
    if (input.visual) return { ambient: null, music: null };
    const mood = input.night === 2 ? "night-2" : "night-1";
    return {
      ambient: moodFile(input.packId, mood) ?? SIGNATURE.bed,
      music: moodFile(input.packId, "waiting") ?? null,
    };
  }
  // The landing, the Sound dialog, Pick Game and Not playable yet all play the signature bed
  // (layer 1). Not playable yet binds no pack, so no game plays its mood.
  if (
    isBeforePickGame(input.screen) ||
    input.screen === "pick-story" ||
    input.screen === "not-playable"
  ) {
    return signatureOnly();
  }
  // Game settings, Connect Tower, Claim Hunters and setup: the pack's start-up mood (layer 2).
  return {
    ambient: moodFile(input.packId, "startup") ?? SIGNATURE.bed,
    music: null,
  };
};

/**
 * The pack the board's moods come from. From Game settings on it is the chosen story, which a
 * `playable: false` pack can be without being bound; with no moods it falls back to the signature.
 */
export const audioPackId = (state: StoryboardState): string | null =>
  state.gameSettings?.story ?? state.packId ?? null;

/**
 * True on the one transition that means a game was chosen: Pick Game to Game settings.
 * Back to Pick Game is not a choice.
 */
export const isGameChosen = (from: FlowScreen | null, to: FlowScreen): boolean =>
  from === "pick-story" && to === "game-settings";
