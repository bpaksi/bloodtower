import {
  OPENING_MOMENTS,
  OPENING_PLACEHOLDER,
  openingActiveIndex,
} from "../../../protocols/opening.ts";
import { AUTO_ADVANCE_MS, type GearView, type HintView } from "../../../protocols/v2/views.ts";
import {
  HINT_TEXT,
  HINTS_COPY,
  HINTS_OFF,
  HINTS_ON,
  HINTS_SETTING_ID,
  RULES_GROUP,
  RULES_PAGES,
  rulesPage,
} from "../../hints/copy.ts";
import { inNightPhase } from "../../hints/flow.ts";
import { heldItems, itemName } from "../../rules/items/index.ts";
import { isPurseAmount, poolSides } from "../../rules/purse/index.ts";
import { virtueName } from "../../rules/virtues/index.ts";
import { comingDrop, dayPhaseView, rollView } from "../../views/day.ts";
import type {
  BuildingPanelView,
  ChanceView,
  DaySkullView,
  EventSceneView,
  GroupsCardView,
  LoopLevel,
  PlaceStill,
  TableBand,
  ViewState,
  VirtuePanelView,
} from "../../views/state.ts";
import { type CompassSlot, slottedNeighborsOf } from "../chapter/board.ts";
import { ensureClock, heroCount, heroSheet, isFallen } from "../day/clock.ts";
import { type DayLocal, eventChoicePromptId, parseEventChoicePrompt } from "../day/loop.ts";
import { partyIsSplit, regroupPicks, regroupQueue } from "../day/regroup.ts";
import { splitShiftOf } from "../day/roll.ts";
import { daysLeft } from "../day/rules.ts";
import type { EncounterLocal } from "../encounter/loop.ts";
import {
  COPY as BUILDING_COPY,
  buildingModel,
  corruptionName,
  rallyResult,
  virtueResult,
} from "../encounter/menu.ts";
import {
  eventOptions,
  eventState,
  eventTuningFrom,
  type OptionId,
  refreshLedger,
} from "../event/index.ts";
import {
  onPurseStep,
  PURSE_STEP_LABEL,
  partySize,
  SPIN_ACTION,
  towerSpins,
} from "../game/setupFlow.ts";
import { type GroupTurnLocal, virtuePanelOf, virtuePromptId } from "../group-turn/loop.ts";
import { BOARD_SET_UP_PROMPT } from "./enter.ts";
import { fixPositionRefusal } from "./gear.ts";
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
import type { ShellStory, StorySetting } from "./pack.ts";
import { isPlaceBuilding, PLACE_CAPTION, PLACE_STILL_ID } from "./placeCaption.ts";
import { soundActions, soundStepOnBoard, VOLUME_LINE } from "./sound.ts";
import type { HintHold, ShellState } from "./state.ts";
import { towerReady } from "./tower.ts";

/** Matches protocol v2 setup screens (private lines on these only). */
const SETUP_SCREENS = new Set(["pick-story", "game-settings", "claim-heroes", "setup", "begin"]);

const isSetupScreen = (screen: ViewState["screen"]): boolean => SETUP_SCREENS.has(screen);

const buildingTitle = (building: string): string =>
  building.charAt(0).toUpperCase() + building.slice(1);

/**
 * The words of an event choice (Copy table, C3/12): hazard.cost.hp.label, choice.go-around and
 * choice.pay-off. The lose-a-turn cost has no line in the Copy table yet, so it reads a plain
 * placeholder until Loremaster writes one.
 */
