import { HINTS_ON, HINTS_SETTING_ID } from "../../hints/copy.ts";
import { mergeSetupSteps } from "../session/pack.ts";
import type { ShellScreen } from "../session/screens.ts";
import type { ShellState } from "../session/state.ts";

export const PICK_STORY_CONTINUE = "continue-pick-story";
export const GAME_SETTINGS_CONTINUE = "continue-game-settings";
export const GAME_SETTINGS_BACK = "back-game-settings";
export const CLAIM_HEROES_CONTINUE = "continue-claim-heroes";
export const CLAIM_HEROES_BACK = "back-claim-heroes";
export const BEGIN_CONTINUE = "continue-begin";
export const BEGIN_BACK = "back-begin";

export const setupDonePrompt = (stepId: string) => `continue-setup-${stepId}`;
export const setupBackPrompt = (stepId: string) => `back-setup-${stepId}`;

export const chosenStory = (state: ShellState) =>
  state.stories.find((story) => story.card.id === state.chosenStoryId);

/** The core setup step that hosts the game of chance (DEC-110 step 6, DEC-114, UI-045; copy `chance.title`). */
export const PURSE_STEP_ID = "starting-purse";
export const PURSE_STEP_LABEL = "Starting purse";
export const SPIN_PROMPT = `spin-setup-${PURSE_STEP_ID}`;
export const SPIN_ACTION = "spin";

/** The tower runs the spin only while it is linked and connected; otherwise the board does (Q7.4). */
export const towerSpins = (state: ShellState): boolean =>
  state.towerLinked && state.tower.connection === "connected";

/** True while the setup screen is on the starting-purse step. */
export const onPurseStep = (state: ShellState): boolean =>
  state.screen === "setup" && state.setupSteps[state.setupAt]?.id === PURSE_STEP_ID;

/**
 * The story's steps with the purse step added. The purse is a core step (DEC-110) that follows the
 * heroes' placement and comes before the story's extras; with no placement step it follows the seals.
 */
const withPurseStep = (steps: readonly { id: string; label: string }[]) => {
  const rest = steps.filter((step) => step.id !== PURSE_STEP_ID);
  const after = Math.max(
    rest.findIndex((step) => step.id === "place-heroes"),
    rest.findIndex((step) => step.id === "seals-and-skulls"),
  );
  const row = { id: PURSE_STEP_ID, label: PURSE_STEP_LABEL };
  return [...rest.slice(0, after + 1), row, ...rest.slice(after + 1)];
};

export const refreshSetupSteps = (state: ShellState): void => {
  const story = chosenStory(state);
  // `story.setup` is already merged with the engine seals step when the host loads the catalog.
  state.setupSteps = story ? withPurseStep(story.setup) : [];
  state.setupAt = 0;
  // A new setup list is a new game's setup: the purse is spun again for it.
  state.startingPurse = null;
};

/** How many heroes this story seats. Party size wins; otherwise every hero. */
export const partySize = (state: ShellState): number => {
  const story =
    chosenStory(state) ?? state.stories.find((entry) => entry.card.id === state.boundStoryId);
  if (!story) return 0;
  const setting = story.settings.find((entry) => entry.id === "party-size");
  if (!setting) return story.heroes.length;
  const optionId = state.settingValues[setting.id] ?? setting.default;
  const option = setting.options.find((entry) => entry.id === optionId);
  const parsed = Number(option?.label);
  if (Number.isInteger(parsed) && parsed > 0) return parsed;
  return story.heroes.length;
};

export const heldCount = (state: ShellState): number => {
  const story =
    chosenStory(state) ?? state.stories.find((entry) => entry.card.id === state.boundStoryId);
  if (!story) return 0;
  return story.heroes.filter((hero) => state.holdings[hero.id] != null).length;
};

export const allHeroesHeld = (state: ShellState): boolean => {
  const size = partySize(state);
  return size > 0 && heldCount(state) >= size;
};

export const unheldHeroIds = (state: ShellState): string[] => {
  const story = chosenStory(state);
  if (!story) return [];
  return story.heroes.filter((hero) => state.holdings[hero.id] == null).map((hero) => hero.id);
};

export const screenAfterContinue = (state: ShellState, screen: ShellScreen): ShellScreen | null => {
  if (screen === "pick-story") return "game-settings";
  if (screen === "game-settings") {
    const story = chosenStory(state);
    if (!story?.card.playable) {
      state.chosenStoryId = null;
      state.settingValues = {};
      state.setSerial = 0;
      return "pick-story";
    }
    // The tower block runs once, in the session Enter (DEC-152).
    return "claim-heroes";
  }
  if (screen === "claim-heroes") {
    return state.setupSteps.length > 0 ? "setup" : "begin";
  }
  if (screen === "setup") {
    return state.setupAt < state.setupSteps.length ? "setup" : "begin";
  }
  if (screen === "begin") return "play";
  return null;
};

export const screenAfterBack = (state: ShellState, screen: ShellScreen): ShellScreen | null => {
  if (screen === "not-playable") return "pick-story";
  if (screen === "game-settings") {
    state.chosenStoryId = null;
    state.settingValues = {};
    state.setSerial = 0;
    return "pick-story";
  }
  if (screen === "claim-heroes") return state.playAgain ? null : "game-settings";
  if (screen === "setup") {
    if (state.setupAt > 0) {
      state.setupAt -= 1;
      return "setup";
    }
    return "claim-heroes";
  }
  if (screen === "begin") {
    if (state.setupSteps.length > 0) {
      state.setupAt = Math.max(0, state.setupSteps.length - 1);
      return "setup";
    }
    return "claim-heroes";
  }
  return null;
};

export const bindStoryChoice = (state: ShellState, storyId: string): boolean => {
  const story = state.stories.find((entry) => entry.card.id === storyId);
  if (!story?.card.playable) return false;
  state.chosenStoryId = storyId;
  state.boundStoryId = storyId;
  state.settingValues = {
    ...Object.fromEntries(story.settings.map((setting) => [setting.id, setting.default])),
    [HINTS_SETTING_ID]: HINTS_ON,
  };
  state.setSerial = 0;
  state.holdings = Object.fromEntries(story.heroes.map((hero) => [hero.id, null]));
  refreshSetupSteps(state);
  return true;
};
