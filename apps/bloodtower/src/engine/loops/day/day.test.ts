import { describe, expect, it } from "vitest";
import { OPENING_MOMENTS, openingPromptId } from "../../../protocols/opening.ts";
import { initPlayState } from "../chapter/playState.ts";
import type { ShellEvent } from "../session/events.ts";
import { TEST_STORY } from "../session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import { bindShellState, clearShellState } from "../session/shellRef.ts";
import { initialShellState } from "../session/state.ts";
import { stepShell } from "../session/stepShell.ts";
import { MOVE_ROLL_CUE_SOUND_INDEX } from "./cues.ts";
import {
  applySkullRecord,
  offerSkullPlacement,
  parseSkullRecordPrompt,
  skullRecordPromptId,
} from "./skull.ts";

const setupThroughBegin = () => {
  const events: ShellEvent[] = [
    { kind: "start-session" as const, v: 1 as const, sessionId: "t", seed: "cue-test" },
    { kind: "device-join" as const, v: 1 as const, deviceId: "pad" },
    {
      kind: "press" as const,
      v: 1 as const,
      deviceId: "pad",
      promptId: "tower-connect",
      actionId: "tower-connect",
    },
    {
      kind: "press" as const,
      v: 1 as const,
      deviceId: "pad",
      promptId: "tower-calibrate",
      actionId: "tower-calibrate",
    },
    {
      kind: "press" as const,
      v: 1 as const,
      deviceId: "pad",
      promptId: "new-pick-game",
      actionId: "new-game",
    },
    { kind: "focus-story" as const, v: 1 as const, deviceId: "pad", storyId: "test" },
    {
      kind: "press" as const,
      v: 1 as const,
      deviceId: "pad",
      promptId: "continue-pick-story-test",
      actionId: "continue",
    },
    {
      kind: "press" as const,
      v: 1 as const,
      deviceId: "pad",
      promptId: "continue-game-settings",
      actionId: "continue",
    },
    {
      kind: "hero-hold" as const,
      v: 1 as const,
      deviceId: "pad",
      heroId: "hero-a",
      action: "take",
    },
    {
      kind: "hero-hold" as const,
      v: 1 as const,
      deviceId: "pad",
      heroId: "hero-b",
      action: "take",
    },
    {
      kind: "hero-hold" as const,
      v: 1 as const,
      deviceId: "pad",
      heroId: "hero-c",
      action: "take",
    },
    {
      kind: "hero-hold" as const,
      v: 1 as const,
      deviceId: "pad",
      heroId: "hero-d",
      action: "take",
    },
    {
      kind: "press" as const,
      v: 1 as const,
      deviceId: "pad",
      promptId: "continue-claim-heroes",
      actionId: "continue",
    },
    {
      kind: "press" as const,
      v: 1 as const,
      deviceId: "pad",
      promptId: "continue-setup-seals-and-skulls",
      actionId: "continue",
    },
    {
      kind: "press" as const,
      v: 1 as const,
      deviceId: "pad",
      promptId: "continue-setup-lay-out-board",
      actionId: "continue",
    },
    {
      kind: "press" as const,
      v: 1 as const,
      deviceId: "pad",
      promptId: "continue-setup-place-heroes",
      actionId: "continue",
    },
    {
      kind: "press" as const,
      v: 1 as const,
      deviceId: "pad",
      promptId: "continue-begin",
      actionId: "continue",
    },
    ...OPENING_MOMENTS.map((momentId) => ({
      kind: "press" as const,
      v: 1 as const,
      deviceId: "pad",
      promptId: openingPromptId(momentId),
      actionId: "continue" as const,
    })),
  ];
  let state = initialShellState({ sessionId: "t", seed: "cue-test", stories: [TEST_STORY] });
  const towerCues: unknown[] = [];
  for (const event of events) {
    const result = stepShell(state, event);
    state = result.state;
    for (const effect of result.effects) {
      if (effect.kind === "tower-command" && effect.capabilityId === "sound.play-stateful") {
        towerCues.push(effect.params);
      }
    }
  }
  return { state, towerCues };
};

describe("day slice cues and skull record", () => {
  it("emits the move-roll tower cue when the first day starts", () => {
    const { towerCues } = setupThroughBegin();
    expect(towerCues).toContainEqual({
      soundIndex: MOVE_ROLL_CUE_SOUND_INDEX,
      volume: 2,
    });
  });

  it("records skull placement only from a skull-record press", () => {
    const shell = initialShellState({ sessionId: "t", seed: "skull", stories: [TEST_STORY] });
    const play = initPlayState("skull", PROVING_GROUNDS_PLAY);
    play.dayNumber = 1;
    shell.play = play;
    bindShellState(shell);

    const offers: string[] = [];
    offerSkullPlacement(1, {
      offerPrompt: (promptId) => {
        offers.push(promptId);
      },
    });
    expect(offers.length).toBeGreaterThan(10);
    expect(offers).toContain(skullRecordPromptId(1, "inside"));
    expect(play.lastSkull).toBeNull();

    const citadel = play.content.board.spaces.find(
      (s) => s.building === "citadel" && s.kingdom === "E",
    );
    expect(citadel).toBeDefined();
    const parsed = parseSkullRecordPrompt(skullRecordPromptId(1, citadel!.id));
    expect(parsed?.target).toBe(citadel!.id);
    expect(applySkullRecord(1, citadel!.id)).toBe(true);
    expect(play.lastSkull?.spaceId).toBe(citadel!.id);

    clearShellState();
  });
});
