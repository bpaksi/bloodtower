import {
  OPENING_MOMENTS,
  OPENING_PLACEHOLDER,
  openingActiveIndex,
} from "../../../protocols/opening.ts";
import type { GearView } from "../../../protocols/v2/views.ts";
import type { LoopLevel, PlaceStill, TableBand, ViewState } from "../../views/state.ts";
import { type CompassSlot, slottedNeighborsOf } from "../chapter/board.ts";
import type { DayLocal } from "../day/loop.ts";
import type { EncounterLocal } from "../encounter/loop.ts";
import { partySize } from "../game/setupFlow.ts";
import type { GroupTurnLocal } from "../group-turn/loop.ts";
import type { ShellStory } from "./pack.ts";
import { isPlaceBuilding, PLACE_CAPTION, PLACE_STILL_ID } from "./placeCaption.ts";
import type { ShellState } from "./state.ts";
import { towerReady } from "./tower.ts";

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
  if (promptId === "menu-connect") return "Connect Tower";
  if (actionId === "walk") {
    const spaceId = promptId.split("--").slice(2).join("--");
    const name = state.play?.content.board.spaceById.get(spaceId)?.name ?? spaceId;
    return name;
  }
  if (actionId === "enter") {
    const spaceId = promptId.split("--").slice(2).join("--");
    const building = state.play?.content.board.spaceById.get(spaceId)?.building;
    return building ? `Enter ${buildingTitle(building)}` : "Enter";
  }
  if (actionId === "leave") return "Leave";
  if (actionId === "end-turn") return "End turn";
  if (actionId === "record") return "Record";
  if (promptId.startsWith("continue-pick-story-")) {
    const id = promptId.slice("continue-pick-story-".length);
    const story = state.stories.find((entry) => entry.card.id === id);
    return story ? `Choose ${story.card.title}` : "Choose";
  }
  if (actionId === "continue") return "Continue";
  if (actionId === "back") return "Back";
  if (actionId === "new-game") return "New game";
  if (actionId === "done-for-tonight") return "Done for tonight";
  if (actionId === "quit-story") return "Quit story";
  if (actionId === "reconnect") return "Reconnect";
  if (promptId === "tower-connect" && actionId === "tower-connect") return "Connect Tower";
  if (actionId === "play-without-tower") return "Play without Tower";
  if (promptId === "tower-calibrate" && actionId === "tower-calibrate") return "Calibrate";
  return actionId;
};

