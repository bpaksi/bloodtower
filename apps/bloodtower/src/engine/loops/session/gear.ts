import { GEAR_PANELS, type GearPanelId } from "../../../protocols/v2/views.ts";
import { queueRegroupPick } from "../day/regroup.ts";
import type { ShellState } from "./state.ts";

type GearEvent = {
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
    if (next.gearPanel === "look-up" && event.pick) next.gearCard = event.pick;
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
