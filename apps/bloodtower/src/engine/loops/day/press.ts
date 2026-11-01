import { playState } from "../chapter/playState.ts";
import type { DayLocal } from "./loop.ts";
import { applyJoin, applySplit, parseJoinPrompt, parseSplitPrompt } from "./regroup.ts";
import { applySkullRecord, parseSkullRecordPrompt } from "./skull.ts";

/** Presses the day loop understands. Group-turn split and join never reach this. */
export const handleDayPress = (local: DayLocal, promptId: string, actionId: string): DayLocal => {
  if (local.phase === "regroup") {
    if (actionId === "done" && promptId === "regroup-done") {
      return { ...local, awaitingPress: true };
    }
    if (actionId === "split") {
      const parsed = parseSplitPrompt(promptId);
      if (parsed) applySplit(playState(), parsed.groupId, parsed.heroId);
      return { ...local, awaitingPress: false };
    }
    if (actionId === "join") {
      const parsed = parseJoinPrompt(promptId);
      if (parsed) applyJoin(playState(), parsed.aId, parsed.bId);
      return { ...local, awaitingPress: false };
    }
    return local;
  }

  if (local.phase === "roll" && actionId === "continue") {
    return { ...local, awaitingPress: true };
  }
  if (local.phase === "skull-prompt" && actionId === "continue") {
    return { ...local, awaitingPress: true };
  }
  if (local.phase === "skull-place" && actionId === "record") {
    const parsed = parseSkullRecordPrompt(promptId);
    if (parsed && applySkullRecord(parsed.day, parsed.target)) {
      return { ...local, awaitingPress: true, skullPlaced: true };
    }
  }
  return local;
};
