import {
  OPENING_MOMENTS,
  OPENING_PLACEHOLDER,
  openingActiveIndex,
} from "../../../protocols/opening.ts";
import type { GearView } from "../../../protocols/v2/views.ts";
import { comingDrop, dayPhaseView, rollView } from "../../views/day.ts";
import type {
  DaySkullView,
  LoopLevel,
  PlaceStill,
  TableBand,
  ViewState,
} from "../../views/state.ts";
import { type CompassSlot, slottedNeighborsOf } from "../chapter/board.ts";
import { ensureClock, heroCount, heroSheet, isFallen } from "../day/clock.ts";
import type { DayLocal } from "../day/loop.ts";
import { daysLeft } from "../day/rules.ts";
import type { EncounterLocal } from "../encounter/loop.ts";
import { partySize } from "../game/setupFlow.ts";
import type { GroupTurnLocal } from "../group-turn/loop.ts";
import { BOARD_SET_UP_PROMPT } from "./enter.ts";
import {
  canContinue,
  DONE_LINE,
  EMPTY_GAMES_LINE,
  gameNumber,
  PLAY_AGAIN_LINE,
  PLAY_AGAIN_TITLE,
  RATING_LABEL,
  RATING_OPTIONS,
  RATING_SETTING,
  RATING_UNSET,
  REPLACE_SAVE_LINE,
  SESSION_OVER_LINE,
  statsLines,
  TOWER_LOST,
  towerLine,
} from "./hub.ts";
import type { ShellStory } from "./pack.ts";
import { isPlaceBuilding, PLACE_CAPTION, PLACE_STILL_ID } from "./placeCaption.ts";
import { soundActions, soundStepOnBoard, VOLUME_LINE, volumeLineLive } from "./sound.ts";
import type { ShellState } from "./state.ts";
import { towerReady } from "./tower.ts";

/** Matches protocol v2 setup screens (private lines on these only). */
const SETUP_SCREENS = new Set(["pick-story", "game-settings", "claim-heroes", "setup", "begin"]);

const isSetupScreen = (screen: ViewState["screen"]): boolean => SETUP_SCREENS.has(screen);

const buildingTitle = (building: string): string =>
  building.charAt(0).toUpperCase() + building.slice(1);

