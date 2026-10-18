import { describe, expect, it } from "vitest";
import { captionAtTime, formatBoardCaption, parseVtt, vttPathForAudio } from "./boardCaptions.ts";

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
});
