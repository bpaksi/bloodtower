import { describe, expect, it } from "vitest";
import { isBeforePickGame, isGameChosen, pickLayers } from "./layers.ts";
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

  it("crossfades to the pack's start-up mood once a game is chosen (layer 2)", () => {
    for (const screen of ["party-join", "begin"] as const) {
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

  it("detects the game-chosen moment only when leaving Pick Game", () => {
    expect(isGameChosen("pick-story", "party-join")).toBe(true);
    expect(isGameChosen("pick-story", "pick-story")).toBe(false);
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