const labelFor = (state: ShellState, promptId: string, actionId: string): string => {
  if (promptId === BOARD_SET_UP_PROMPT) return "Board is set up";
  if (promptId === "continue-begin") return "Begin";
  const game = gameNumber(promptId);
  if (game !== null && actionId === "open-game") return `Game ${game}`;
  if (promptId === "continue-claim-heroes") return state.playAgain ? "Confirm" : "Continue";
  if (promptId.startsWith("continue-setup-")) return "Done";
  if (promptId.startsWith("day-") && promptId.endsWith("-roll-done")) return "Take the move roll";
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
  if (actionId === "record") {
    // Skull placement (DEC-092): one button per standing building, or the skull stayed inside (DEC-064).
    const target = promptId.split("--").slice(2).join("--");
    if (target === "inside") return "The skull stayed inside";
    return state.play?.content.board.spaceById.get(target)?.name ?? "Record";
  }
  if (actionId === "split") {
    const heroId = promptId.split("--").slice(2).join("--");
    return `Split ${heroName(state, heroId)} off`;
  }
  if (actionId === "join") {
    const other = state.play?.groups.find((row) => row.id === promptId.split("--")[2]);
    return `Join ${other ? groupName(state, other.heroIds, other.id) : "the groups"}`;
  }
  if (promptId === "regroup-done") return "Stay as you are";
  if (promptId.startsWith("continue-pick-story-")) {
    const id = promptId.slice("continue-pick-story-".length);
    const story = state.stories.find((entry) => entry.card.id === id);
    return story ? `Choose ${story.card.title}` : "Choose";
  }
  if (actionId === "continue") return "Continue";
  if (actionId === "back") return "Back";
  if (actionId === "new-game") return "New game";
  if (actionId === "play-again") return "Play again";
  if (actionId === "done-for-tonight") return "Done for tonight";
  // The pause's buttons are short words (DEC-301); the Menu's is Quit story.
  if (actionId === "quit-story") return promptId.startsWith("pause-") ? "Quit" : "Quit story";
  if (actionId === "reconnect") return "Reconnect";
  if (actionId === "go-on-without") return "Go on without";
  if (actionId === "reconnect-cancel") return "Cancel";
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

/**
 * Without the tower the board names where each skull landed, so the table can place it
 * (DEC-305; the board is otherwise drawn as with the tower).
 */
const simulatedSkullLine = (state: ShellState): string | null => {
  const play = state.play;
  if (!play) return null;
  const day = state.loops.stack.find((frame) => frame.loopId === "day");
  if (!day || (day.local as DayLocal).phase !== "skull-sim") return null;
  const lines = ensureClock(play).nightDrops.map((drop) => {
    const space = play.content.board.spaceById.get(drop.spaceId);
    const building = space?.building ? buildingTitle(space.building) : "a building";
    return `A skull falls on ${building}.`;
  });
  return lines.length > 0 ? lines.join(" ").slice(0, 120) : null;
};

const groupName = (state: ShellState, heroIds: readonly string[], fallback: string): string => {
  const first = heroIds[0];
  return first ? heroName(state, first) : fallback;
};

/**
 * The day panels for the board (C3 feature 11): roll terms, days left, the coming drop,
 * effects lines, skull placement and hero corruptions. Read from the day clock only.
 */
const buildDayPanels = (
  state: ShellState,
): Pick<
  TableBand,
  "daysLeft" | "threat" | "phase" | "rolls" | "effects" | "skull" | "corruptions"
> => {
  const play = state.play;
  if (!play) return {};
  const clock = ensureClock(play);
  const heroes = heroCount(play);
  const dayFrame = state.loops.stack.find((frame) => frame.loopId === "day");
  const local = dayFrame ? (dayFrame.local as DayLocal) : undefined;
  const phase = dayPhaseView(local?.phase, clock.effects.length > 0);

  const rolls = play.turnOrder.flatMap((groupId) => {
    const shift = clock.shifts[groupId];
    const group = play.groups.find((row) => row.id === groupId);
    if (!shift || !group) return [];
    return [rollView({ groupId, name: groupName(state, group.heroIds, groupId), shift })];
  });

  let skull: DaySkullView | null = null;
  if (phase === "skull" || phase === "skull-sim") {
    const board = play.content.board;
    const last = clock.nightDrops.at(-1);
    const space = last ? board.spaceById.get(last.spaceId) : undefined;
    const kingdomId =
      phase === "skull-sim" ? last?.kingdom : (clock.expectKingdom ?? clock.pendingKingdoms[0]);
    const kingdomLabel = kingdomId
      ? (board.kingdoms.find((row) => row.id === kingdomId)?.label ?? kingdomId)
      : null;
    const buildings = board.spaces
      .filter((row) => row.building && (!kingdomId || row.kingdom === kingdomId))
      .map((row) => ({
        spaceId: row.id,
        name: row.name,
        skulls: clock.skulls[row.id] ?? 0,
        fallen: isFallen(play, row.id),
      }));
    const fell = clock.nightDrops
      .filter((drop) => isFallen(play, drop.spaceId))
      .map((drop) => board.spaceById.get(drop.spaceId)?.name ?? drop.spaceId);
    skull = {
      kingdomLabel:
        phase === "skull-sim" && space
          ? (board.kingdoms.find((row) => row.id === space.kingdom)?.label ?? space.kingdom)
          : kingdomLabel,
      buildings,
      fell,
    };
  }

  const left = heroes < 1 ? null : daysLeft(clock.supply, heroes, play.dayNumber, clock.tuning);
  const corruptionHeroes = play.groups.flatMap((group) => group.heroIds);
  return {
    daysLeft: left,
    threat: comingDrop({
      heroes,
      night: play.dayNumber,
      questWon: clock.questsWon > 0,
      tuning: clock.tuning,
    }),
    phase,
    rolls,
    effects: [...clock.effects],
    skull,
    corruptions: corruptionHeroes.map((heroId) => ({
      heroId,
      heroName: heroName(state, heroId),
      count: heroSheet(clock, heroId).corruptions,
    })),
  };
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

  const skullLine = simulatedSkullLine(state);
  const actingHeroId = actingId;
  const actingName = actingHeroId ? heroName(state, actingHeroId) : null;
  const rolled = actingHeroId ? play.dayRolls[actingHeroId] : undefined;
  const dayPanels = buildDayPanels(state);

  return {
    chapter,
    day: play.dayNumber,
    ...dayPanels,
    health: "unavailable",
    purse: "unavailable",
    actingGroup: actingName,
    actingHeroId,
    movesLeft,
    moveRoll: rolled ?? null,
    modifier: "none",
    waitingFor: skullLine ?? (waiting && actingName ? `${actingName} is choosing` : null),
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

const JOIN_LINE = "Scan with each iPad. Then pick who this iPad speaks for at the table.";
/** SCR-022: the approved mockup wording, one line per step. */
export const BASE_BOARD_STEPS = [
  "Set the tower on the board.",
  "Lay out the board, kingdom edges matched.",
  "Sort the pieces: heroes, foes, skulls.",
] as const;
const TOWER_QUESTION = "Wake the tower, or play tonight without it?";
const TOWER_FAILED_LINE = "The tower did not answer. Try again, or play without it.";

const LEVEL_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

const STEP_NAME: Record<ShellState["screen"], string> = {
  "table-join": "Join",
  "base-board": "Base board",
  "tower-choice": "Tower",
  "tower-wake": "Tower",
  "pick-story": "Pick Story",
  "game-settings": "Game settings",
  "claim-heroes": "Party Join",
  setup: "Setup",
  begin: "Begin",
  play: "Play",
  pause: "Paused",
  session: "Session",
  "session-over": "Session over",
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
  if (state.screen === "pause" && state.pause?.cause === "tower-lost") return TOWER_LOST;
  if ((state.screen === "play" || state.screen === "pause") && state.play) {
    return `Day ${state.play.dayNumber}`;
  }
  if (state.screen === "table-join") return JOIN_LINE;
  if (state.screen === "base-board") return BASE_BOARD_STEPS.join("\n");
  if (state.screen === "tower-choice") {
    return state.enter?.failed ? TOWER_FAILED_LINE : TOWER_QUESTION;
  }
  if (state.screen === "tower-wake") {
    if (state.reconnect) {
      return state.reconnect.step === "calibrate"
        ? "The tower is awake. Calibrate it from an iPad."
        : "Calling the tower back...";
    }
    if (state.enter?.step === "calibrate") return "The tower is awake. Calibrate it from an iPad.";
    if (state.enter?.step === "calibrating") return "Calibrating the tower...";
    return "Waking the tower...";
  }
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
  // The session screen's line is the tower's state, or the question while one is asked (SCR-021).
  if (state.screen === "session") {
    if (state.confirm === "new-game") return REPLACE_SAVE_LINE;
    if (state.confirm === "play-again") return `${PLAY_AGAIN_LINE}\n${REPLACE_SAVE_LINE}`;
    if (state.confirm === "done") return DONE_LINE;
    if (state.statsGame !== null) return `Game ${state.statsGame}`;
    return towerLine(state);
  }
  if (state.screen === "session-over") return SESSION_OVER_LINE;
  return title;
};

/**
 * Public lines the Story board paints. The screen line stays last so an iPad's
 * `shows` text stays that line. Join is added later and must keep the total at 8.
 */
const sessionLevels = (state: ShellState): LoopLevel[] => {
  const levels: LoopLevel[] = [];
  if (state.confirm) {
    const asked = {
      done: { label: "Done for tonight", shows: DONE_LINE },
      "new-game": { label: "New game", shows: REPLACE_SAVE_LINE },
      "play-again": {
        label: PLAY_AGAIN_TITLE,
        shows: `${PLAY_AGAIN_LINE}\n${REPLACE_SAVE_LINE}`,
      },
    }[state.confirm];
    levels.push({ id: "session-confirm", ...asked });
    return levels;
  }
  const open = state.statsGame === null ? undefined : state.games[state.statsGame - 1];
  if (open && state.statsGame !== null) {
    const title = state.stories.find((story) => story.card.id === open.storyId)?.card.title;
    levels.push({
      id: "game-stats",
      label: `Game ${state.statsGame}`,
      shows: statsLines(open, title ?? open.storyId).join("\n"),
    });
    // The last iPad leaving still brings the join QR (DEC-712).
    if (state.devices.size === 0)
      levels.push({ id: "session-dropped", label: "Join", shows: JOIN_LINE });
    return levels;
  }
  if (canContinue(state)) {
    levels.push({ id: "session-continue", label: "Continue", shows: "A saved game can continue." });
  }
  // Newest first, each marked by how it ended.
  const rows = state.games.map((game, index) => `Game ${index + 1} ${game.outcome}`).reverse();
  levels.push({
    id: "session-games",
    label: "Tonight's games",
    shows: rows.length > 0 ? rows.join("\n") : EMPTY_GAMES_LINE,
  });
  // Every iPad dropped between games: the board shows the join QR until one joins (DEC-712).
  if (state.devices.size === 0) {
    levels.push({ id: "session-dropped", label: "Join", shows: JOIN_LINE });
  }
  return levels;
};

const startupLevels = (state: ShellState, story: ShellStory | undefined): LoopLevel[] => {
  if (state.screen === "play" || state.screen === "pause") return [];
  const leading: LoopLevel[] = [];
  if (state.screen === "session") leading.push(...sessionLevels(state));
  if (state.screen === "pick-story") {
    for (const entry of state.stories.slice(0, 5)) {
      const door = doorLevel(entry, entry.card.id === state.focusStoryId);
      if (door) leading.push(door);
    }
  }
  if (soundStepOnBoard(state)) {
    // Greyed until the first iPad has tapped Enable sound; full strength from then on.
    leading.push({
      id: volumeLineLive(state) ? "volume-line" : "volume-line-off",
      label: "Volume",
      shows: VOLUME_LINE,
    });
  }
  if (state.screen === "game-settings") leading.push(...settingLevels(state, story));
  leading.push(statusLevel(state));
  return leading.slice(0, 6);
};

const screenLabel = (state: ShellState): string => {
  if (state.screen === "tower-choice" && state.enter?.failed) return "Tower not found";
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
  // The day on the board (C3 feature 11): once the opening is over and the day loop runs.
  if (
    state.screen === "play" &&
    !openingMomentId(state) &&
    state.loops.stack.some((frame) => frame.loopId === "day")
  ) {
    return "day-on-the-board";
  }
  const mapped: Record<string, string> = {
    splash: "waiting",
    "pick-story": "pick-story",
    "game-settings": "story-settings",
    "base-board": "base-board-setup",
    "tower-choice": "tower-choice",
    "tower-wake": "connecting",
    "claim-heroes": "claim",
    setup: "base-board-setup",
    begin: "waiting",
    play: "play",
    pause: "paused",
    session: "session-screen",
    "session-over": "session-over",
    "not-playable": "pick-story",
  };
  return mapped[state.screen] ?? "play";
};

const gearSnapshot = (state: ShellState): GearView => {
  const story = chosenOrBound(state);
  const inGame = state.screen === "play" || state.screen === "pause" || state.reconnect !== null;
  const sessionOver = state.screen === "session-over";
  const sessionScreen = state.screen === "session" || sessionOver;
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
    // "Connected" here means in use: after Go on without the Menu offers the Tower again (DEC-301).
    towerConnected: state.towerLinked && state.tower.connection === "connected",
    sessionScreen,
    sessionOver,
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

  actions.push(...soundActions(state));

  const screenLevel: LoopLevel = {
    id: screen,
    label: screenLabel(state),
    shows: showsFor(state, title, story),
  };
  const momentId = openingMomentId(state);

  const ratedGame = state.statsGame === null ? undefined : state.games[state.statsGame - 1];
  const settings =
    screen === "session" && ratedGame && !state.confirm
      ? [
          {
            id: RATING_SETTING,
            label: RATING_LABEL,
            optionId: ratedGame.rating === null ? RATING_UNSET : String(ratedGame.rating),
            options: RATING_OPTIONS.map((rating) => ({ id: rating, label: rating })),
          },
        ]
      : screen === "game-settings"
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