/** Walk offers carry the compass slot of their neighbour (UI-023). */
const slotFor = (state: ShellState, promptId: string, actionId: string): { slot?: CompassSlot } => {
  if (actionId !== "walk" || !state.play) return {};
  const [, groupId, ...rest] = promptId.split("--");
  const group = state.play.groups.find((row) => row.id === groupId);
  if (!group) return {};
  const found = slottedNeighborsOf(state.play.content.board, group.spaceId).find(
    (n) => n.space.id === rest.join("--"),
  );
  return found ? { slot: found.slot } : {};
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

const LEVEL_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

const STEP_NAME: Record<ShellState["screen"], string> = {
  splash: "Splash",
  "tower-connect": "Tower Connect",
  "pick-story": "Pick Story",
  "game-settings": "Game settings",
  "claim-heroes": "Party Join",
  setup: "Setup",
  begin: "Begin",
  "pick-game": "Pick a game",
  play: "Play",
  pause: "Paused",
  session: "Session",
  goodbye: "Goodbye",
  "not-playable": "Not playable yet",
};

/** R2-01 words. A session that never connected is "no tower", not a lost link. */
const towerStrip = (state: ShellState): string => {
  if (towerReady(state.tower)) return "connected";
  if (state.tower.connection === "connected" || state.tower.connection === "connecting") {
    return "calibrating";
  }
  return state.towerLinked ? "lost" : "no tower";
};

const towerLine = (state: ShellState): string => {
  const strip = towerStrip(state);
  if (strip === "connected") return "The tower is connected and calibrated.";
  if (strip === "calibrating") return "The tower is connected. Calibrate it from an iPad.";
  if (strip === "lost") return "The tower is lost. An iPad can reconnect.";
  return "No tower yet. An iPad can connect it, or play on without it.";
};

const chosenOrBound = (state: ShellState): ShellStory | undefined =>
  state.stories.find((entry) => entry.card.id === (state.chosenStoryId ?? state.boundStoryId));

const playerLine = (story: ShellStory): string => {
  const players = story.card.players;
  if (!players) return "";
  const { min, max } = players;
  return min === max ? `${max} players` : `${min}\u2013${max} players`;
};

const doorLevel = (story: ShellStory, focused: boolean): LoopLevel | null => {
  const id = `door-${story.card.id}`;
  if (!LEVEL_ID.test(id)) return null;
  const tagline = (story.card.tagline ?? "A story door.").replaceAll("\n", " ");
  const lines = [
    focused ? "In focus" : "A door",
    tagline,
    playerLine(story),
    story.card.playable ? "Playable" : "Not playable yet",
  ];
  if (story.card.cover) lines.push(story.card.cover);
  return {
    id,
    label: story.card.title,
    shows: lines.join("\n"),
  };
};

const settingLevels = (state: ShellState, story: ShellStory | undefined): LoopLevel[] => {
  if (!story) return [];
  const levels: LoopLevel[] = [];
  for (const setting of story.settings) {
    const id = `setting-${setting.id}`;
    if (!LEVEL_ID.test(id)) continue;
    const chosen = state.settingValues[setting.id] ?? setting.default;
    const option = setting.options.find((row) => row.id === chosen);
    levels.push({ id, label: setting.label, shows: option?.label ?? chosen });
    if (levels.length === 4) break;
  }
  return levels;
};

const statusLevel = (state: ShellState): LoopLevel => ({
  id: "table-status",
  label: "Status",
  shows: `tower: ${towerStrip(state)}\ndevices: ${state.devices.size}\nstep: ${STEP_NAME[state.screen]}`,
});

/**
 * The grey-stair line is play-screen narration only. Quit leaves `openingIndex` active,
 * and session / goodbye must keep their own shows (including the W8 tower phrase).
 */
const openingMomentId = (state: ShellState): string | null => {
  if (state.screen !== "play") return null;
  if (!openingActiveIndex(state.openingIndex)) return null;
  return OPENING_MOMENTS[state.openingIndex] ?? null;
};

const showsFor = (state: ShellState, title: string, story: ShellStory | undefined): string => {
  if (openingMomentId(state)) return OPENING_PLACEHOLDER;
  if ((state.screen === "play" || state.screen === "pause") && state.play) {
    return `Day ${state.play.dayNumber}`;
  }
  if (state.screen === "splash") return "Blood Tower";
  if (state.screen === "pick-story") return title;
  if (state.screen === "not-playable") {
    const focused = state.stories.find((entry) => entry.card.id === state.focusStoryId);
    return focused?.card.title ?? title;
  }
  if (state.screen === "game-settings") {
    if (!story || story.settings.length === 0) return "Nothing to set.";
    return story.settings
      .map((setting) => {
        const chosen = state.settingValues[setting.id] ?? setting.default;
        const option = setting.options.find((row) => row.id === chosen);
        return `${setting.label}: ${option?.label ?? chosen}`;
      })
      .join("\n");
  }
  if (state.screen === "tower-connect") return towerLine(state);
  if (state.screen === "claim-heroes") {
    const roster = story?.heroes ?? [];
    const held = roster.filter((hero) => state.holdings[hero.id]).length;
    return `${held} of ${partySize(state)} picked`;
  }
  if (state.screen === "setup") {
    return (
      state.setupSteps[state.setupAt]?.label ??
      "Lay the board out on the table and face each kingdom."
    );
  }
  if (state.screen === "begin") return "The table is set.";
  if (state.screen === "pick-game") {
    return state.autosave ? "A saved game can continue." : "A new game is ready.";
  }
  if (state.screen === "goodbye") {
    if (state.goodbyeTower === "idle") return "idle";
    if (state.goodbyeTower === "no-tower") return "no tower";
    return "unavailable";
  }
  if (state.screen === "session") return "The session";
  return title;
};

/**
 * Public lines the Story board paints. The screen line stays last so an iPad's
 * `shows` text stays that line. Join is added later and must keep the total at 8.
 */
const startupLevels = (state: ShellState, story: ShellStory | undefined): LoopLevel[] => {
  if (state.screen === "play" || state.screen === "pause") return [];
  const leading: LoopLevel[] = [];
  if (state.screen === "pick-story") {
    for (const entry of state.stories.slice(0, 5)) {
      const door = doorLevel(entry, entry.card.id === state.focusStoryId);
      if (door) leading.push(door);
    }
  }
  if (state.screen === "game-settings") leading.push(...settingLevels(state, story));
  leading.push(statusLevel(state));
  return leading.slice(0, 6);
};

const screenLabel = (state: ShellState): string => {
  if (state.screen === "setup") {
    const total = state.setupSteps.length;
    if (total === 0) return "Board setup";
    const index = Math.min(state.setupAt + 1, total);
    return `Step ${index} of ${total}`;
  }
  return STEP_NAME[state.screen];
};

const LOOKUP_CARDS = [
  { id: "rules", title: "Rules of the tower" },
  { id: "sample-card", title: "A sample card" },
] as const;

const helpScreenFor = (state: ShellState): string => {
  if (state.screen === "pause" && state.pause?.cause === "tower-lost") return "tower-lost";
  const mapped: Record<string, string> = {
    splash: "waiting",
    "pick-story": "pick-story",
    "game-settings": "story-settings",
    "tower-connect": "tower-choice",
    "claim-heroes": "claim",
    setup: "base-board-setup",
    begin: "waiting",
    "pick-game": "session-screen",
    play: "play",
    pause: "paused",
    session: "session-screen",
    goodbye: "session-over",
    "not-playable": "pick-story",
  };
  return mapped[state.screen] ?? "play";
};

const gearSnapshot = (state: ShellState): GearView => {
  const story = chosenOrBound(state);
  const inGame = state.screen === "play" || state.screen === "pause";
  const sessionScreen =
    state.screen === "session" || state.screen === "goodbye" || state.screen === "pick-game";
  return {
    paused: state.gearPaused || state.stage === "paused",
    panel: state.gearPanel,
    owner: state.gearOwner,
    picked: state.gearPicked,
    volume: state.towerVolume,
    pieceChecks: state.gearPieceChecks,
    opens: state.gearOpens,
    card: state.gearCard,
    inGame,
    towerConnected: state.tower.connection === "connected",
    sessionScreen,
    beforeBegin: !inGame && !sessionScreen,
    partySplit: state.partySplit,
    party: (story?.heroes ?? []).map((hero) => ({
      id: hero.id,
      name: hero.name,
      hp: "unavailable",
      gold: "unavailable",
      items: "unavailable",
      corruptions: "unavailable",
      holder: state.holdings[hero.id] ?? null,
    })),
    cards: LOOKUP_CARDS.map((card) => ({ id: card.id, title: card.title })),
    joinUrl: null,
    setupSteps:
      state.setupSteps.length > 0
        ? state.setupSteps.map((step) => step.label)
        : [
            "Set the tower on the board.",
            "Lay out the board, kingdom edges matched.",
            "Sort the pieces: heroes, foes, skulls.",
          ],
    helpScreen: helpScreenFor(state),
    firstHero: state.gearFirstHero,
  };
};

export const projectShellView = (state: ShellState): ViewState => {
  const story = chosenOrBound(state);
  const screen = state.screen;
  const title = story?.card.title ?? "Story";
  const heroes = (story?.heroes ?? []).map((hero) => ({
    id: hero.id,
    name: hero.name,
    deviceId: state.holdings[hero.id] ?? null,
    lines:
      isSetupScreen(screen) && screen !== "claim-heroes"
        ? [{ id: `${screen}.private.${hero.id}`, text: `Only ${hero.name} hears this.` }]
        : [],
  }));

  const actions: ViewState["actions"] = state.offered.map((offer) =>
    offer.open
      ? {
          promptId: offer.promptId,
          actionId: offer.actionId,
          label: labelFor(state, offer.promptId, offer.actionId),
          ...slotFor(state, offer.promptId, offer.actionId),
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

  const screenLevel: LoopLevel = {
    id: screen,
    label: screenLabel(state),
    shows: showsFor(state, title, story),
  };
  const momentId = openingMomentId(state);

  const settings =
    screen === "game-settings"
      ? (story?.settings ?? []).map((setting) => {
          const optionId = state.settingValues[setting.id] ?? setting.default;
          return {
            id: setting.id,
            label: setting.label,
            optionId,
            options: setting.options.map((option) => ({ id: option.id, label: option.label })),
          };
        })
      : undefined;

  return {
    screen,
    levels: [...startupLevels(state, story), screenLevel],
    heroes,
    actions,
    ...(settings && settings.length > 0 ? { settings } : {}),
    narration: momentId ? { lineId: momentId, text: OPENING_PLACEHOLDER } : null,
    table: momentId ? null : buildTable(state, title),
    place: momentId ? null : buildPlace(state),
    gear: gearSnapshot(state),
  };
};
