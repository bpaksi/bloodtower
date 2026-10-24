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

export const refreshSetupSteps = (state: ShellState): void => {
  const story = chosenStory(state);
  // `story.setup` is already merged (and pack-filtered) when the host loads the catalog.
  state.setupSteps = story ? [...story.setup] : [];
  state.setupAt = 0;
};

export const allHeroesHeld = (state: ShellState): boolean => {
  const story = chosenStory(state);
  if (!story) return false;
  return story.heroes.every((hero) => state.holdings[hero.id] != null);
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
    if (!story?.card.playable) return "pick-story";
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
  if (screen === "game-settings") {
    state.chosenStoryId = null;
    state.settingValues = {};
    state.setSerial = 0;
    return "pick-story";
  }
  if (screen === "claim-heroes") return "game-settings";
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
  state.settingValues = Object.fromEntries(
    story.settings.map((setting) => [setting.id, setting.default]),
  );
  state.setSerial = 0;
  state.holdings = Object.fromEntries(story.heroes.map((hero) => [hero.id, null]));
  refreshSetupSteps(state);
  return true;
};
