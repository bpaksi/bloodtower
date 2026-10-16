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
