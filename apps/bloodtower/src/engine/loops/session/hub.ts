import { hashSeed } from "@dark-tower/rng";
import type { EngineEffect } from "../../effects.ts";
import { refreshSetupSteps } from "../game/setupFlow.ts";
import type { ShellEffect } from "./effects.ts";
import { emptyTally, initialHoldings, type ShellState, type TonightGame } from "./state.ts";
import { towerReady } from "./tower.ts";

/** The session screen's presses (SCR-021). One press each, from any joined iPad (DEC-278). */
export const CONTINUE_PROMPT = "continue-saved-game";
export const NEW_GAME_PROMPT = "session-new-game";
export const NEW_GAME_CONFIRM_PROMPT = "session-new-confirm";
export const DONE_PROMPT = "session-done-tonight";
export const DONE_CONFIRM_PROMPT = "session-done-confirm";
export const CONFIRM_BACK_PROMPT = "session-confirm-back";
/** A row in Tonight's games. A press opens that game's stats (SCR-021, SCR-019). */
export const GAME_ROW_PREFIX = "session-game-";
/** The stats screen's two presses, and Yes on the replace-save question (DEC-708, DEC-709). */
export const STATS_PLAY_AGAIN_PROMPT = "stats-play-again";
export const STATS_BACK_PROMPT = "stats-back";
export const PLAY_AGAIN_CONFIRM_PROMPT = "session-play-again-confirm";
/** The optional 1 to 5 fun rating is a setting on the stats screen; it never blocks (SCR-019). */
export const RATING_SETTING = "fun-rating";
export const RATING_LABEL = "How was tonight?";
export const RATING_UNSET = "none";
export const RATING_OPTIONS = ["1", "2", "3", "4", "5"] as const;

export const REPLACE_SAVE_LINE = "This replaces the saved game. Are you sure?";
export const PLAY_AGAIN_TITLE = "Play again?";
export const PLAY_AGAIN_LINE = "Same heroes, a fresh board.";
export const UNAVAILABLE = "unavailable";
/** A quit game has no time played to show (Bob 2026-10-31). */
export const NO_TIME_PLAYED = "—";
export const DONE_LINE = "Are you sure?";
export const EMPTY_GAMES_LINE = "No games yet tonight.";
export const SESSION_OVER_LINE = "The session is over";

export const TOWER_IN_PLAY = "tower: in play";
export const TOWER_WITHOUT = "without the tower";
export const TOWER_LOST = "Tower lost";

export type HubOffer = { promptId: string; actionId: string };

const HUB_PROMPTS = new Set([
  CONTINUE_PROMPT,
  NEW_GAME_PROMPT,
  NEW_GAME_CONFIRM_PROMPT,
  DONE_PROMPT,
  DONE_CONFIRM_PROMPT,
  CONFIRM_BACK_PROMPT,
  STATS_PLAY_AGAIN_PROMPT,
  STATS_BACK_PROMPT,
  PLAY_AGAIN_CONFIRM_PROMPT,
]);

export const isHubPrompt = (promptId: string): boolean =>
  HUB_PROMPTS.has(promptId) || promptId.startsWith(GAME_ROW_PREFIX);

/** The tower was chosen or linked tonight (DEC-152), so it is in play unless it was lost. */
export const towerChosen = (state: ShellState): boolean =>
  state.towerChoice === "connect" || state.towerLinked;

/** The session screen's tower line (DEC-711). Unknown is never "in play". */
export const towerLine = (state: ShellState): string => {
  if (!towerChosen(state)) return TOWER_WITHOUT;
  return towerReady(state.tower) ? TOWER_IN_PLAY : TOWER_LOST;
};

/** Done for tonight idles the tower only while this session's link is still up (CUE-012). */
const towerIsUp = (state: ShellState): boolean =>
  towerChosen(state) && state.tower.connection === "connected";

/** Continue is left out, not greyed, without an autosave (DEC-709). */
export const canContinue = (state: ShellState): boolean => state.autosave !== null;

/** Row labels in the list: "Game N" is the game's place tonight, oldest first. */
export const gameRowPrompt = (index: number): string => `${GAME_ROW_PREFIX}${index + 1}`;

