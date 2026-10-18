import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BOARD_CAPTIONS_STORAGE_KEY,
  captionAtTime,
  captionDisplayAtTime,
  formatBoardCaption,
  parseVtt,
  readBoardCaptionsEnabled,
  shouldToggleBoardCaptionsFromKeyboard,
  vttPathForAudio,
  writeBoardCaptionsEnabled,
} from "./boardCaptions.ts";

describe("boardCaptions", () => {
  it("formats the speaker name and strips pause tags from script copy", () => {
    expect(
      formatBoardCaption(
        "The Keeper",
        "Light them if you can. [pause 0.5] The key is at the bottom. It always is.",
      ),
    ).toBe("The Keeper: Light them if you can. The key is at the bottom. It always is.");
  });

  it("maps line audio paths to a sibling vtt file", () => {
    expect(vttPathForAudio("lines/ts-keeper-001.m4a")).toBe("lines/ts-keeper-001.vtt");
  });

  it("parses WEBVTT cues and picks the active cue for a timestamp", () => {
    const cues = parseVtt(`WEBVTT

00:00:00.000 --> 00:00:02.500
Light them if you can.

00:00:02.500 --> 00:00:07.400
The key is at the bottom. It always is.
`);
    expect(cues).toHaveLength(2);
    expect(captionAtTime(cues, 1)?.text).toBe("Light them if you can.");
    expect(captionAtTime(cues, 3)?.text).toBe("The key is at the bottom. It always is.");
    expect(captionAtTime(cues, 8)).toBeUndefined();
  });

  it("strips WebVTT cue settings from the end timestamp", () => {
    const cues = parseVtt(`WEBVTT

00:00:00.000 --> 00:00:02.000 line:80% align:start
First phrase.

00:00:03.000 --> 00:00:06.000 position:50%
Second phrase.
`);
    expect(cues).toHaveLength(2);
    expect(cues[0]?.end).toBe(2);
    expect(cues[1]?.start).toBe(3);
    expect(cues[1]?.end).toBe(6);
  });

  it("holds the last cue in a gap instead of leaving the caption empty", () => {
    const cues = parseVtt(`WEBVTT

00:00:00.000 --> 00:00:02.000
First phrase.

00:00:03.000 --> 00:00:06.000
Second phrase.
`);
    const full = "The Keeper: Full line.";
    expect(captionDisplayAtTime(cues, 2.5, "The Keeper", full)).toBe("The Keeper: First phrase.");
    expect(captionDisplayAtTime(cues, 0.5, "The Keeper", full)).toBe("The Keeper: First phrase.");
    expect(captionDisplayAtTime(cues, 4, "The Keeper", full)).toBe("The Keeper: Second phrase.");
  });

  describe("localStorage", () => {
    const storage = new Map<string, string>();

    afterEach(() => {
      storage.clear();
      vi.unstubAllGlobals();
    });

    it("defaults captions to on when nothing is stored", () => {
      vi.stubGlobal("localStorage", {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
      });
      expect(readBoardCaptionsEnabled()).toBe(true);
    });

    it("persists off and on through read/write helpers", () => {
      vi.stubGlobal("localStorage", {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
      });
      writeBoardCaptionsEnabled(false);
      expect(storage.get(BOARD_CAPTIONS_STORAGE_KEY)).toBe("0");
      expect(readBoardCaptionsEnabled()).toBe(false);
      writeBoardCaptionsEnabled(true);
      expect(readBoardCaptionsEnabled()).toBe(true);
    });
  });

  describe("caption hotkey", () => {
    it("ignores modified C and editable targets", () => {
      expect(
        shouldToggleBoardCaptionsFromKeyboard({
          key: "c",
          ctrlKey: true,
          metaKey: false,
          altKey: false,
          target: null,
        }),
      ).toBe(false);
      expect(
        shouldToggleBoardCaptionsFromKeyboard({
          key: "C",
          ctrlKey: false,
          metaKey: true,
          altKey: false,
          target: null,
        }),
      ).toBe(false);
      expect(
        shouldToggleBoardCaptionsFromKeyboard({
          key: "c",
          ctrlKey: false,
          metaKey: false,
          altKey: true,
          target: null,
        }),
      ).toBe(false);
      expect(
        shouldToggleBoardCaptionsFromKeyboard({
          key: "c",
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          target: null,
        }),
      ).toBe(true);
    });
  });
});
