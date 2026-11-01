import { type BoardGraph, buildBoardGraph } from "../../engine/loops/chapter/board.ts";
import type { PlayContent, PlayState } from "../../engine/loops/chapter/playState.ts";
import { createShellRegistry } from "../../engine/loops/session/registry.ts";
import { SHELL_ENGINE_VERSION, type ShellState } from "../../engine/loops/session/state.ts";
import { OPENING_MOMENTS } from "../../protocols/opening.ts";

/** JSON-safe shell state for checkpoint rows (no registry, devices as a list). */
export type SerializedShellState = Omit<ShellState, "devices" | "registry"> & {
  devices: string[];
};

/** `JSON.stringify` turns a `Map` into `{}`; keep only the `spaces` list on disk. */
const boardForJson = (board: BoardGraph): Omit<BoardGraph, "spaceById"> => ({
  kingdoms: board.kingdoms,
  spaces: board.spaces,
});

const rehydrateBoard = (
  board: Omit<BoardGraph, "spaceById"> & { spaceById?: unknown },
): BoardGraph => buildBoardGraph({ kingdoms: board.kingdoms, spaces: board.spaces });

const rehydratePlayContent = (content: PlayContent): PlayContent => ({
  ...content,
  board: rehydrateBoard(content.board as BoardGraph),
});

const rehydratePlay = (play: PlayState): PlayState => ({
  ...play,
  content: rehydratePlayContent(play.content),
});

export const serializeShellState = (state: ShellState): SerializedShellState => {
  const { devices, registry: _registry, play, playContent, ...rest } = state;
  return {
    ...rest,
    devices: [...devices],
    playContent: playContent
      ? { ...playContent, board: boardForJson(playContent.board) as BoardGraph }
      : null,
    play: play
      ? {
          ...play,
          content: {
            ...play.content,
            board: boardForJson(play.content.board) as BoardGraph,
          },
        }
      : null,
  };
};

export const deserializeShellState = (row: SerializedShellState): ShellState => ({
  ...row,
  version: SHELL_ENGINE_VERSION,
  towerLinked: row.towerLinked ?? false,
  // A checkpoint from before C2/05 has no Enter state: it was taken after the old tower block.
  enter: row.enter ?? null,
  towerChoice: row.towerChoice ?? (row.towerLinked ? "connect" : "without"),
  openingIndex: typeof row.openingIndex === "number" ? row.openingIndex : OPENING_MOMENTS.length,
  goodbyeTower: row.goodbyeTower ?? null,
  devices: new Set(row.devices),
  registry: createShellRegistry(),
  playContent: row.playContent ? rehydratePlayContent(row.playContent) : null,
  play: row.play ? rehydratePlay(row.play) : null,
});