export const gameNumber = (promptId: string): number | null => {
  if (!promptId.startsWith(GAME_ROW_PREFIX)) return null;
  const n = Number(promptId.slice(GAME_ROW_PREFIX.length));
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** The presses the session screen offers right now, in screen order. */
export const hubOffers = (state: ShellState): HubOffer[] => {
  if (state.screen !== "session" || state.enter) return [];
  if (state.confirm === "new-game") {
    return [
      { promptId: NEW_GAME_CONFIRM_PROMPT, actionId: "new-game" },
      { promptId: CONFIRM_BACK_PROMPT, actionId: "back" },
    ];
  }
  if (state.confirm === "done") {
    return [
      { promptId: DONE_CONFIRM_PROMPT, actionId: "done-for-tonight" },
      { promptId: CONFIRM_BACK_PROMPT, actionId: "back" },
    ];
  }
  if (state.confirm === "play-again") {
    return [
      { promptId: PLAY_AGAIN_CONFIRM_PROMPT, actionId: "play-again" },
      { promptId: CONFIRM_BACK_PROMPT, actionId: "back" },
    ];
  }
  if (state.statsGame !== null) {
    return [
      { promptId: STATS_PLAY_AGAIN_PROMPT, actionId: "play-again" },
      { promptId: STATS_BACK_PROMPT, actionId: "back" },
    ];
  }
  const offers: HubOffer[] = [];
  if (canContinue(state)) offers.push({ promptId: CONTINUE_PROMPT, actionId: "continue" });
  offers.push({ promptId: NEW_GAME_PROMPT, actionId: "new-game" });
  // Newest first, as the list reads.
  for (let index = state.games.length - 1; index >= 0; index -= 1) {
    offers.push({ promptId: gameRowPrompt(index), actionId: "open-game" });
  }
  offers.push({ promptId: DONE_PROMPT, actionId: "done-for-tonight" });
  return offers;
};

/** Loads the saved game. The host reads `continueRequested` and rebuilds the state from the checkpoint. */
export const beginContinue = (state: ShellState): void => {
  state.confirm = null;
  state.statsGame = null;
  state.resumedFromAutosave = true;
  state.continueRequested = true;
  state.screen = "play";
  state.stage = "playing";
};

// Pick story for a fresh game, with nothing carried over from an earlier one.
export const toPickStory = (state: ShellState): void => {
  // After Play again the state still holds that game's seed; a fresh game gets its own (DEC-217).
  if (state.playAgain) state.seed = playAgainSeed(state);
  state.confirm = null;
  state.statsGame = null;
  state.playAgain = false;
  state.tally = emptyTally();
  state.resumedFromAutosave = false;
  state.towerWithout = false;
  state.reconnect = null;
  state.activeGameId = `game-${state.eventSeq}`;
  state.screen = "pick-story";
  state.stage = "lobby";
  state.pause = null;
  state.play = null;
  state.openingIndex = -1;
  state.chosenStoryId = null;
  state.setupAt = 0;
  state.setupSteps = [];
  const story = state.stories.find((entry) => entry.card.id === state.boundStoryId);
  state.holdings = story ? initialHoldings(story) : {};
};

// New game, confirmed. Continue is hidden until Begin writes the next autosave (DEC-709);
// the old row stays in the database until then.
export const beginNewGame = (state: ShellState): void => {
  toPickStory(state);
  state.autosave = null;
};

/** A new seed for Play again: it depends only on the game so far, so a replay finds the same one. */
export const playAgainSeed = (state: ShellState): string =>
  `${state.sessionId}-${hashSeed(`${state.seed}:${state.eventSeq}:${state.games.length}`).toString(16)}`;

/**
 * Play again, confirmed (DEC-708): the same story, settings and heroes with a new seed. Pick story
 * and Game settings are skipped; claims come prefilled where that iPad is still joined (DEC-216).
 * Like New game, Continue is hidden until Begin writes the next autosave (DEC-709).
 */
export const beginPlayAgain = (
  state: ShellState,
  effects: Array<EngineEffect | ShellEffect>,
): void => {
  const game = state.statsGame === null ? undefined : state.games[state.statsGame - 1];
  const story = game ? state.stories.find((entry) => entry.card.id === game.storyId) : undefined;
  state.confirm = null;
  state.statsGame = null;
  if (!game || !story?.card.playable) {
    effects.push({
      kind: "press-error",
      v: 1,
      code: "invalid-state",
      message: !game
        ? "Play again has no game to replay."
        : "That story cannot be played right now, so Play again did not start.",
    });
    return;
  }
  state.seed = playAgainSeed(state);
  state.resumedFromAutosave = false;
  state.towerWithout = false;
  state.reconnect = null;
  state.activeGameId = `game-${state.eventSeq}`;
  state.focusStoryId = story.card.id;
  state.boundStoryId = story.card.id;
  state.chosenStoryId = story.card.id;
  state.settingValues = { ...game.settingValues };
  state.holdings = Object.fromEntries(
    story.heroes.map((hero) => {
      const holder = game.holdings[hero.id];
      return [hero.id, holder !== undefined && state.devices.has(holder) ? holder : null];
    }),
  );
  refreshSetupSteps(state);
  state.playAgain = true;
  state.tally = emptyTally();
  state.pause = null;
  state.play = null;
  state.openingIndex = -1;
  state.screen = "claim-heroes";
  state.stage = "lobby";
  state.autosave = null;
};

/** New game, Continue and Play again run the tower block again first while the tower is lost (DEC-711). */
const towerBlockFirst = (
  state: ShellState,
  then: "new-game" | "continue" | "play-again",
): boolean => {
  if (!towerChosen(state) || towerReady(state.tower)) return false;
  state.confirm = null;
  state.enter = { step: "choice", failed: false };
  state.enterThen = then;
  return true;
};

/** Done for tonight, confirmed: the tower settles to idle once if it is in play (DEC-713). */
const endSession = (state: ShellState, effects: Array<EngineEffect | ShellEffect>): void => {
  state.confirm = null;
  state.sessionEnded = true;
  state.screen = "session-over";
  state.stage = "lobby";
  state.devices = new Set();
  if (towerIsUp(state)) {
    effects.push({ kind: "tower-command", capabilityId: "lighting.all-off", params: {}, v: 1 });
  }
};

/** One session-screen press. Anything that is not offered right now changes nothing. */
export const applyHubPress = (
  state: ShellState,
  promptId: string,
  effects: Array<EngineEffect | ShellEffect>,
): void => {
  const onSessionScreen = state.screen === "session";
  if (promptId === CONTINUE_PROMPT) {
    if (!canContinue(state)) return;
    // From Pick story it behaves as before: checkpoint reload, then the tower check.
    if (onSessionScreen && towerBlockFirst(state, "continue")) return;
    beginContinue(state);
    return;
  }
  if (!onSessionScreen) return;
  if (promptId === NEW_GAME_PROMPT && state.confirm === null) {
    if (canContinue(state)) state.confirm = "new-game";
    else if (!towerBlockFirst(state, "new-game")) beginNewGame(state);
    return;
  }
  if (promptId === NEW_GAME_CONFIRM_PROMPT && state.confirm === "new-game") {
    if (!towerBlockFirst(state, "new-game")) beginNewGame(state);
    return;
  }
  const opened = gameNumber(promptId);
  if (opened !== null) {
    if (state.confirm === null && state.statsGame === null && opened <= state.games.length) {
      state.statsGame = opened;
    }
    return;
  }
  if (promptId === STATS_BACK_PROMPT && state.confirm === null) {
    state.statsGame = null;
    return;
  }
  if (promptId === STATS_PLAY_AGAIN_PROMPT && state.confirm === null && state.statsGame !== null) {
    if (canContinue(state)) state.confirm = "play-again";
    else if (!towerBlockFirst(state, "play-again")) beginPlayAgain(state, effects);
    return;
  }
  if (promptId === PLAY_AGAIN_CONFIRM_PROMPT && state.confirm === "play-again") {
    if (!towerBlockFirst(state, "play-again")) beginPlayAgain(state, effects);
    return;
  }
  if (promptId === DONE_PROMPT && state.confirm === null) {
    state.confirm = "done";
    return;
  }
  if (promptId === DONE_CONFIRM_PROMPT && state.confirm === "done") {
    endSession(state, effects);
    return;
  }
  if (promptId === CONFIRM_BACK_PROMPT) state.confirm = null;
};

const heldNow = (state: ShellState): Record<string, string> =>
  Object.fromEntries(
    Object.entries(state.holdings).flatMap(([heroId, holder]): [string, string][] =>
      holder === null ? [] : [[heroId, holder]],
    ),
  );

/**
 * A game joins tonight's list once (SCR-021); ending again keeps its place and rating but takes
 * the latest counts. Counts are only known once play began; before that they are unavailable.
 */
export const recordGame = (
  state: ShellState,
  gameId: string,
  outcome: "quit" | "won" | "lost",
): void => {
  const started = state.play !== null;
  const existing = state.games.find((game) => game.gameId === gameId);
  const game: TonightGame = {
    gameId,
    outcome,
    storyId: state.chosenStoryId ?? state.boundStoryId,
    settingValues: { ...state.settingValues },
    holdings: heldNow(state),
    day: state.play && state.play.dayNumber > 0 ? state.play.dayNumber : null,
    moves: started ? state.tally.moves : null,
    buildings: started ? state.tally.buildings : null,
    skulls: started ? state.tally.skulls : null,
    rating: existing?.rating ?? null,
  };
  state.games = existing
    ? state.games.map((row) => (row.gameId === gameId ? game : row))
    : [...state.games, game];
};

const count = (value: number | null): string => (value === null ? UNAVAILABLE : String(value));

/** The stats rows the board shows, "Label: value" one per line (SCR-019, C2 slice). */
export const statsLines = (game: TonightGame, storyTitle: string): string[] => [
  `Story: ${storyTitle}`,
  `Outcome: ${game.outcome}`,
  `Time played: ${NO_TIME_PLAYED}`,
  `${game.outcome === "quit" ? "Quit on day" : "Ended on day"}: ${count(game.day)}`,
  `Moves taken: ${count(game.moves)}`,
  `Buildings entered: ${count(game.buildings)}`,
  `Skull drops recorded: ${count(game.skulls)}`,
];

/** The fun rating on the open stats screen. Anything outside 1 to 5 is an error, not a silent skip. */
export const rateOpenGame = (
  state: ShellState,
  optionId: string,
  effects: Array<EngineEffect | ShellEffect>,
): void => {
  const game = state.statsGame === null ? undefined : state.games[state.statsGame - 1];
  const rating = Number(optionId);
  if (!game || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    effects.push({
      kind: "press-error",
      v: 1,
      code: "invalid-state",
      message: game
        ? "That rating was not saved. Pick 1 to 5."
        : "That rating was not saved because no game is open.",
    });
    return;
  }
  state.games = state.games.map((row) => (row === game ? { ...row, rating } : row));
};
