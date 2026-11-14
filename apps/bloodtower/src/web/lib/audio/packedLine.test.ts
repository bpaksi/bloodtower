import type { BoardView } from "bloodtower-protocols";
import { describe, expect, it } from "vitest";
import {
  afterVoiceMs,
  CAPTION_HOLD_MS,
  captionOnlyMs,
  packedFileUrl,
  playOnView,
  type SeenPlay,
} from "./packedLine.ts";

type PackedLine = NonNullable<BoardView["packedLine"]>;

const LINE_ID = "seal-break.01~vo-01";
const line = (play: number): PackedLine => ({
  packId: "test",
  lineId: LINE_ID,
  caption: "The roads are clear.",
  audio: LINE_ID,
  painting: "painting.cover",
  glow: "glow.cover",
  play,
});

/** Feeds host views through `playOnView` as the board does, and returns the plays it started. */
const run = (views: (PackedLine | null | undefined)[], seen: SeenPlay = undefined) => {
  const started: number[] = [];
  let current = seen;
  for (const view of views) {
    const next = playOnView(current, view);
    if (next.start) started.push(next.start.play);
    current = next.seen;
  }
  return started;
};

describe("A1-8b-2: the board plays a packed line only when it sees the play start", () => {
  it("plays once when a play appears after the board has its first view (EV-01)", () => {
    expect(run([null, line(1)])).toEqual([1]);
    expect(run([undefined, line(1), line(1), line(1)])).toEqual([1]);
  });

  it("does not play a line already on the first view after a load or reload (EV-11)", () => {
    expect(run([line(1)])).toEqual([]);
    expect(run([line(1), line(1), line(1)])).toEqual([]);
  });

  it("plays an explicit replay after a reload, once (EV-11)", () => {
    expect(run([line(1), line(1), line(2), line(2)])).toEqual([2]);
  });

  it("plays each new play number once", () => {
    expect(run([null, line(1), line(2), line(2), line(3)])).toEqual([1, 2, 3]);
  });

  it("after a host restart (no line, then a new play 1) plays the new one", () => {
    expect(run([null, line(1), null, line(1)])).toEqual([1, 1]);
  });
});

describe("A1-8b-2: packed files are fetched by asset id, never carried in a message", () => {
  it("builds the by-id route on the session host", () => {
    expect(packedFileUrl("test", LINE_ID, "http://127.0.0.1:4788")).toBe(
      "http://127.0.0.1:4788/packs/test/by-id/seal-break.01~vo-01",
    );
    expect(packedFileUrl("test", "painting.cover", "")).toBe("/packs/test/by-id/painting.cover");
  });
});

describe("A1-8b-2 EV-05: caption only stays on screen long enough to read", () => {
  it("holds a caption with no audio for a reading time, within bounds", () => {
    const caption =
      "The roads are clear, and a seal breaks like an old oath giving way. Ahead stands the Ruined Keep.";
    expect(captionOnlyMs(caption)).toBeGreaterThanOrEqual(6000);
    expect(captionOnlyMs("Go.")).toBe(4000);
    expect(captionOnlyMs("A".repeat(500))).toBe(12000);
    expect(CAPTION_HOLD_MS).toBeGreaterThan(0);
  });
});

describe("A1-8b-2: after the voice the caption stays until it has been readable", () => {
  it("keeps the rest of the reading time after a short voice, and the hold after a long one", () => {
    const caption = "A".repeat(100);
    expect(afterVoiceMs(caption, 1000)).toBe(captionOnlyMs(caption) - 1000);
    expect(afterVoiceMs(caption, 60_000)).toBe(CAPTION_HOLD_MS);
  });
});
