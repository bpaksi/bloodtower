import { describe, expect, it } from "vitest";
import { displayCaption } from "./caption.ts";

describe("displayCaption", () => {
  it("strips [pause N] tags and collapses the leftover spaces", () => {
    expect(
      displayCaption(
        "A grey stair climbs into the dark. [pause 1] Someone has left the lamps unlit.",
      ),
    ).toBe("A grey stair climbs into the dark. Someone has left the lamps unlit.");
    expect(
      displayCaption("Light them if you can. [pause 0.5] The key is at the bottom. It always is."),
    ).toBe("Light them if you can. The key is at the bottom. It always is.");
    expect(displayCaption("Go on. [pause 0.5] I'll wait.")).toBe("Go on. I'll wait.");
    expect(displayCaption("[pause 1] First.")).toBe("First.");
    expect(displayCaption("Last. [pause 2]")).toBe("Last.");
    expect(displayCaption("Hi [pause 1][pause 0.5] there.")).toBe("Hi there.");
  });

  it("strips parenthetical stage directions", () => {
    expect(displayCaption("Stay close. (whisper) The stair is narrow.")).toBe(
      "Stay close. The stair is narrow.",
    );
  });

  it("leaves copy without a pause tag unchanged", () => {
    expect(displayCaption("No tags here.")).toBe("No tags here.");
    expect(displayCaption("Keep [lamp] brackets that are not a pause.")).toBe(
      "Keep [lamp] brackets that are not a pause.",
    );
    expect(displayCaption("The [paused] film.")).toBe("The [paused] film.");
    expect(displayCaption("Speak [quietly] now.")).toBe("Speak [quietly] now.");
  });
});
