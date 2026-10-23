import type { ControlPress, StatEvent, TimingMark } from "bloodtower-protocols";
import { timingMarkSchema } from "bloodtower-protocols";
import type { StoredRun } from "../db/store.ts";
import { parseHostPayload } from "./kinds.ts";
import type { EventStore, StoredHostEvent } from "./store.ts";

const keyOf = (kind: string, subject: string) => `${kind}\0${subject}`;

/** Rebuild presses, timing marks and stats from the append-only log (D37, D6). */
export const timingDataFromEvents = (
  rows: readonly StoredHostEvent[],
  sessionId: string,
): { presses: ControlPress[]; marks: TimingMark[]; stats: StatEvent[] } => {
  const presses: ControlPress[] = [];
  const stats: StatEvent[] = [];
  const openIndex = new Map<string, number>();
  const marks: TimingMark[] = [];

  for (const row of rows) {
    switch (row.kind) {
      case "control-press": {
        const { press } = parseHostPayload("control-press", row.payload);
        presses.push(press);
        break;
      }
      case "timing-mark-open": {
        const { mark } = parseHostPayload("timing-mark-open", row.payload);
        const key = keyOf(mark.kind, mark.subject);
        openIndex.set(key, marks.length);
        marks.push(timingMarkSchema.parse({ ...mark, sessionId }));
        break;
      }
      case "timing-mark-close": {
        const close = parseHostPayload("timing-mark-close", row.payload);
        const key = keyOf(close.kind, close.subject);
        const index = openIndex.get(key);
        if (index === undefined) {
          throw new Error(`${close.kind} ${close.subject} closed without an open mark.`);
        }
        const open = marks[index];
        if (!open) {
          throw new Error(`${close.kind} ${close.subject} closed without an open mark.`);
        }
        marks[index] = timingMarkSchema.parse({
          ...open,
          sessionId,
          endMonoMs: close.endMonoMs,
          endWall: close.endWall,
          result: close.result ?? open.result,
        });
        openIndex.delete(key);
        break;
      }
      case "stat": {
        const { stat } = parseHostPayload("stat", row.payload);
        stats.push(stat);
        break;
      }
      default:
        break;
    }
  }

  return { presses, marks, stats };
};

export const storedRunFromEventLog = (
  eventStore: EventStore,
  gameId: string,
  base: StoredRun,
): StoredRun => {
  const rows = eventStore.listEvents(gameId, 0);
  const timing = timingDataFromEvents(rows, base.session.id);
  return { ...base, ...timing };
};