const eventOptionLabel = (id: OptionId | undefined): string => {
  const tuning = eventTuningFrom();
  switch (id) {
    case "hit-points":
      return `Lose ${Math.abs(tuning.hazardHitPoints)} hit points`;
    case "lose-turn":
      return "Lose a turn";
    case "go-around":
      return "Go around";
    case "pay-off":
      return `Pay them off (${tuning.payOff} gold)`;
    case "fight":
      return "Fight";
    default:
      return "Choose";
  }
};

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
  if (actionId === "choose") return eventOptionLabel(parseEventChoicePrompt(promptId)?.optionId);
  if (actionId === "build") return buildingLabel(state, promptId);
  if (actionId === "end-turn") return "End turn";
  if (actionId === "record") {
    // Skull placement (DEC-092): one button per standing building, or the skull stayed inside (DEC-064).
    const target = promptId.split("--").slice(2).join("--");
    if (target === "inside") return "The skull stayed inside";
    return state.play?.content.board.spaceById.get(target)?.name ?? "Record";
  }
  if (promptId.startsWith("continue-pick-story-")) {
    const id = promptId.slice("continue-pick-story-".length);
    const story = state.stories.find((entry) => entry.card.id === id);
    return story ? `Choose ${story.card.title}` : "Choose";
  }
  if (actionId === SPIN_ACTION) return "Spin";
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

/** The words on a building button, read from the menu step the encounter is on. */
const buildingLabel = (state: ShellState, promptId: string): string => {
  const top = state.loops.stack.at(-1);
  if (!state.play || top?.loopId !== "encounter") return "Choose";
  const model = buildingModel(state.play, top.local as EncounterLocal, (id) => heroName(state, id));
  return model.options.find((option) => option.promptId === promptId)?.label ?? "Choose";
};

/** Why a closed building button is closed (UI-043): the menu's own reason, never "Already taken". */
const buildingReason = (state: ShellState, promptId: string): string => {
  const top = state.loops.stack.at(-1);
  if (!state.play || top?.loopId !== "encounter") return "Already taken.";
  const model = buildingModel(state.play, top.local as EncounterLocal, (id) => heroName(state, id));
  return (
    model.options.find((option) => option.promptId === promptId)?.reason ?? "Not possible now."
  );
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

/** A hero's name from the stories the table loaded, or the id when none names it. */
export const heroName = (state: ShellState, heroId: string): string => {
  for (const story of state.stories) {
    const hero = story.heroes.find((row) => row.id === heroId);
    if (hero) return hero.name;
  }
  return heroId;
};

/**
 * Without the tower the board names where each skull landed, one line per skull in drop order,
 * so the table can place it (DEC-305, PT-07). No line is cut, joined or dropped.
 */
const simulatedSkullLines = (state: ShellState): string[] => {
  const play = state.play;
  if (!play) return [];
  const day = state.loops.stack.find((frame) => frame.loopId === "day");
  if (!day || (day.local as DayLocal).phase !== "skull-sim") return [];
  return ensureClock(play).nightDrops.map((drop) => {
    const space = play.content.board.spaceById.get(drop.spaceId);
    const building = space?.building ? buildingTitle(space.building) : "a building";
    return `A skull falls on ${building}.`;
  });
};

const onSkullSim = (state: ShellState): boolean =>
  state.loops.stack.some(
    (frame) => frame.loopId === "day" && (frame.local as DayLocal).phase === "skull-sim",
  );

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
  "daysLeft" | "threat" | "phase" | "rolls" | "effects" | "skull" | "corruptions" | "groupsCard"
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
    return [
      rollView({
        groupId,
        name: groupName(state, group.heroIds, groupId),
        shift: { ...shift, split: splitShiftOf(shift) },
      }),
    ];
  });

  // The groups card: only while the roll of a day whose start applied a queued change (Q4.1).
  const groupsCard: GroupsCardView | null =
    local?.phase === "roll" && play.regroupCardDay === play.dayNumber && play.dayNumber > 0
      ? {
          day: play.dayNumber,
          holdMs: AUTO_ADVANCE_MS,
          groups: play.turnOrder.flatMap((groupId) => {
            const group = play.groups.find((row) => row.id === groupId);
            if (!group || group.heroIds.length === 0) return [];
            return [{ groupId, heroNames: group.heroIds.map((id) => heroName(state, id)) }];
          }),
        }
      : null;

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
      ...(phase === "skull-sim" ? { lines: simulatedSkullLines(state) } : {}),
    };
  }

  // DEC-947: count from the next counted night; a quest won today adds tonight, which it spends.
  const tonight = clock.nightsCounted + 1;
  const questSkipsTonight = clock.questsWon > 0 && clock.tuning.questSkips;
  const left =
    heroes < 1
      ? null
      : daysLeft(clock.supply, heroes, tonight, clock.tuning) + (questSkipsTonight ? 1 : 0);
  const corruptionHeroes = play.groups.flatMap((group) =>
    group.heroIds.map((heroId) => ({ heroId, panelHeroId: group.heroIds[0] ?? heroId })),
  );
  return {
    daysLeft: left,
    threat: comingDrop({
      heroes,
      night: tonight,
      questWon: clock.questsWon > 0,
      tuning: clock.tuning,
    }),
    phase,
    rolls,
    // Effects belong to the live day only: none once the day loop has left the stack.
    effects: phase === "effects" ? [...clock.effects] : [],
    skull,
    corruptions: corruptionHeroes.map(({ heroId, panelHeroId }) => ({
      heroId,
      heroName: heroName(state, heroId),
      panelHeroId,
      count: heroSheet(clock, heroId).corruptions,
    })),
    groupsCard,
  };
};

