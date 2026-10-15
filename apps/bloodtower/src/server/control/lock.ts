import {
  type ControlAction,
  type ControlLock,
  type ControlPress,
  controlPressSchema,
} from "bloodtower-protocols";
import type { Clock } from "../timing/clock.ts";

export interface PressInput {
  promptId: string;
  action: ControlAction;
  deviceId: string;
}

export interface PressLog {
  record: (input: PressInput & { winner: boolean }) => ControlPress;
}

/**
 * First arrival wins. A later press on the same prompt is stored with winner false
 * and the lock already chosen. Clocks are not consulted: the list order is the arrival order.
 */
export const lockPresses = (
  locks: Readonly<Record<string, ControlLock>>,
  presses: readonly PressInput[],
): { locks: Record<string, ControlLock>; winners: boolean[] } => {
  const next: Record<string, ControlLock> = { ...locks };
  const winners: boolean[] = [];
  for (const press of presses) {
    const existing = next[press.promptId];
    if (existing) {
      winners.push(false);
      continue;
    }
    next[press.promptId] = {
      promptId: press.promptId,
      action: press.action,
      winnerDeviceId: press.deviceId,
    };
    winners.push(true);
  }
  return { locks: next, winners };
};

export const createPressLog = (clock: Clock, persist: (press: ControlPress) => void): PressLog => ({
  record: (input) => {
    const press = controlPressSchema.parse({
      ...input,
      atMonoMs: clock.monoMs(),
      atWall: clock.wall(),
    });
    persist(press);
    return press;
  },
});
