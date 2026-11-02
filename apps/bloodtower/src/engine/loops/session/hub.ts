import type { EngineEffect } from "../../effects.ts";
import type { ShellEffect } from "./effects.ts";
import { initialHoldings, type ShellState } from "./state.ts";
import { towerReady } from "./tower.ts";

/** The session screen's presses (SCR-021). One press each, from any joined iPad (DEC-278). */
export const CONTINUE_PROMPT = "continue-saved-game";
export const NEW_GAME_PROMPT = "session-new-game";
export const NEW_GAME_CONFIRM_PROMPT = "session-new-confirm";
export const DONE_PROMPT = "session-done-tonight";
export const DONE_CONFIRM_PROMPT = "session-done-confirm";
export const CONFIRM_BACK_PROMPT = "session-confirm-back";
/** A row in Tonight's games. Opening it is feature 07, so a press changes nothing yet. */
export const GAME_ROW_PREFIX = "session-game-";

export const REPLACE_SAVE_LINE = "This replaces the saved game. Are you sure?";
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
  state.resumedFromAutosave = true;
  state.continueRequested = true;
  state.screen = "play";
  state.stage = "playing";
};

// Pick story for a fresh game, with nothing carried over from an earlier one.
export const toPickStory = (state: ShellState): void => {
  state.confirm = null;
  state.resumedFromAutosave = false;
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

/** New game and Continue run the tower block again first while the tower is lost (DEC-711). */
const towerBlockFirst = (state: ShellState, then: "new-game" | "continue"): boolean => {
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

/** A quit game joins tonight's list once (SCR-021). Continuing it and quitting again keeps its place. */
export const recordGame = (
  state: ShellState,
  gameId: string,
  outcome: "quit" | "won" | "lost",
): void => {
  if (state.games.some((game) => game.gameId === gameId)) return;
  state.games = [...state.games, { gameId, outcome }];
};
