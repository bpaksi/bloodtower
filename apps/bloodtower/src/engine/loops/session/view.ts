import type { ViewState } from "../../views/state.ts";
import type { ShellState } from "./state.ts";

/** Matches protocol v2 setup screens (private lines on these only). */
const SETUP_SCREENS = new Set([
  "pick-story",
  "game-settings",
  "tower-connect",
  "claim-heroes",
  "setup",
  "begin",
]);

const isSetupScreen = (screen: ViewState["screen"]): boolean => SETUP_SCREENS.has(screen);

const labelFor = (promptId: string, actionId: string): string => {
  if (actionId === "continue") return "Continue";
  if (actionId === "back") return "Back";
  if (actionId === "new-game") return "New game";
  if (actionId === "done-for-tonight") return "Done for tonight";
  if (actionId === "quit-story") return "Quit story";
  if (actionId === "reconnect") return "Reconnect";
  if (promptId === "tower-connect" && actionId === "tower-connect") return "Connect tower";
  if (promptId === "tower-calibrate" && actionId === "tower-calibrate") return "Calibrate";
  return actionId;
};

const mapScreen = (screen: ShellState["screen"]): ViewState["screen"] => {
  if (
    screen === "session" ||
    screen === "pick-game" ||
    screen === "goodbye" ||
    screen === "play" ||
    screen === "pause"
  ) {
    return screen;
  }
  return screen as ViewState["screen"];
};

export const projectShellView = (state: ShellState): ViewState => {
  const story = state.stories.find(
    (entry) => entry.card.id === (state.chosenStoryId ?? state.boundStoryId),
  );
  const screen = mapScreen(state.screen);
  const heroes = (story?.heroes ?? []).map((hero) => ({
    id: hero.id,
    name: hero.name,
    deviceId: state.holdings[hero.id] ?? null,
    lines: isSetupScreen(screen)
      ? [{ id: `${screen}.private.${hero.id}`, text: `Only ${hero.name} hears this.` }]
      : [],
  }));

  const actions: ViewState["actions"] = state.offered.map((offer) =>
    offer.open
      ? {
          promptId: offer.promptId,
          actionId: offer.actionId,
          label: labelFor(offer.promptId, offer.actionId),
          open: true,
          deviceId: null,
        }
      : {
          promptId: offer.promptId,
          actionId: offer.actionId,
          label: labelFor(offer.promptId, offer.actionId),
          open: false,
          reason: "Already taken.",
          deviceId: null,
        },
  );

  const top = state.loops.stack.at(-1);
  const shows =
    state.screen === "play" && state.play
      ? `Day ${state.play.dayNumber}`
      : `Screen ${state.screen}`;

  return {
    screen,
    levels: [{ id: state.screen, label: state.screen, shows }],
    heroes,
    actions,
    narration: null,
  };
};
