import { playState } from "../chapter/playState.ts";
import { eventOptions, eventTuningFrom } from "../event/index.ts";
import { type DayLocal, parseEventChoicePrompt } from "./loop.ts";
import { applySkullRecord, parseSkullRecordPrompt } from "./skull.ts";

/**
 * Presses the day loop understands. The day start asks nothing (PT-18): Split and Rejoin are
 * queued from the gear, so no press splits or joins a group.
 */
export const handleDayPress = (local: DayLocal, promptId: string, actionId: string): DayLocal => {
  if (local.phase === "event" && actionId === "choose") {
    const press = parseEventChoicePrompt(promptId);
    const open = eventOptions(playState(), eventTuningFrom());
    const taken = local.eventPicked ?? null;
    if (
      press &&
      taken === null &&
      local.eventStage === "choose" &&
      press.groupId === local.eventGroup &&
      open.some((option) => option.id === press.optionId && option.enabled)
    ) {
      return { ...local, eventPicked: press.optionId };
    }
    return local;
  }
  if (local.phase === "roll" && actionId === "continue") {
    return { ...local, awaitingPress: true };
  }
  if (local.phase === "skull-prompt" && actionId === "continue") {
    return { ...local, awaitingPress: true };
  }
  if (local.phase === "skull-sim" && actionId === "continue") {
    return { ...local, awaitingPress: true, skullPlaced: true };
  }
  if (local.phase === "skull-place" && actionId === "record") {
    const parsed = parseSkullRecordPrompt(promptId);
    if (parsed && applySkullRecord(parsed.day, parsed.target)) {
      return { ...local, awaitingPress: true, skullPlaced: true };
    }
  }
  return local;
};

/**
 * The words for an event pick the scene did not take, or null when it took it (CLAUDE.md, Errors).
 * A second press after the first won is an expected race, not an error: it is `null` here too.
 */
export const eventPressRefusal = (
  local: DayLocal,
  promptId: string,
  actionId: string,
): string | null => {
  const press = parseEventChoicePrompt(promptId);
  if (actionId !== "choose" || !press) return null;
  if (local.phase !== "event" || local.eventStage !== "choose") return null;
  if (local.eventPicked === press.optionId) return null;
  return `The event could not take "${press.optionId}", so nothing changed.`;
};
