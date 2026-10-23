import boardJson from "../../../../../../packs-v2/base/board/spaces.json" with { type: "json" };
import type { KingdomId } from "../chapter/board.ts";
import { type BoardGraph, type BoardSpaceInput, buildBoardGraph } from "../chapter/board.ts";
import type { PlayContent } from "../chapter/playState.ts";

const kingdoms = [
  { id: "N" as KingdomId, name: "Arisilon", label: "Arisilon (N)" },
  { id: "E" as KingdomId, name: "Brynthia", label: "Brynthia (E)" },
  { id: "S" as KingdomId, name: "Durnin", label: "Durnin (S)" },
  { id: "W" as KingdomId, name: "Zenon", label: "Zenon (W)" },
];

export const PROVING_GROUNDS_BOARD: BoardGraph = buildBoardGraph({
  kingdoms,
  spaces: boardJson.spaces as BoardSpaceInput[],
});

export const PROVING_GROUNDS_PLAY: PlayContent = {
  board: PROVING_GROUNDS_BOARD,
  moveRoll: { dice: "2d4", floor: 2 },
  start: {
    mode: "one-per-kingdom-citadel",
    assignments: [
      { hero: "hero-a", kingdom: "N" },
      { hero: "hero-b", kingdom: "E" },
      { hero: "hero-c", kingdom: "S" },
      { hero: "hero-d", kingdom: "W" },
    ],
  },
};
