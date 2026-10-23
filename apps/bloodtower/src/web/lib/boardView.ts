import { type BoardView, boardViewPayloadSchema } from "bloodtower-protocols";

/** What the board shows before the first view arrives. */
export const waitingStoryboard = (): BoardView =>
  boardViewPayloadSchema.parse({
    screen: "pick-game",
    levels: [{ id: "wait", label: "Session", shows: "Connecting…" }],
    heroes: [],
    narration: null,
    actions: [],
  });

/** Join code text is in the first level's `shows` string on the live board. */
export const joinCodeFromBoard = (view: BoardView): string | null => {
  const join = view.levels.find((level) => level.id === "join");
  if (!join) return null;
  const match = /Code (\d{6})/.exec(join.shows);
  return match?.[1] ?? null;
};

export const joinWarning = (view: BoardView): string | null => {
  const join = view.levels.find((level) => level.id === "join");
  if (!join || !join.shows.includes("(unreachable)")) return null;
  return "iPads can't reach this address. Connect this Mac to Wi-Fi, then restart Bloodtower.";
};

export const holdingText = (hero: BoardView["heroes"][number]): string =>
  hero.held ? "Held" : "Waiting";

export const pauseText = (screen: BoardView["screen"]): string | null =>
  screen === "pause" ? "Paused." : null;
