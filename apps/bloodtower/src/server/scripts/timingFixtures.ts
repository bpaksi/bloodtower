import {
  type ControlAction,
  type ControlPress,
  controlPressSchema,
  type FlowScreen,
  type PauseCause,
  type TimingKind,
  type TimingMark,
  timingMarkSchema,
} from "bloodtower-protocols";
import type { SessionStore } from "../db/store.ts";
import type { Clock } from "../timing/clock.ts";

/** Test fixtures for the timing report: they write a run the way the host's event log does. */

export type MarkInput = {
  kind: TimingKind;
  subject: string;
  deviceId: string | null;
  cause: PauseCause | null;
  hunter: string | null;
};

/** Stamps a mark from the step clock and stores it; a close stores the end. */
export const createTimingLog = (
  store: Pick<SessionStore, "insertMark" | "closeMark">,
  clock: Clock,
  sessionId: string,
) => {
  const rows = new Map<string, { id: number; mark: TimingMark }>();
  return {
    open: (input: MarkInput) => {
      const mark = timingMarkSchema.parse({
        sessionId,
        ...input,
        startMonoMs: clock.monoMs(),
        endMonoMs: null,
        startWall: clock.wall(),
        endWall: null,
        result: null,
      });
      rows.set(`${input.kind}\0${input.subject}`, { id: store.insertMark(mark), mark });
    },
    close: (kind: TimingKind, subject: string) => {
      const key = `${kind}\0${subject}`;
      const open = rows.get(key);
      if (!open) throw new Error(`${kind} ${subject} is not open.`);
      store.closeMark(open.id, {
        endMonoMs: clock.monoMs(),
        endWall: clock.wall(),
        result: open.mark.result,
      });
      rows.delete(key);
    },
  };
};

export type PressRecord = {
  promptId: string;
  action: ControlAction;
  deviceId: string;
  winner: boolean;
  screen: FlowScreen;
  nextScreen: FlowScreen | null;
};

export const createPressLog = (clock: Clock, persist: (press: ControlPress) => void) => ({
  record: (input: PressRecord) => {
    persist(controlPressSchema.parse({ ...input, atMonoMs: clock.monoMs(), atWall: clock.wall() }));
  },
});
