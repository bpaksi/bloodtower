import type { VolumeAnswer, VolumeTest } from "bloodtower-protocols";

/** Neutral wording: no quiet or loud names, because the library's tier order is unconfirmed. */
export const VOLUME_ANSWER_LABEL: Record<VolumeAnswer, string> = {
  "all-differ": "All three differ",
  "one-louder": "Only one level is louder",
  "all-same": "All the same",
  "write-in": "Something else",
};

export const VOLUME_QUESTION = "Did the levels sound different?";

/** The board's heading and the line under it for the current phase. */
export const volumeBoardCopy = (test: VolumeTest): { title: string; line: string } => {
  if (test.mode === "room") {
    return {
      title: "Check the room sound",
      line: "No tower is connected, so no tower sound plays. You should hear the start-up bed now. If you can't, reload the board to open the Sound dialog.",
    };
  }
  switch (test.phase) {
    case "levels":
      return {
        title: `Level ${test.level ?? 0}`,
        line: "The tower plays one sound at a time. Listen for how each level sounds.",
      };
    case "balance-bed":
      return { title: "Tower over the room sound", line: "Listen to the room sound first." };
    case "balance-tower":
      return { title: "Tower over the room sound", line: "The tower plays once over the room." };
    case "asking":
      return { title: VOLUME_QUESTION, line: "Answer on an iPad. First answer counts." };
    case "answered":
      return {
        title: "Thank you.",
        line: test.answer ? `Answered: ${VOLUME_ANSWER_LABEL[test.answer]}.` : "Answered.",
      };
    default:
      return {
        title: "Tower volume test",
        line: test.failed
          ? "The tower did not play that sound. Nothing was sent again. Press Play levels to try once more, or continue."
          : "The tower plays one sound at three levels. Press Play levels on an iPad. You can also skip this test.",
      };
  }
};

/** The tower is playing or about to: Continue waits, and so does the answer. */
export const volumeIsPlaying = (test: VolumeTest): boolean =>
  test.phase === "levels" || test.phase === "balance-bed" || test.phase === "balance-tower";
