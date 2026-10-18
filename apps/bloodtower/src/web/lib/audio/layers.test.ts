import type { StoryboardState } from "bloodtower-protocols";
import { KEEPER_MOMENT_ID } from "bloodtower-protocols";
import { describe, expect, it } from "vitest";
import {
  audioPackId,
  DUCK_BALANCE,
  DUCK_HARD,
  DUCK_NONE,
  duckLevel,
  isBeforePickGame,
  isGameChosen,
  isLanding,
  isVisualMoment,
  pickLayers,
} from "./layers.ts";
import { moodFile, SIGNATURE } from "./tracks.ts";

const base = { packId: "test", visual: false } as const;

describe("duckLevel (the bed gives way to the tower, R3-UI-60)", () => {
  const test = (phase: string, mode = "tower") =>
    ({
      mode,
      phase,
      level: phase === "levels" ? 1 : null,
      runs: 1,
      failed: false,
      answer: null,
      logged: null,
    }) as NonNullable<StoryboardState["volumeTest"]>;

  it("ducks hard while a level plays and partly while the tower plays over the room sound", () => {
    expect(duckLevel(test("levels"))).toBe(DUCK_HARD);
    expect(duckLevel(test("balance-tower"))).toBe(DUCK_BALANCE);
    expect(DUCK_HARD).toBeLessThan(DUCK_BALANCE);
    expect(DUCK_BALANCE).toBeLessThan(DUCK_NONE);
  });

  it("leaves the room sound alone when the tower is silent, and with no tower at all", () => {
    for (const phase of ["idle", "balance-bed", "asking", "answered"]) {
      expect(duckLevel(test(phase))).toBe(DUCK_NONE);
    }
    expect(duckLevel(test("levels", "room"))).toBe(DUCK_NONE);
    expect(duckLevel(null)).toBe(DUCK_NONE);
    expect(duckLevel(undefined)).toBe(DUCK_NONE);
  });

  it("keeps the start-up bed under the volume test", () => {
    expect(pickLayers({ ...base, screen: "tower-volume-test" })).toEqual({
      ambient: moodFile("test", "startup"),
      music: null,
    });
  });
});

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
    // Connect Tower now follows Game settings, so it plays the start-up mood too.
    for (const screen of ["game-settings", "tower-connect", "party-join", "begin"] as const) {
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

  it("places only the splash strictly before Pick Game", () => {
    expect(isBeforePickGame("splash")).toBe(true);
    expect(isBeforePickGame("tower-connect")).toBe(false);
    expect(isBeforePickGame("pick-story")).toBe(false);
    expect(isBeforePickGame("party-join")).toBe(false);
  });

  it("treats splash and Pick Game as the landing, where the first input opens the Sound dialog", () => {
    // Splash goes straight to Pick Game; Connect Tower now follows Game settings.
    expect(isLanding("splash")).toBe(true);
    expect(isLanding("pick-story")).toBe(true);
    for (const screen of [
      "game-settings",
      "not-playable",
      "tower-connect",
      "party-join",
      "begin",
      "play",
      "quit",
    ] as const) {
      expect(isLanding(screen)).toBe(false);
    }
  });
});
