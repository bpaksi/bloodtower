/** Teardown copy for Goodbye (SCR-020). Display only; it reverses the physical setup. */
export const GOODBYE_TEARDOWN = [
  { id: "place-heroes", text: "Take each hero off the board." },
  { id: "lay-out-board", text: "Pack up the board." },
  { id: "seals-and-skulls", text: "Take the seals off the tower and collect the skulls." },
] as const;

const TOWER_STATES = ["idle", "no tower", "unavailable"] as const;

export type GoodbyeTowerState = (typeof TOWER_STATES)[number];

/** The goodbye screen line is the tower phrase. Anything else stays unavailable. */
export const goodbyeTowerState = (shows: string): GoodbyeTowerState =>
  (TOWER_STATES as readonly string[]).includes(shows)
    ? (shows as GoodbyeTowerState)
    : "unavailable";
