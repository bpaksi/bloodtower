import type { LoopFrame } from "../../loop/types.ts";
import type { DayLocal } from "../day/loop.ts";
import type { EncounterLocal } from "../encounter/loop.ts";
import { handleEncounterLeave } from "../encounter/loop.ts";
import type { GroupTurnLocal } from "../group-turn/loop.ts";
import { handleGroupTurnPress } from "../group-turn/loop.ts";

export const updatePlayFrameOnPress = (
  stack: LoopFrame[],
  promptId: string,
  actionId: string,
): void => {
  const top = stack.at(-1);
  if (!top) return;

  if (top.loopId === "group-turn") {
    top.local = handleGroupTurnPress(top.local as GroupTurnLocal, promptId, actionId);
    return;
  }

  if (top.loopId === "encounter") {
    const local = top.local as EncounterLocal;
    if (actionId === "leave" && promptId === `leave--${local.groupId}`) {
      handleEncounterLeave(local.groupId);
      top.local = { ...local, awaitingLeave: true };
    }
    return;
  }

  if (top.loopId === "day") {
    const local = top.local as DayLocal;
    if (local.phase === "roll" && actionId === "continue") {
      top.local = { ...local, awaitingPress: true };
      return;
    }
    if (local.phase === "skull-prompt" && actionId === "continue") {
      top.local = { ...local, awaitingPress: true };
      return;
    }
    if (local.phase === "skull-place" && actionId === "confirm") {
      top.local = { ...local, awaitingPress: true };
    }
  }
};
