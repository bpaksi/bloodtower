import type { BoardView } from "bloodtower-protocols";
import { describe, expect, it } from "vitest";
import { doorFrame, storyDoors } from "./startupBoard.ts";

const view = (levels: BoardView["levels"]): BoardView =>
  ({
    screen: "pick-story",
    levels,
    heroes: [],
    narration: null,
    actions: [],
  }) as BoardView;

describe("story doors", () => {
  it("reads an empty player line and an optional cover", () => {
    const doors = storyDoors(
      view([
        {
          id: "door-dracula",
          label: "The Count of Vellmoor",
          shows:
            "A door\nThe Count has taken Lenka. Bring her home before she's his.\n\nNot playable yet\n/packs/dracula/assets/cover.png",
        },
        {
          id: "door-test",
          label: "Proving Grounds",
          shows: "In focus\nAREA-077 day slice\n1\u20134 players\nPlayable",
        },
      ]),
    );
    expect(doors).toEqual([
      {
        id: "dracula",
        title: "The Count of Vellmoor",
        tagline: "The Count has taken Lenka. Bring her home before she's his.",
        players: "",
        playable: false,
        focused: false,
        cover: "/packs/dracula/assets/cover.png",
      },
      {
        id: "test",
        title: "Proving Grounds",
        tagline: "AREA-077 day slice",
        players: "1\u20134 players",
        playable: true,
        focused: true,
        cover: null,
      },
    ]);
    const frame = doorFrame(doors);
    expect(frame.focus?.id).toBe("test");
    expect(frame.previous).toBeNull();
    expect(frame.next?.id).toBe("dracula");
  });
});
