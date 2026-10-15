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

export const pauseText = (pause: StoryboardState["pause"]): string | null => {
  if (!pause) return null;
  if ((pause.cause === "disconnect" || pause.cause === "unheld-hunter") && pause.hunter) {
    return `Waiting for someone to hold ${pause.hunter}.`;
  }
  return "Paused.";
};
