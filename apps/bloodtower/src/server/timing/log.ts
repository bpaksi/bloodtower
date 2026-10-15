import {
  type PauseCause,
  type TimingKind,
  type TimingMark,
  timingMarkSchema,
} from "bloodtower-protocols";
import type { SessionStore } from "../db/store.ts";
import type { Clock } from "./clock.ts";

export interface OpenMark {
  kind: TimingKind;
  subject: string;
  deviceId: string | null;
  cause: PauseCause | null;
  hunter: string | null;
  result?: "won" | "lost" | null;
}

export interface TimingLog {
  open: (input: OpenMark) => TimingMark;
  close: (kind: TimingKind, subject: string, result?: "won" | "lost") => TimingMark;
  marks: () => TimingMark[];
}

interface OpenRow {
  id: number;
  mark: TimingMark;
}

const keyOf = (kind: string, subject: string) => `${kind}\0${subject}`;

/**
 * Stamps monotonic time from session start and UTC wall time, then stores the row.
 * An open mark is unknown at its end, stored as null, never as zero.
 */
export const createTimingLog = (
  store: Pick<SessionStore, "insertMark" | "closeMark" | "listMarks">,
  clock: Clock,
  sessionId: string,
): TimingLog => {
  const openRows = new Map<string, OpenRow>();

  return {
    open: (input) => {
      const key = keyOf(input.kind, input.subject);
      if (openRows.has(key)) {
        throw new Error(`${input.kind} ${input.subject} is already open.`);
      }
      const mark = timingMarkSchema.parse({
        sessionId,
        kind: input.kind,
        subject: input.subject,
        startMonoMs: clock.monoMs(),
        endMonoMs: null,
        startWall: clock.wall(),
        endWall: null,
        deviceId: input.deviceId,
        cause: input.cause,
        hunter: input.hunter,
        result: input.result ?? null,
      });
      const id = store.insertMark(mark);
      openRows.set(key, { id, mark });
      return mark;
    },

    close: (kind, subject, result) => {
      const key = keyOf(kind, subject);
      const open = openRows.get(key);
      if (!open) throw new Error(`${kind} ${subject} is not open.`);
      const mark = timingMarkSchema.parse({
        ...open.mark,
        endMonoMs: clock.monoMs(),
        endWall: clock.wall(),
        result: result ?? open.mark.result,
      });
      if (mark.endMonoMs === null || mark.endWall === null) {
        throw new Error(`${kind} ${subject} did not close.`);
      }
      store.closeMark(open.id, {
        endMonoMs: mark.endMonoMs,
        endWall: mark.endWall,
        result: mark.result,
      });
      openRows.delete(key);
      return mark;
    },

    marks: () => store.listMarks(sessionId),
  };
};
