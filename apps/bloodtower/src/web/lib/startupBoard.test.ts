import type { BoardView } from "bloodtower-protocols";
import { describe, expect, it } from "vitest";
import { doorFrame, sessionBoard, storyDoors } from "./startupBoard.ts";

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

describe("session board (C2/06)", () => {
  const session = (levels: BoardView["levels"]): BoardView =>
    ({ screen: "session", levels, heroes: [], narration: null, actions: [] }) as BoardView;

  it("reads Continue, the games newest first, and the tower line", () => {
    const read = sessionBoard(
      session([
        { id: "session-continue", label: "Continue", shows: "A saved game can continue." },
        { id: "session-games", label: "Tonight's games", shows: "Game 2 quit\nGame 1 quit" },
        { id: "session", label: "Session", shows: "Tower lost" },
      ]),
    );
    expect(read.hasContinue).toBe(true);
    expect(read.games).toEqual([
      { label: "Game 2", mark: "quit" },
      { label: "Game 1", mark: "quit" },
    ]);
    expect(read.tower).toBe("Tower lost");
    expect(read.confirm).toBeNull();
    expect(read.dropped).toBeNull();
  });

  it("has no Continue and no rows on a fresh evening", () => {
    const read = sessionBoard(
      session([
        { id: "session-games", label: "Tonight's games", shows: "No games yet tonight." },
        { id: "session", label: "Session", shows: "without the tower" },
      ]),
    );
    expect(read.hasContinue).toBe(false);
    expect(read.games).toEqual([]);
    expect(read.tower).toBe("without the tower");
  });

  it("reads a question and the all-dropped join line", () => {
    const asked = sessionBoard(
      session([
        { id: "session-confirm", label: "Done for tonight", shows: "Are you sure?" },
        { id: "session", label: "Session", shows: "Are you sure?" },
      ]),
    );
    expect(asked.confirm).toEqual({ title: "Done for tonight", line: "Are you sure?" });
    const dropped = sessionBoard(
      session([
        { id: "session-dropped", label: "Join", shows: "Scan with each iPad." },
        { id: "session", label: "Session", shows: "tower: in play" },
      ]),
    );
    expect(dropped.dropped).toBe("Scan with each iPad.");
  });
});
