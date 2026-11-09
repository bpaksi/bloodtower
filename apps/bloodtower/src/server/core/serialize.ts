import { type BoardGraph, buildBoardGraph } from "../../engine/loops/chapter/board.ts";
import type { PlayContent, PlayState } from "../../engine/loops/chapter/playState.ts";
import { captureClock, type DayClock, restoreClock } from "../../engine/loops/day/clock.ts";
import { createShellRegistry } from "../../engine/loops/session/registry.ts";
import {
  SHELL_ENGINE_VERSION,
  type ShellState,
  type TonightGame,
} from "../../engine/loops/session/state.ts";
import { OPENING_MOMENTS } from "../../protocols/opening.ts";

/** JSON-safe shell state for checkpoint rows (no registry, devices as a list). */
export type SerializedShellState = Omit<ShellState, "devices" | "registry"> & {
  devices: string[];
  /** The day clock lives beside `play`, not on it. A checkpoint from before C3 EV-19 has none. */
  dayClock?: DayClock | null;
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

const rehydratePlay = (play: PlayState, dayClock: DayClock | null | undefined): PlayState => {
  const rebuilt: PlayState = { ...play, content: rehydratePlayContent(play.content) };
  if (dayClock) restoreClock(rebuilt, dayClock);
  return rebuilt;
};

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
    dayClock: play ? captureClock(play) : null,
  };
};

/** A game listed by C2/06 has no stats or start: its counts are not known, never zero. */
const upgradeGame = (row: SerializedShellState, game: Partial<TonightGame>): TonightGame => ({
  gameId: game.gameId ?? "",
  outcome: game.outcome ?? "quit",
  storyId: game.storyId ?? row.boundStoryId,
  settingValues: game.settingValues ?? {},
  holdings: game.holdings ?? {},
  day: game.day ?? null,
  moves: game.moves ?? null,
  buildings: game.buildings ?? null,
  skulls: game.skulls ?? null,
  rating: game.rating ?? null,
});

export const deserializeShellState = ({ dayClock, ...row }: SerializedShellState): ShellState => ({
  ...row,
  version: SHELL_ENGINE_VERSION,
  towerLinked: row.towerLinked ?? false,
  // A checkpoint from before C2/08 never went on without the tower.
  towerWithout: row.towerWithout ?? false,
  // A Reconnect does not survive a restart; the pause it began from stays.
  reconnect: null,
  screen: row.reconnect && row.pause ? "pause" : row.screen,
  // A checkpoint from before C2/05 has no Enter state: it was taken after the old tower block.
  enter: row.enter ?? null,
  enterThen: row.enterThen ?? null,
  continueRequested: false,
  // A checkpoint from before C2/06 has no list of tonight's games.
  games: (row.games ?? []).map((game) => upgradeGame(row, game)),
  confirm: null,
  statsGame: null,
  playAgain: row.playAgain ?? false,
  // A checkpoint from before C2/07 has no counts for its game.
  tally: row.tally ?? { moves: null, buildings: null, skulls: null, skullDay: null },
  towerChoice: row.towerChoice ?? (row.towerLinked ? "connect" : "without"),
  openingIndex: typeof row.openingIndex === "number" ? row.openingIndex : OPENING_MOMENTS.length,
  // Browser audio does not survive a reload, so every iPad taps Enable sound again.
  sound: {},
  keptVolume: null,
  towerVolume:
    row.towerVolume === 0 || row.towerVolume === 1 || row.towerVolume === 2 ? row.towerVolume : 1,
  partySplit: false,
  gearPanel: null,
  gearOwner: null,
  gearPaused: false,
  gearPicked: null,
  gearCard: null,
  gearPreviewVolume: null,
  gearFirstHero: null,
  gearSecondHero: null,
  gearPieceChecks: 0,
  gearOpens: 0,
  devices: new Set(row.devices),
  registry: createShellRegistry(),
  playContent: row.playContent ? rehydratePlayContent(row.playContent) : null,
  play: row.play ? rehydratePlay(row.play, dayClock) : null,
});
