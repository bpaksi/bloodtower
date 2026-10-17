import { type StoryboardState, storyboardStatePayloadSchema } from "bloodtower-protocols";

/** What the board shows before a session exists. Every reading is unavailable. */
export const waitingStoryboard = (): StoryboardState =>
  storyboardStatePayloadSchema.parse({
    stage: "lobby",
    hunters: [],
    join: null,
    prompt: null,
    moment: null,
    pause: null,
    tower: {
      connection: "unavailable",
      battery: { state: "unavailable" },
      calibrated: { state: "unavailable" },
    },
    gate: { canBegin: true, unheld: [] },
    lock: null,
  });

/** A hunter's holding on the board: waiting, the holders, or the holders marked disconnected (R2-104). */
export const holdingText = (hunter: StoryboardState["hunters"][number]): string => {
  if (hunter.holders.length === 0) return "waiting";
  const holders = hunter.holders.join(", ");
  return hunter.disconnected ? `disconnected (${holders})` : holders;
};

/** The warning under the QR when iPads cannot open the join address, or null (R2-12). */
export const joinWarning = (join: StoryboardState["join"]): string | null =>
  join && !join.reachable
    ? "iPads can't reach this address. Connect this Mac to Wi-Fi, then restart Bloodtower."
    : null;

export const pauseText = (
  pause: StoryboardState["pause"],
  hunters: StoryboardState["hunters"] = [],
): string | null => {
  if (!pause) return null;
  if ((pause.cause === "disconnect" || pause.cause === "unheld-hunter") && pause.hunter) {
    const name = hunters.find((hunter) => hunter.id === pause.hunter)?.name ?? pause.hunter;
    return `Waiting for someone to hold ${name}.`;
  }
  return "Paused.";
};