type ActingGroup = {
  /** The acting group's id (the id of its lead hero), or null when no group acts. */
  actingId: string | null;
  movesLeft: number | null;
  waiting: boolean;
};

/**
 * Which group acts now, read from the loop stack (the Story board's "whose turn" and the use-item
 * rule share it, so they cannot disagree). A game with no play state has no acting group.
 */
export const actingGroupOf = (state: ShellState): ActingGroup => {
  const play = state.play;
  let actingId: string | null = null;
  let movesLeft: number | null = null;
  let waiting = false;
  if (!play) return { actingId, movesLeft, waiting };

  for (const frame of [...state.loops.stack].reverse()) {
    if (frame.loopId === "encounter") {
      const local = frame.local as EncounterLocal;
      actingId = local.groupId;
      waiting = true;
      if (local.movesLeft !== undefined) movesLeft = local.movesLeft;
      continue;
    }
    if (frame.loopId === "group-turn") {
      const local = frame.local as GroupTurnLocal;
      actingId = actingId ?? local.groupId;
      movesLeft = movesLeft ?? local.movesLeft;
      if (!waiting) waiting = local.awaitingPress;
      break;
    }
    if (frame.loopId === "day") {
      const local = frame.local as DayLocal;
      if (local.phase === "event" && local.eventGroup) {
        // The event scene belongs to the group that just moved, not to the next one in order.
        actingId = local.eventGroup;
        break;
      }
      const index = local.phase === "roll" ? 0 : local.groupIndex;
      actingId = play.turnOrder[index] ?? play.turnOrder[0] ?? null;
      waiting = local.awaitingPress && local.phase !== "done";
      break;
    }
  }
  return { actingId, movesLeft, waiting };
};

/** The prompt line when a virtue asks a choice (Loremaster, `virtue.choice.prompt`). */
const virtueAsks = (name: string) => `${name} asks you to choose.`;

/** The building menu (C3/13): only while the encounter is on top of the loops. */
const buildBuilding = (state: ShellState): BuildingPanelView | null => {
  const play = state.play;
  const top = state.loops.stack.at(-1);
  if (!play || top?.loopId !== "encounter") return null;
  const local = top.local as EncounterLocal;
  const group = play.groups.find((row) => row.id === local.groupId);
  const model = buildingModel(play, local, (id) => heroName(state, id));
  let result: BuildingPanelView["result"] = null;
  if (model.result) {
    const done = model.result;
    const who = done.heroId ? heroName(state, done.heroId) : null;
    const hp = done.hp ? `${done.hp.hp}/${done.hp.max}` : null;
    const line =
      done.pick === "rally"
        ? rallyResult(done.hp?.gained ?? 0)
        : done.pick === "virtue-draw"
          ? virtueResult(virtueName(done.tile ?? ""))
          : done.pick === "cure"
            ? BUILDING_COPY.cureResult
            : done.pick === "rest"
              ? BUILDING_COPY.restResult
              : BUILDING_COPY.cleanseResult;
    result = {
      pick: done.pick,
      line,
      detail:
        done.pick === "cure"
          ? [who, done.corruptionId ? corruptionName(done.corruptionId) : null]
              .filter(Boolean)
              .join(" · ") || null
          : who && hp
            ? `${who} ${hp}`
            : null,
      badge: done.pick === "cleanse" ? BUILDING_COPY.cleanseBadge : null,
      auto: done.auto,
    };
  }
  return {
    title: model.title,
    step: model.step,
    heroIds: group ? [...group.heroIds] : [],
    prompt: model.prompt,
    // Leave is its own action on the actions list, never a `build` press.
    options: model.options
      .filter((option) => option.actionId === "build")
      .map((option) => ({
        promptId: option.promptId,
        label: option.label,
        detail: option.detail ?? null,
        enabled: option.enabled,
        reason: option.reason ?? null,
      })),
    result,
    holdMs: AUTO_ADVANCE_MS,
    skulls: group ? (ensureClock(play).skulls[group.spaceId] ?? 0) : 0,
    movesLeft: local.movesLeft ?? null,
  };
};

