import type { LoopFrame } from "../../loop/types.ts";
import type { DayLocal } from "../day/loop.ts";
import { handleDayPress } from "../day/press.ts";
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
    top.local = handleDayPress(top.local as DayLocal, promptId, actionId);
  }
};
