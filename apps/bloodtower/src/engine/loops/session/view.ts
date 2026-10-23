import type { ViewState } from "../../views/state.ts";
import type { ShellState } from "./state.ts";

export const projectShellView = (state: ShellState): ViewState => {
  const story = state.stories.find(
    (entry) => entry.card.id === (state.chosenStoryId ?? state.boundStoryId),
  );
  const heroes = (story?.heroes ?? []).map((hero) => ({
    id: hero.id,
    name: hero.name,
    deviceId: state.holdings[hero.id] ?? null,
    lines: [],
  }));

  const screen =
    state.screen === "session" || state.screen === "pick-game" || state.screen === "goodbye"
      ? "pick-story"
      : state.screen === "pause"
        ? "begin"
        : state.screen;

  const actions: ViewState["actions"] = [];
  const prompt = state.loops.prompt;
  if (prompt) {
    actions.push(
      prompt.open
        ? {
            promptId: prompt.promptId,
            actionId: prompt.actionId,
            label: prompt.actionId,
            open: true,
            deviceId: null,
          }
        : {
            promptId: prompt.promptId,
            actionId: prompt.actionId,
            label: prompt.actionId,
            open: false,
            reason: "Already taken.",
            deviceId: null,
          },
    );
  }

  return {
    screen: screen as ViewState["screen"],
    levels: [{ id: state.screen, label: state.screen, shows: `Screen ${state.screen}` }],
    heroes,
    actions,
    narration: null,
  };
};