/** The turn-start virtue panel (CU/14): only while a group's turn is on top of the loops. */
const buildVirtue = (state: ShellState): VirtuePanelView | null => {
  const play = state.play;
  const top = state.loops.stack.at(-1);
  if (!play || top?.loopId !== "group-turn") return null;
  const local = top.local as GroupTurnLocal;
  const panel = virtuePanelOf(play, local);
  if (!panel) return null;
  const group = play.groups.find((row) => row.id === local.groupId);
  const choice = panel.choice
    ? {
        virtueId: panel.choice.virtueId,
        prompt: virtueAsks(virtueName(panel.choice.virtueId)),
        options: panel.choice.options.map((option) => ({
          promptId: virtuePromptId(local.groupId, panel.choice?.virtueId ?? "", option.id),
          label: option.label,
          enabled: option.enabled,
        })),
      }
    : null;
  return {
    title: panel.title,
    heroIds: group ? [...group.heroIds] : [],
    lines: panel.lines,
    choice,
    picked: Object.entries(local.virtue?.picks ?? {}).map(([virtueId, pick]) => ({
      virtueId,
      name: virtueName(virtueId),
      label: pick.label,
    })),
  };
};

/** The event scene (C3/12): only while the day loop is at an event. Words come from the board. */
const buildEvent = (state: ShellState): EventSceneView | null => {
  const play = state.play;
  const day = state.loops.stack.find((frame) => frame.loopId === "day");
  const local = day?.local as DayLocal | undefined;
  if (!play || !local || local.phase !== "event" || !local.eventGroup) return null;
  const event = eventState(play).open;
  const group = play.groups.find((row) => row.id === local.eventGroup);
  if (!event || !group || event.groupId !== group.id) return null;
  const clock = ensureClock(play);
  const stage = local.eventStage ?? "choose";
  if (event.status === "open") refreshLedger(play, group.id);
  const options =
    stage === "choose" && event.status === "open"
      ? eventOptions(play, eventTuningFrom()).map((option) => ({
          promptId: eventChoicePromptId(group.id, option.id),
          optionId: option.id,
          enabled: option.enabled,
        }))
      : [];
  const heroes = group.heroIds.map((heroId) => {
    const sheet = heroSheet(clock, heroId);
    return {
      heroId,
      name: heroName(state, heroId),
      hp: sheet.hp ? { hp: sheet.hp.hp, max: sheet.hp.max } : null,
      gold: sheet.gold ?? null,
    };
  });
  const known = heroes.every((hero) => hero.gold !== null);
  const result = event.result ?? null;
  return {
    groupId: group.id,
    heroIds: [...group.heroIds],
    type: event.type,
    hazard: event.hazard,
    offer: event.offer,
    stage,
    options,
    result:
      result?.kind === "saved"
        ? { ...result, counterName: heroName(state, result.counterHeroId) }
        : result,
    line: event.line ?? null,
    heroes,
    // The pool (DEC-911, DEC-944): the heroes present plus every other seated hero's gold.
    purse: known
      ? heroes.reduce((sum, hero) => sum + (hero.gold ?? 0), 0) +
        poolSides(play, group.id).absent.reduce(
          (sum, id) => sum + (heroSheet(clock, id).gold ?? 0),
          0,
        )
      : null,
  };
};

