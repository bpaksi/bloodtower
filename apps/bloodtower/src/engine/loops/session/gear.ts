import { GEAR_PANELS, type GearPanelId } from "../../../protocols/v2/views.ts";
import { rulesPage } from "../../hints/copy.ts";
import { spaceName } from "../chapter/board.ts";
import { queueRegroupPick } from "../day/regroup.ts";
import { hasOpenEvent } from "../event/index.ts";
import type { GroupTurnLocal } from "../group-turn/loop.ts";
import { FIX_POSITION_BAD_TARGET, FIX_POSITION_NOT_NOW } from "./effects.ts";
import type { ShellState } from "./state.ts";

export type GearEvent = {
  deviceId: string;
  action: "open" | "pick" | "done" | "keep-volume" | "try-another" | "step-back";
  item?: string;
  pick?: string;
  heroId?: string;
  otherHeroId?: string;
  volume?: number;
};

const isPanel = (item: string): item is GearPanelId =>
  (GEAR_PANELS as readonly string[]).includes(item);

/** The Menu row is `split-party`; its panel is `split`, the name the board shows (C3-11 EV-15). */
export const SPLIT_ROW = "split-party";
export const SPLIT_PANEL = "split" satisfies GearPanelId;

const panelFor = (item: string): string => (item === SPLIT_ROW ? SPLIT_PANEL : item);

/**
 * A Split party pick (PT-18). The iPad sends it with `item: "split"`; the host logs every such
 * pick (server/core/session.ts), so a replay after Continue queues it again with no panel open.
 * The same act with no panel open is the host's split action (Q7.2).
 */
const queuePick = (state: ShellState, event: GearEvent): boolean => {
  const kind = event.pick === "split" || event.pick === "join" ? event.pick : null;
  if (!kind || !event.heroId || !state.play) return false;
  // The play state is changed in place, as the loops do: the day clock is keyed on it.
  return queueRegroupPick(state.play, kind, event.heroId, event.deviceId);
};

const isVolume = (value: number | null | undefined): value is 0 | 1 | 2 =>
  value === 0 || value === 1 || value === 2;

const clearPanel = (state: ShellState): void => {
  state.gearPanel = null;
  state.gearOwner = null;
  state.gearPaused = false;
  state.gearPicked = null;
  state.gearCard = null;
  state.gearPreviewVolume = null;
  state.gearFirstHero = null;
  state.gearSecondHero = null;
};

const swapHolders = (state: ShellState, heroId: string, otherHeroId: string): void => {
  if (heroId === otherHeroId) return;
  if (!(heroId in state.holdings) || !(otherHeroId in state.holdings)) return;
  const holdA = state.holdings[heroId];
  const holdB = state.holdings[otherHeroId];
  state.holdings = {
    ...state.holdings,
    [heroId]: holdB ?? null,
    [otherHeroId]: holdA ?? null,
  };
};

/** Gear acts. Opening a panel is not replayed; Keep and Done are. */
export const applyGear = (state: ShellState, event: GearEvent): ShellState => {
  const next: ShellState = {
    ...state,
    holdings: { ...state.holdings },
    eventSeq: state.eventSeq + 1,
  };

  // Every gear item is disabled once the session is over (DEC-713).
  if (state.sessionEnded) return next;

  if (event.action === "open") {
    const item = event.item ? panelFor(event.item) : undefined;
    if (!item || !isPanel(item)) return next;
    if (item === SPLIT_PANEL && !next.play) return next;
    if (next.gearPanel) return next;
    next.gearPanel = item;
    next.gearOwner = event.deviceId;
    next.gearPaused = true;
    next.gearOpens += 1;
    next.gearPicked = null;
    next.gearCard = null;
    next.gearPreviewVolume = null;
    next.gearFirstHero = null;
    next.gearSecondHero = null;
    if (item === "game-board-setup") next.gearPieceChecks += 1;
    return next;
  }

  const owns = next.gearOwner === event.deviceId && next.gearPanel !== null;
  if (event.action === "pick" && event.item === SPLIT_PANEL) {
    // On the owner's open panel, or with no panel open (a replay, or the host's own action).
    if (next.gearPanel !== null && !(owns && next.gearPanel === SPLIT_PANEL)) return next;
    if (queuePick(next, event) && owns)
      next.gearPicked = event.pick === "split" ? "Split" : "Rejoin";
    return next;
  }
  if (event.action === "pick") {
    if (!owns) return next;
    // A Split party pick always comes with the panel's item; without it nothing is queued.
    if (next.gearPanel === SPLIT_PANEL) return next;
    if (event.pick) next.gearPicked = event.pick;
    if (next.gearPanel === "look-up" && event.pick) {
      next.gearCard = event.pick;
      // A Rules page is named by its title on the board's "picked" line (CU/09).
      const page = rulesPage(event.pick);
      if (page) next.gearPicked = page.title;
    }
    if (next.gearPanel === "volume" && isVolume(event.volume)) {
      next.gearPreviewVolume = event.volume;
      next.gearPicked = event.pick ?? `Volume ${event.volume}`;
    }
    if (next.gearPanel === "change-who-holds-whom" && event.heroId) {
      if (!next.gearFirstHero) next.gearFirstHero = event.heroId;
      else if (event.heroId !== next.gearFirstHero) next.gearSecondHero = event.heroId;
    }
    return next;
  }

  if (event.action === "try-another" || event.action === "step-back") {
    if (!owns) return next;
    next.gearPicked = null;
    next.gearCard = null;
    next.gearPreviewVolume = null;
    next.gearFirstHero = null;
    next.gearSecondHero = null;
    return next;
  }

  if (event.action === "keep-volume") {
    const volume = isVolume(event.volume) ? event.volume : next.gearPreviewVolume;
    if (isVolume(volume)) next.towerVolume = volume;
    if (owns) next.gearPicked = `Volume ${next.towerVolume}`;
    return next;
  }

  const swapA =
    event.heroId ?? (next.gearPanel === "change-who-holds-whom" ? next.gearFirstHero : null);
  const swapB =
    event.otherHeroId ?? (next.gearPanel === "change-who-holds-whom" ? next.gearSecondHero : null);
  if (swapA && swapB) swapHolders(next, swapA, swapB);
  clearPanel(next);
  return next;
};

