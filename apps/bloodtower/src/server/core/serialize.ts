import { type BoardGraph, buildBoardGraph } from "../../engine/loops/chapter/board.ts";
import {
  type ChapterStore,
  restoreChapters,
  snapshotChapters,
  tryChapters,
} from "../../engine/loops/chapter/chapters.ts";
import type { PlayContent, PlayState } from "../../engine/loops/chapter/playState.ts";
import { captureClock, type DayClock, restoreClock } from "../../engine/loops/day/clock.ts";
import {
  type PicksStore,
  picksSaved,
  restorePicksStore,
} from "../../engine/loops/encounter/picks.ts";
import { captureEventState, restoreEventState } from "../../engine/loops/event/index.ts";
import { type QuestStore, restoreQuests, snapshotQuests } from "../../engine/loops/quest/store.ts";
import { normalizeDrumPositions } from "../../engine/loops/session/pieceCheck.ts";
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
  /** The event scene's state (C3/12) lives beside `play` too. A save from before it has none. */
  eventState?: unknown;
  /**
   * The building picks (C3/13): the free cures used, the virtue tiles held and a give-back owed.
   * A checkpoint from before C3/13 has none: a game that never used the building menu has none to
   * keep, and the store starts blank.
   */
  picks?: PicksStore | null;
  /**
   * The quest store (F1/02): the open markers, each quest's progress, the done list and the items.
   * A checkpoint from before F1/02 has none, and the store starts blank.
   */
  quests?: QuestStore | null;
  /**
   * The chapter store (F1/03): the plan, the chapter now running and what has run. A checkpoint
   * from before F1/03 has none, and the game restores with no chapter store (DEC-949).
   */
  chapters?: ChapterStore | null;
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

const rehydratePlay = (
  play: PlayState,
  dayClock: DayClock | null | undefined,
  picks: PicksStore | null | undefined,
  quests: QuestStore | null | undefined,
  saved?: unknown,
  chapters?: ChapterStore | null,
): PlayState => {
  const rebuilt: PlayState = { ...play, content: rehydratePlayContent(play.content) };
  if (dayClock) restoreClock(rebuilt, dayClock);
  if (picks) restorePicksStore(rebuilt, picks);
  if (quests) restoreQuests(rebuilt, JSON.stringify(quests));
  if (chapters) restoreChapters(rebuilt, JSON.stringify(chapters));
  if (saved) restoreEventState(rebuilt, saved);
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
    eventState: play ? captureEventState(play) : null,
    picks: play ? picksSaved(play) : null,
    quests: play ? (JSON.parse(snapshotQuests(play)) as QuestStore) : null,
    chapters:
      play && tryChapters(play) ? (JSON.parse(snapshotChapters(play)) as ChapterStore) : null,
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

export const deserializeShellState = ({
  dayClock,
  eventState: savedEvents,
  picks,
  quests,
  chapters,
  ...row
}: SerializedShellState): ShellState => ({
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
  // Each iPad starts its volume step again after a restart; nothing plays on its own.
  sound: {},
  keptVolume: null,
  towerVolume:
    row.towerVolume === 0 || row.towerVolume === 1 || row.towerVolume === 2 ? row.towerVolume : 1,
  // A checkpoint written before C2-11 has no drums field: reads as calibrated home (0, 0, 0).
  drums: normalizeDrumPositions(row.drums),
  pieceCheck: row.pieceCheck ?? null,
  unconfirmedPieces: Array.isArray(row.unconfirmedPieces) ? [...row.unconfirmedPieces] : [],
  partySplit: false,
  // A checkpoint from before CU/09 has no hint record: nothing shown yet, and Hints is on (an
  // absent `hints` setting reads as on). A hint that was on the board is not kept: it was shown.
  hintsShown: row.hintsShown ?? [],
  // A checkpoint from before CU/15 has no purse: it was never spun. The cue never survives a restart.
  startingPurse: row.startingPurse ?? null,
  purseCue: 0,
  hint: null,
  hintQueue: [],
  hintHold: null,
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
  play: row.play ? rehydratePlay(row.play, dayClock, picks, quests, savedEvents, chapters) : null,
});
