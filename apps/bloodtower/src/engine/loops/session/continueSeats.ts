import { allHeroesHeld } from "../game/setupFlow.ts";
import type { ShellState } from "./state.ts";
import { pauseIfNeeded, refreshOffersAfterRestore } from "./stepShell.ts";

/**
 * Continue seats the saved party on the iPads joined now (DEC-952, DEC-953). The joined set is the
 * live one; a saved hold stays only when its iPad is joined, every other hold is cleared. Then the
 * disconnect pause is checked: a seated hero with no holder pauses the game, and the iPads pick.
 * Pure: no tower, no store. Nothing but `holdings`, `devices` and the pause fields changes.
 */
export const seatOnContinue = (resumed: ShellState, live: ShellState): ShellState => {
  const next: ShellState = {
    ...resumed,
    devices: new Set(live.devices),
    holdings: { ...resumed.holdings },
  };
  for (const heroId of Object.keys(next.holdings)) {
    const holder = next.holdings[heroId];
    if (holder != null && !next.devices.has(holder)) next.holdings[heroId] = null;
  }

  const wasDisconnectPause = next.stage === "paused" && next.pause?.cause === "disconnect";
  // A save quit from a drop pause: if every seated hero is held now, play goes on (DEC-953).
  if (wasDisconnectPause && next.play && allSeatedHeld(next)) {
    next.pause = null;
    next.stage = "playing";
    next.screen = "play";
  }
  pauseIfNeeded(next);

  // The offers follow a change of the disconnect pause: Quit only while it is open, the play
  // buttons once it is not. The effects returned are dropped: a view refresh, and loop effects
  // only outside a pause; the host refreshes the views itself after the press.
  if ((next.pause?.cause === "disconnect") !== wasDisconnectPause) {
    refreshOffersAfterRestore(next);
  }
  return next;
};

const allSeatedHeld = (state: ShellState): boolean =>
  state.play?.groups.flatMap((group) => group.heroIds).every((id) => state.holdings[id] != null) ??
  allHeroesHeld(state);
