import type { PlaceStill, TableBand, ViewState } from "../../views/state.ts";
import type { DayLocal } from "../day/loop.ts";
import type { EncounterLocal } from "../encounter/loop.ts";
import type { GroupTurnLocal } from "../group-turn/loop.ts";
import { isPlaceBuilding, PLACE_CAPTION, PLACE_STILL_ID } from "./placeCaption.ts";
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

const buildingTitle = (building: string): string =>
  building.charAt(0).toUpperCase() + building.slice(1);

const labelFor = (state: ShellState, promptId: string, actionId: string): string => {
  if (promptId === "splash-play") return "Play";
  if (promptId === "continue-begin") return "Begin";
  if (promptId.startsWith("continue-setup-")) return "Done";
  if (promptId.startsWith("day-") && promptId.endsWith("-roll-done")) return "Take the move roll";
  if (promptId === "menu-connect") return "Connect tower";
  if (actionId === "walk") {
    const spaceId = promptId.split("--").slice(2).join("--");
    const name = state.play?.content.board.spaceById.get(spaceId)?.name ?? spaceId;
    return `Walk to ${name}`;
  }
  if (actionId === "enter") {
    const spaceId = promptId.split("--").slice(2).join("--");
    const building = state.play?.content.board.spaceById.get(spaceId)?.building;
    return building ? `Enter ${buildingTitle(building)}` : "Enter";
  }
  if (actionId === "leave") return "Leave";
  if (actionId === "end-turn") return "End turn";
  if (actionId === "record") return "Record";
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

const heroName = (state: ShellState, heroId: string): string => {
  for (const story of state.stories) {
    const hero = story.heroes.find((row) => row.id === heroId);
    if (hero) return hero.name;
  }
  return heroId;
};

const buildTable = (state: ShellState, chapter: string): TableBand | null => {
  if (state.screen !== "play" && state.screen !== "pause") return null;
  const play = state.play;
  if (!play) return null;
  const board = play.content.board;

  let actingId: string | null = null;
  let movesLeft: number | null = null;
  let waiting = false;

  for (const frame of [...state.loops.stack].reverse()) {
    if (frame.loopId === "encounter") {
      const local = frame.local as EncounterLocal;
      actingId = local.groupId;
      waiting = true;
      continue;
    }
    if (frame.loopId === "group-turn") {
      const local = frame.local as GroupTurnLocal;
      actingId = actingId ?? local.groupId;
      movesLeft = local.movesLeft;
      if (!waiting) waiting = local.awaitingPress;
      break;
    }
    if (frame.loopId === "day") {
      const local = frame.local as DayLocal;
      const index = local.phase === "roll" ? 0 : local.groupIndex;
      actingId = play.turnOrder[index] ?? play.turnOrder[0] ?? null;
      waiting = local.awaitingPress && local.phase !== "done";
      break;
    }
  }

  const actingHeroId = actingId;
  const actingName = actingHeroId ? heroName(state, actingHeroId) : null;
  const rolled = actingHeroId ? play.dayRolls[actingHeroId] : undefined;

  return {
    chapter,
    day: play.dayNumber,
    health: "unavailable",
    purse: "unavailable",
    actingGroup: actingName,
    actingHeroId,
    movesLeft,
    moveRoll: rolled ?? null,
    modifier: "none",
    waitingFor: waiting && actingName ? `${actingName} is choosing` : null,
    groups: play.groups.map((group) => {
      const id = group.heroIds[0] ?? group.id;
      const space = board.spaceById.get(group.spaceId);
      const kingdom = space?.kingdom ?? "N";
      const kingdomRow = board.kingdoms.find((row) => row.id === kingdom);
      return {
        heroId: id,
        heroName: heroName(state, id),
        kingdom,
        kingdomLabel: kingdomRow?.label ?? kingdom,
        spaceId: group.spaceId,
        spaceName: space?.name ?? group.spaceId,
        building: space?.building ?? null,
        inside: group.insideBuilding,
        alone: group.heroIds.length === 1,
      };
    }),
  };
};

const buildPlace = (state: ShellState): PlaceStill | null => {
  const play = state.play;
  if (!play || (state.screen !== "play" && state.screen !== "pause")) return null;
  const inside = play.groups.find((group) => group.insideBuilding);
  if (!inside) return null;
  const building = play.content.board.spaceById.get(inside.spaceId)?.building;
  if (!isPlaceBuilding(building)) return null;
  return {
    building,
    stillId: PLACE_STILL_ID[building],
    caption: PLACE_CAPTION[building],
  };
};

const showsFor = (state: ShellState, title: string): string => {
  if ((state.screen === "play" || state.screen === "pause") && state.play) {
    return `Day ${state.play.dayNumber}`;
  }
  if (state.screen === "splash") return "Blood Tower";
  if (state.screen === "pick-story") return title;
  if (state.screen === "goodbye") return "Goodbye";
  if (state.screen === "session") return "The session";
  return `Screen ${state.screen}`;
};

export const projectShellView = (state: ShellState): ViewState => {
  const story = state.stories.find(
    (entry) => entry.card.id === (state.chosenStoryId ?? state.boundStoryId),
  );
  const screen = state.screen;
  const title = story?.card.title ?? "Story";
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
          label: labelFor(state, offer.promptId, offer.actionId),
          open: true,
          deviceId: null,
        }
      : {
          promptId: offer.promptId,
          actionId: offer.actionId,
          label: labelFor(state, offer.promptId, offer.actionId),
          open: false,
          reason: "Already taken.",
          deviceId: null,
        },
  );

  return {
    screen,
    levels: [{ id: state.screen, label: state.screen, shows: showsFor(state, title) }],
    heroes,
    actions,
    narration: null,
    table: buildTable(state, title),
    place: buildPlace(state),
  };
};