/** Board lines for the spin's result (Loremaster, `chance.result` and `chance.notower`). */
const chanceResult = (amount: number, tower: boolean) =>
  tower ? `The lights stop on ${amount} gold.` : `The wheel stops on ${amount} gold.`;

/** The starting-purse step's board panel (CU/15): only while that setup step is on screen. */
const buildChance = (state: ShellState): ChanceView | null => {
  if (!onPurseStep(state)) return null;
  const purse = state.startingPurse;
  if (purse === null) {
    return { title: PURSE_STEP_LABEL, amount: null, line: null, cue: state.purseCue };
  }
  if (!isPurseAmount(purse)) {
    return { title: PURSE_STEP_LABEL, amount: "unavailable", line: null, cue: state.purseCue };
  }
  return {
    title: PURSE_STEP_LABEL,
    amount: purse,
    line: chanceResult(purse, towerSpins(state)),
    cue: state.purseCue,
  };
};

const buildTable = (state: ShellState, chapter: string): TableBand | null => {
  if (state.screen !== "play" && state.screen !== "pause") return null;
  const play = state.play;
  if (!play) return null;
  const board = play.content.board;

  const { actingId, movesLeft, waiting } = actingGroupOf(state);

  const actingHeroId = actingId;
  const actingName = actingHeroId ? heroName(state, actingHeroId) : null;
  const rolled = actingHeroId ? play.dayRolls[actingHeroId] : undefined;
  const dayPanels = buildDayPanels(state);

  return {
    chapter,
    day: play.dayNumber,
    ...dayPanels,
    virtue: buildVirtue(state),
    event: buildEvent(state),
    building: buildBuilding(state),
    health: "unavailable",
    purse: "unavailable",
    actingGroup: actingName,
    actingHeroId,
    movesLeft,
    moveRoll: rolled ?? null,
    modifier: "none",
    // The no-tower skull lines sit in the skull panel (PT-07), not in a second waiting box.
    // Nor in a box over the groups card (CU/04): both sit centred on the board.
    waitingFor:
      waiting && actingName && !onSkullSim(state) && !dayPanels.groupsCard
        ? `${actingName} is choosing`
        : null,
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
        ...(space?.building && isFallen(play, group.spaceId) ? { fallen: true } : {}),
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

/** The first-time hint on the board (CU/09). Under a place's art it is a caption, never a Scroll. */
const buildHint = (state: ShellState): HintView | null => {
  if (!state.hint || state.screen !== "play") return null;
  const text = HINT_TEXT[state.hint];
  if (!text) return null;
  return {
    id: state.hint,
    text,
    caption: buildPlace(state) !== null,
    holdMs: AUTO_ADVANCE_MS,
    // TODO(CU/09): the narrator clips (Charon) are not recorded yet; `voiceId` stays null until
    // asset-studio packs one per hint id, then it carries the hint id for the board to play.
    voiceId: null,
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

/** The engine's own rows come first in every story (DEC-639); the story's own follow. */
const ENGINE_SETTING_IDS = ["length", "difficulty", "party-size"];

const HINTS_ROW: StorySetting = {
  id: HINTS_SETTING_ID,
  label: HINTS_COPY.label,
  options: [
    { id: HINTS_ON, label: HINTS_COPY.on },
    { id: HINTS_OFF, label: HINTS_COPY.off },
  ],
  default: HINTS_ON,
};

/** Game settings rows in order: the engine's rows, then Hints, then the story's own (CU/09). */
const settingRows = (story: ShellStory | undefined): StorySetting[] => {
  if (!story) return [];
  const engine = story.settings.filter((row) => ENGINE_SETTING_IDS.includes(row.id));
  const own = story.settings.filter((row) => !ENGINE_SETTING_IDS.includes(row.id));
  return [...engine, HINTS_ROW, ...own];
};

/** Room for the engine's three rows, Hints and one of the story's own on the board. */
const SETTING_LEVEL_CAP = 5;

const settingLevels = (state: ShellState, story: ShellStory | undefined): LoopLevel[] => {
  const levels: LoopLevel[] = [];
  for (const setting of settingRows(story)) {
    const id = `setting-${setting.id}`;
    if (!LEVEL_ID.test(id)) continue;
    const chosen = state.settingValues[setting.id] ?? setting.default;
    const option = setting.options.find((row) => row.id === chosen);
    levels.push({ id, label: setting.label, shows: option?.label ?? chosen });
    if (levels.length === SETTING_LEVEL_CAP) break;
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

/** The hero ids in `play.groups`: the party that plays, not the roster. */
const seatedHeroIds = (state: ShellState): string[] =>
  state.play?.groups.flatMap((group) => group.heroIds) ?? [];

const showsFor = (state: ShellState, title: string, story: ShellStory | undefined): string => {
  if (openingMomentId(state)) return OPENING_PLACEHOLDER;
  if (state.screen === "pause" && state.pause?.cause === "tower-lost") return TOWER_LOST;
  // The disconnect pause counts the seated heroes picked, as the Pick screen does (DEC-953).
  if (state.screen === "pause" && state.pause?.cause === "disconnect" && state.play) {
    const seated = seatedHeroIds(state);
    const held = seated.filter((heroId) => state.holdings[heroId] != null).length;
    return `${held} of ${seated.length} picked`;
  }
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
    if (!story) return "Nothing to set.";
    return settingRows(story)
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
    // Full strength from the first view, on the connect track only (DEC-903).
    leading.push({ id: "volume-line", label: "Volume", shows: VOLUME_LINE });
  }
  if (state.screen === "game-settings") leading.push(...settingLevels(state, story));
  leading.push(statusLevel(state));
  return leading.slice(0, 7);
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

const helpScreenFor = (state: ShellState): string => {
  if (state.screen === "pause" && state.pause?.cause === "tower-lost") return "tower-lost";
  if (
    state.screen === "play" &&
    !openingMomentId(state) &&
    state.loops.stack.at(-1)?.loopId === "encounter"
  ) {
    return "building-menu";
  }
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

/** The Split party panel: picks against the groups after the queue, and the queue (PT-18). */
const regroupSnapshot = (state: ShellState, inGame: boolean): NonNullable<GearView["regroup"]> => {
  const play = state.play;
  if (!play || !inGame) return { open: false, picks: [], queue: [] };
  const row = (entry: { kind: "split" | "join"; heroId: string }) => ({
    kind: entry.kind,
    heroId: entry.heroId,
    name: heroName(state, entry.heroId),
  });
  const picks = regroupPicks(play).map(row);
  const queue = regroupQueue(play).map(row);
  return { open: picks.length > 0, picks, queue };
};

/** Fix my position's picks: each group by its lead hero, every space by name (CU/05). */
const fixPositionSnapshot = (state: ShellState, inGame: boolean): GearView["fixPosition"] => {
  const play = state.play;
  if (!play || !inGame) return undefined;
  return {
    groups: play.groups.flatMap((group) => {
      const lead = group.heroIds[0];
      return lead ? [{ heroId: lead, name: heroName(state, lead), spaceId: group.spaceId }] : [];
    }),
    spaces: play.content.board.spaces.map((space) => ({ id: space.id, name: space.name })),
    refusal: fixPositionRefusal(state),
  };
};

/** The heroes of the group that acts now: the only ones who may use an item (CU/13, EV-20). */
const actingHeroes = (state: ShellState): string[] => {
  const { actingId } = actingGroupOf(state);
  const group = state.play?.groups.find((row) => row.id === actingId);
  return group ? [...group.heroIds] : [];
};

/**
 * One hero on the gear's party view. HP, gold and items come from the hero's sheet; a value the
 * game does not know reads "unavailable", never 0 (root CLAUDE.md, EV-13).
 */
const partyHero = (state: ShellState, heroId: string, name: string) => {
  const sheet = state.play ? heroSheet(ensureClock(state.play), heroId) : null;
  const held = state.play ? heldItems(state.play, heroId) : null;
  return {
    id: heroId,
    name,
    hp: sheet?.hp ? `${sheet.hp.hp}/${sheet.hp.max}` : "unavailable",
    gold: sheet?.gold !== undefined ? String(sheet.gold) : "unavailable",
    items: held ? `${held.length} held` : "unavailable",
    corruptions: "unavailable",
    holder: state.holdings[heroId] ?? null,
    heldItems: (held ?? []).map((id) => ({ id, name: itemName(id) ?? "unavailable" })),
  };
};

const gearSnapshot = (state: ShellState): GearView => {
  const story = chosenOrBound(state);
  const inGame = state.screen === "play" || state.screen === "pause" || state.reconnect !== null;
  const sessionOver = state.screen === "session-over";
  const sessionScreen = state.screen === "session" || sessionOver;
  const fix = fixPositionSnapshot(state, inGame && !sessionOver);
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
    partySplit: state.play ? partyIsSplit(state.play) : false,
    regroup: regroupSnapshot(state, inGame && !sessionOver),
    ...(fix ? { fixPosition: fix } : {}),
    party: (story?.heroes ?? []).map((hero) => partyHero(state, hero.id, hero.name)),
    actingHeroes: actingHeroes(state),
    cards: RULES_PAGES.map((card) => ({ id: card.id, title: card.title, group: RULES_GROUP })),
    cardTitle: rulesPage(state.gearCard)?.title ?? null,
    cardPage: rulesPage(state.gearCard)?.page ?? null,
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

const shownActions = (state: ShellState): ViewState["actions"] => {
  const offeredNow = state.hint && state.screen === "play" ? [] : state.offered;
  const actions: ViewState["actions"] = offeredNow.map((offer) =>
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
          reason:
            offer.actionId === "build" ? buildingReason(state, offer.promptId) : "Already taken.",
          deviceId: null,
        },
  );
  actions.push(...soundActions(state));
  return actions;
};

/**
 * What the iPads keep showing while a hint is on the board: the table and the controls as they
 * stand now, every control closed on the wire so nothing reads one as a press to send. Cheaper
 * than a whole view, because the host asks for it before each step that might start a hint.
 */
export const captureHintHold = (state: ShellState): HintHold => {
  const story = chosenOrBound(state);
  return {
    table: buildTable(state, story?.card.title ?? "Story"),
    // The night's last control is spent once pressed: the iPad keeps the table, with no controls.
    actions: (inNightPhase(state) ? [] : shownActions(state)).map((action) => ({
      promptId: action.promptId,
      actionId: action.actionId,
      label: action.label,
      deviceId: action.deviceId,
      ...(action.open && action.slot ? { slot: action.slot } : {}),
      open: false as const,
      reason: "Wait for the hint to end.",
    })),
  };
};

export const projectShellView = (state: ShellState): ViewState => {
  const story = chosenOrBound(state);
  const screen = state.screen;
  const title = story?.card.title ?? "Story";
  // The disconnect pause lists the seated party only (DEC-953); every other screen the roster.
  const seated =
    screen === "pause" && state.pause?.cause === "disconnect" ? seatedHeroIds(state) : null;
  const heroes = (story?.heroes ?? [])
    .filter((hero) => seated === null || seated.includes(hero.id))
    .map((hero) => ({
      id: hero.id,
      name: hero.name,
      deviceId: state.holdings[hero.id] ?? null,
      ...(screen === "claim-heroes" && hero.card ? { card: hero.card } : {}),
      lines:
        isSetupScreen(screen) && screen !== "claim-heroes"
          ? [{ id: `${screen}.private.${hero.id}`, text: `Only ${hero.name} hears this.` }]
          : [],
    }));

  // A hint is the loop's first beat: the view offers nothing until it ends. The iPads keep the
  // screen before it through `deviceHold`.
  const actions = shownActions(state);

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
        ? settingRows(story).map((setting) => {
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
    hint: momentId ? null : buildHint(state),
    deviceHold: !momentId && state.hint && state.screen === "play" ? state.hintHold : null,
    gear: gearSnapshot(state),
    chance: buildChance(state),
  };
};