/** The gear item and pick that carry a correction on the existing gear event (CU/05). */
export const FIX_POSITION_ITEM = "fix-position";

/** Text of the refusal in a battle, a scene or a building menu (Copy row 13). */
export const FIX_POSITION_NOT_NOW_LINE = "Only on the move map or between loops.";

/**
 * Fix my position runs on the move map or between loops, never inside a building, a battle, a
 * scene or an open event (Q5.3). Null when it may run.
 */
export const fixPositionRefusal = (state: ShellState): string | null => {
  const play = state.play;
  if (!play) return FIX_POSITION_NOT_NOW_LINE;
  if (state.screen !== "play" && state.screen !== "pause") return FIX_POSITION_NOT_NOW_LINE;
  if (play.groups.some((group) => group.insideBuilding)) return FIX_POSITION_NOT_NOW_LINE;
  if (hasOpenEvent(play)) return FIX_POSITION_NOT_NOW_LINE;
  const top = state.loops.stack.at(-1)?.loopId;
  if (top === "encounter" || top === "quest" || top === "scene" || top === "battle") {
    return FIX_POSITION_NOT_NOW_LINE;
  }
  return null;
};

export type FixPositionResult = {
  state: ShellState;
  /** Set when the pick was refused: no state changed (EV-08, EV-30). */
  error?: { code: typeof FIX_POSITION_NOT_NOW | typeof FIX_POSITION_BAD_TARGET; message: string };
  /** True when a group's space changed, so the move map must offer again from the new space. */
  moved?: boolean;
};

/**
 * Fix my position (PT-19, Q5.3): moves a group's recorded space to any space. It charges no move,
 * starts no trigger, changes no hero and sends no tower command. The pick is the gear event
 * `{item: "fix-position", heroId: <a hero of the group>, pick: <space id>}`; the host logs it like
 * every gear event, so a replay after Continue applies it again.
 */
export const applyFixPosition = (state: ShellState, event: GearEvent): FixPositionResult => {
  const next: ShellState = { ...state, eventSeq: state.eventSeq + 1 };
  const refuse = (
    code: typeof FIX_POSITION_NOT_NOW | typeof FIX_POSITION_BAD_TARGET,
    message: string,
  ): FixPositionResult => ({ state: next, error: { code, message } });

  const play = next.play;
  // On the owner's open Game board setup panel, or with no panel open (a replay after Continue).
  if (
    next.gearPanel !== null &&
    !(next.gearOwner === event.deviceId && next.gearPanel === "game-board-setup")
  ) {
    return refuse(FIX_POSITION_NOT_NOW, "Fix my position runs from the Game board setup panel.");
  }
  const refusal = fixPositionRefusal(next);
  if (refusal) return refuse(FIX_POSITION_NOT_NOW, refusal);
  const group = play?.groups.find((row) => event.heroId && row.heroIds.includes(event.heroId));
  if (!play || !group) {
    return refuse(
      FIX_POSITION_BAD_TARGET,
      `Fix my position: no group holds hero "${event.heroId ?? ""}".`,
    );
  }
  const to = event.pick;
  if (!to || !play.content.board.spaceById.has(to)) {
    return refuse(FIX_POSITION_BAD_TARGET, `Fix my position: no space "${to ?? ""}" on the board.`);
  }
  const board = play.content.board;
  const lead = group.heroIds[0] ?? group.id;
  const heroName = next.stories
    .flatMap((story) => story.heroes)
    .find((hero) => hero.id === lead)?.name;
  // The board line (Copy row 12, `board.fix-position-done`). The group's own record is the only change.
  group.spaceId = to;
  const owns = next.gearOwner === event.deviceId && next.gearPanel === "game-board-setup";
  if (owns) next.gearPicked = `${heroName ?? lead}'s group is set on ${spaceName(board, to)}.`;

  // The Back window is closed: a Back would carry the group to a space it never left.
  const top = next.loops.stack.at(-1);
  if (top?.loopId === "group-turn") {
    const local = top.local as GroupTurnLocal;
    if (local.groupId === group.id) {
      top.local = {
        ...local,
        undo: [],
        awaitEnd: local.movesLeft <= 0,
        awaitingPress: false,
        landedOnBuildingWithNoMoves: false,
      } satisfies GroupTurnLocal;
    }
  }
  return { state: next, moved: top?.loopId === "group-turn" };
};
