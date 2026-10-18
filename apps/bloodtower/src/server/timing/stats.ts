import { type StatEvent, statEventSchema } from "bloodtower-protocols";
import type { SessionStore } from "../db/store.ts";
import type { Clock } from "./clock.ts";

export interface StatLog {
  /** Stores one event stat with the monotonic and wall time it happened. */
  record: (input: {
    statId: string;
    deviceId: string | null;
    data: Record<string, string | null>;
  }) => StatEvent;
  events: () => StatEvent[];
}

/** Stamps and stores the pack's event stats. A value the app did not have stays null. */
export const createStatLog = (
  store: Pick<SessionStore, "insertStat" | "listStats">,
  clock: Clock,
  sessionId: string,
): StatLog => ({
  record: (input) => {
    const event = statEventSchema.parse({
      sessionId,
      statId: input.statId,
      atMonoMs: clock.monoMs(),
      atWall: clock.wall(),
      deviceId: input.deviceId,
      data: input.data,
    });
    store.insertStat(event);
    return event;
  },
  events: () => store.listStats(sessionId),
});
