import type { StoryboardState } from "bloodtower-protocols";
import { KEEPER_MOMENT_ID } from "bloodtower-protocols";
import { describe, expect, it } from "vitest";
import {
  audioPackId,
  isBeforePickGame,
  isGameChosen,
  isVisualMoment,
  pickLayers,
} from "./layers.ts";
import { moodFile, SIGNATURE } from "./tracks.ts";

const base = { packId: "test", visual: false } as const;

describe("pickLayers (stage to file)", () => {
  it("plays the signature bed from the landing screen through Pick Game (layer 1)", () => {
    expect(pickLayers({ ...base, screen: "splash" })).toEqual({
      ambient: SIGNATURE.bed,
      music: null,
    });
    expect(pickLayers({ ...base, screen: "pick-story" })).toEqual({
      ambient: SIGNATURE.bed,
      music: null,
    });
  });

  it("keeps the signature bed on Not playable yet, since no pack is bound", () => {
    expect(pickLayers({ ...base, screen: "not-playable" })).toEqual({
      ambient: SIGNATURE.bed,
      music: null,
    });
  });

  it("crossfades to the pack's start-up mood once a game is chosen (layer 2)", () => {
    for (const screen of ["game-settings", "party-join", "begin"] as const) {
      expect(pickLayers({ ...base, screen })).toEqual({
        ambient: moodFile("test", "startup"),
        music: null,
      });
    }
  });

  it("plays night 1 as the bed and the waiting music under the waiting dialog (layer 3)", () => {
    expect(pickLayers({ ...base, screen: "play" })).toEqual({
      ambient: moodFile("test", "night-1"),
      music: moodFile("test", "waiting"),
    });
  });

  it("swaps the night bed for night 2 when the pack has it, and keeps the waiting music", () => {
    const night2 = pickLayers({ ...base, screen: "play", night: 2 });
    expect(night2.ambient).toEqual(moodFile("test", "night-2"));
    expect(night2.music).toEqual(moodFile("test", "waiting"));
    expect(night2.ambient).not.toEqual(pickLayers({ ...base, screen: "play" }).ambient);
  });

  it("silences both channels while a moment is on the board, so the bed fades out", () => {
    expect(pickLayers({ ...base, screen: "play", visual: true })).toEqual({
      ambient: null,
      music: null,
    });
  });

  it("counts stills, clips and the Keeper scene as visuals, and cards as the waiting dialog", () => {
    const moment = (
      over: Partial<NonNullable<StoryboardState["moment"]>>,
    ): StoryboardState["moment"] => ({
      id: "proving-ground.01",
      kind: "text-card",
      text: "The gate opens.",
      still: null,
      fallbackAudio: null,
      ...over,
    });
    expect(isVisualMoment(null)).toBe(false);
    expect(isVisualMoment(moment({}))).toBe(false);
    expect(isVisualMoment(moment({ kind: "pick-card" }))).toBe(false);
    expect(isVisualMoment(moment({ kind: "still", still: "img.gate" }))).toBe(true);
    expect(isVisualMoment(moment({ kind: "clip" }))).toBe(true);
    expect(isVisualMoment(moment({ still: "img.gate" }))).toBe(true);
    expect(isVisualMoment(moment({ id: KEEPER_MOMENT_ID }))).toBe(true);
  });

  it("falls back to the signature bed for a pack with no moods", () => {
    expect(pickLayers({ screen: "begin", packId: "nomoods", visual: false })).toEqual({
      ambient: SIGNATURE.bed,
      music: null,
    });
    expect(pickLayers({ screen: "play", packId: "nomoods", visual: false })).toEqual({
      ambient: SIGNATURE.bed,
      music: null,
    });
  });

  it("keeps the signature bed on Game settings for a pack with no moods", () => {
    expect(pickLayers({ ...base, packId: "dracula", screen: "game-settings" })).toEqual({
      ambient: SIGNATURE.bed,
      music: null,
    });
  });

  it("takes the moods from the chosen story from Game settings on, else the bound pack", () => {
    const state = (gameSettings: StoryboardState["gameSettings"]) =>
      ({ packId: "test", gameSettings }) as StoryboardState;
    expect(audioPackId(state(null))).toBe("test");
    expect(audioPackId(state({ story: "dracula", settings: [], chosen: {} }))).toBe("dracula");
    expect(audioPackId({ packId: undefined } as StoryboardState)).toBeNull();
  });

  it("detects the game-chosen moment only when leaving Pick Game for Game settings", () => {
    expect(isGameChosen("pick-story", "game-settings")).toBe(true);
    expect(isGameChosen("game-settings", "party-join")).toBe(false);
    expect(isGameChosen("game-settings", "pick-story")).toBe(false);
    expect(isGameChosen("pick-story", "pick-story")).toBe(false);
    expect(isGameChosen("pick-story", "not-playable")).toBe(false);
    expect(isGameChosen("not-playable", "pick-story")).toBe(false);
    expect(isGameChosen("splash", "pick-story")).toBe(false);
    expect(isGameChosen(null, "tower-connect")).toBe(false);
  });

  it("opens the Sound dialog only before Pick Game, never on or after it", () => {
    expect(isBeforePickGame("splash")).toBe(true);
    expect(isBeforePickGame("tower-connect")).toBe(true);
    expect(isBeforePickGame("pick-story")).toBe(false);
    expect(isBeforePickGame("party-join")).toBe(false);
  });
});
