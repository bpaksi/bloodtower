import type { CommandLifecyclePayload, SoundFeelRow } from "tower-poc-protocols";
import { describe, expect, it } from "vitest";
import {
  feelByIndex,
  followPlay,
  hasFeel,
  lengthLabel,
  measure,
  type PlayTiming,
  reviewFilter,
} from "./soundReview.ts";

const stage = (name: CommandLifecyclePayload["stage"]): CommandLifecyclePayload => ({
  commandId: "c1",
  capabilityId: "sound.play",
  clientId: "me",
  stage: name,
  at: 0,
});

const pressed: PlayTiming = { index: 12, commandId: "c1", pressedAt: 1_000 };

const row = (index: number, fields: Partial<SoundFeelRow> = {}): SoundFeelRow => ({
  index,
  lengthMs: null,
  answerLengthMs: null,
  mood: null,
  readsAs: null,
  strength: null,
  note: null,
  updatedAt: 0,
  client: "me",
  ...fields,
});

describe("sound review timing", () => {
  it("has nothing to stop before Play, and keeps the press while the tower has not answered", () => {
    expect(followPlay(undefined, [stage("queued")], 2_000)).toBeUndefined();
    expect(followPlay(pressed, undefined, 2_000)).toBe(pressed);
    expect(followPlay(pressed, [stage("queued"), stage("started")], 2_000)).toEqual(pressed);
  });

  it("notes the tower's answer once, when the play is confirmed", () => {
    const answered = followPlay(pressed, [stage("queued"), stage("confirmed")], 1_400);
    expect(answered).toEqual({ ...pressed, answeredAt: 1_400 });
    expect(followPlay(answered, [stage("queued"), stage("confirmed")], 9_000)).toBe(answered);
  });

  it("ends the timing when no sound played", () => {
    expect(followPlay(pressed, [stage("rejected")], 2_000)).toBeUndefined();
    expect(followPlay(pressed, [stage("queued"), stage("failed")], 2_000)).toBeUndefined();
  });

  it("keeps an indeterminate play timed, as it may have sounded, with no answer to time from", () => {
    const timed = followPlay(pressed, [stage("queued"), stage("indeterminate")], 2_000);
    expect(timed).toEqual(pressed);
    expect(timed && measure(timed, 3_500)).toEqual({
      ok: true,
      lengthMs: 2_500,
      answerLengthMs: null,
    });
  });

  it("records both lengths from the same play", () => {
    expect(measure({ ...pressed, answeredAt: 1_300 }, 3_800)).toEqual({
      ok: true,
      lengthMs: 2_800,
      answerLengthMs: 2_500,
    });
  });

  it("never records a length of 0, and refuses one over a minute", () => {
    expect(measure({ ...pressed, answeredAt: 1_000 }, 1_000)).toEqual({
      ok: true,
      lengthMs: 1,
      answerLengthMs: 1,
    });
    expect(measure(pressed, 61_000)).toEqual({ ok: true, lengthMs: 60_000, answerLengthMs: null });
    expect(measure(pressed, 61_001).ok).toBe(false);
  });
});

describe("sound review list", () => {
  it("counts a sound as reviewed once any feel field is set", () => {
    expect(hasFeel(undefined)).toBe(false);
    expect(hasFeel(row(1))).toBe(false);
    expect(hasFeel(row(1, { note: "a bell" }))).toBe(true);
    expect(hasFeel(row(1, { lengthMs: 900 }))).toBe(true);
  });

  it("leaves out reviewed sounds only when asked, keeping the one under review", () => {
    const sounds = [{ index: 1 }, { index: 2 }, { index: 3 }];
    const feel = feelByIndex([row(1, { mood: "dread" }), row(2, { mood: "calm" }), row(3)]);
    expect(reviewFilter(sounds, feel, false, undefined)).toEqual(sounds);
    expect(reviewFilter(sounds, feel, true, undefined)).toEqual([{ index: 3 }]);
    expect(reviewFilter(sounds, feel, true, 2)).toEqual([{ index: 2 }, { index: 3 }]);
  });

  it("shows a length in seconds, a short one in ms so it never reads as 0, and nothing for one not measured", () => {
    expect(lengthLabel(2_345)).toBe("2.3 s");
    expect(lengthLabel(40)).toBe("40 ms");
    expect(lengthLabel(999)).toBe("999 ms");
    expect(lengthLabel(null)).toBeUndefined();
    expect(lengthLabel(undefined)).toBeUndefined();
  });
});
