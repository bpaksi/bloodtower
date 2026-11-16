import { AUTO_ADVANCE_MS } from "../../../protocols/v2/views.ts";
import type { LoopFrame } from "../../loop/types.ts";

/**
 * The effects panel's wait, as data (C3/20, C3/11 ruling 1). The engine holds no clock: it names
 * the wait and its longest length, and the host runs it. The panel ends on the narration's
 * audio-end event when it has a line (never on a timer), or when `maxMs` are up when it has none.
 * Either way the host sends one `wait-end` event, and the day loop moves on only then.
 */
export type EffectsWait = {
  /** One id per day, so a late or repeated end for another wait is refused. */
  id: string;
  /** The longest the panel stays with no audio, in ms. Always `AUTO_ADVANCE_MS`. */
  maxMs: number;
  /** The narration line whose audio end ends the wait early, or null when there is no audio. */
  lineId: string | null;
};

export const effectsWaitFor = (day: number, lineId: string | null): EffectsWait => ({
  id: `effects-day-${day}`,
  maxMs: AUTO_ADVANCE_MS,
  lineId,
});

/** The wait the day loop is in now and has not finished, or null. The host reads this and runs it. */
export const openEffectsWait = (stack: readonly LoopFrame[]): EffectsWait | null => {
  const frame = stack.find((row) => row.loopId === "day");
  const local = frame?.local as { phase?: string; wait?: EffectsWait | null; waitDone?: boolean };
  if (!local || local.phase !== "effects" || local.waitDone || !local.wait) return null;
  return local.wait;
};
