import type { DayLocal } from "./loop.ts";
import { applySkullRecord, parseSkullRecordPrompt } from "./skull.ts";

/**
 * Presses the day loop understands. The day start asks nothing (PT-18): Split and Rejoin are
 * queued from the gear, so no press splits or joins a group.
 */
export const handleDayPress = (local: DayLocal, promptId: string, actionId: string): DayLocal => {
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
