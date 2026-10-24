import {
  type ControlPress,
  controlPressSchema,
  type StatEvent,
  statEventSchema,
  type TimingKind,
  type TimingMark,
  timingKindSchema,
  timingMarkSchema,
} from "bloodtower-protocols";
import { type EngineEvent, engineEventSchema } from "../../engine/events.ts";
import { type ShellEvent, shellEventSchema } from "../../engine/loops/session/events.ts";

/** Host log event kinds (DEC-107). Payload shape is checked before insert. */
export const HOST_EVENT_KINDS = [
  "engine",
  "shell",
  "control-press",
  "timing-mark-open",
  "timing-mark-close",
  "stat",
  "version-changed",
] as const;

export type HostEventKind = (typeof HOST_EVENT_KINDS)[number];

const assertV1 = (parsed: unknown): Record<string, unknown> => {
  if (typeof parsed !== "object" || parsed === null || (parsed as { v?: unknown }).v !== 1) {
    throw new Error("Expected payload v: 1.");
  }
  return parsed as Record<string, unknown>;
};

export type VersionChangedPayloadV1 = {
  v: 1;
  fromEngineVersion: string;
  toEngineVersion: string;
  fromPackVersion: string;
  toPackVersion: string;
};

export type TimingMarkClosePayloadV1 = {
  v: 1;
  kind: TimingKind;
  subject: string;
  endMonoMs: number;
  endWall: string;
  result: "won" | "lost" | null;
};

export const parseHostPayload = <K extends HostEventKind>(
  kind: K,
  payloadJson: string,
): K extends "engine"
  ? { v: 1; event: EngineEvent }
  : K extends "shell"
    ? { v: 1; event: ShellEvent }
    : K extends "control-press"
      ? { v: 1; press: ControlPress }
      : K extends "timing-mark-open"
        ? { v: 1; mark: TimingMark }
        : K extends "timing-mark-close"
          ? TimingMarkClosePayloadV1
          : K extends "stat"
            ? { v: 1; stat: StatEvent }
            : VersionChangedPayloadV1 => {
  const parsed = assertV1(JSON.parse(payloadJson));
  switch (kind) {
    case "engine": {
      const event = engineEventSchema.safeParse(parsed.event);
      if (!event.success) throw new Error(event.error.message);
      return { v: 1, event: event.data } as never;
    }
    case "shell": {
      const event = shellEventSchema.safeParse(parsed.event);
      if (!event.success) throw new Error(event.error.message);
      return { v: 1, event: event.data } as never;
    }
    case "control-press": {
      const press = controlPressSchema.safeParse(parsed.press);
      if (!press.success) throw new Error(press.error.message);
      return { v: 1, press: press.data } as never;
    }
    case "timing-mark-open": {
      const mark = timingMarkSchema.safeParse(parsed.mark);
      if (!mark.success) throw new Error(mark.error.message);
      return { v: 1, mark: mark.data } as never;
    }
    case "timing-mark-close": {
      const kindParsed = timingKindSchema.safeParse(parsed.kind);
      if (!kindParsed.success) throw new Error(kindParsed.error.message);
      if (typeof parsed.subject !== "string" || parsed.subject.length === 0) {
        throw new Error("timing-mark-close needs a subject.");
      }
      if (typeof parsed.endMonoMs !== "number" || !Number.isFinite(parsed.endMonoMs)) {
        throw new Error("timing-mark-close needs endMonoMs.");
      }
      if (typeof parsed.endWall !== "string") {
        throw new Error("timing-mark-close needs endWall.");
      }
      const result =
        parsed.result === null
          ? null
          : parsed.result === "won" || parsed.result === "lost"
            ? parsed.result
            : (() => {
                throw new Error("timing-mark-close result must be won, lost, or null.");
              })();
      return {
        v: 1,
        kind: kindParsed.data,
        subject: parsed.subject,
        endMonoMs: parsed.endMonoMs,
        endWall: parsed.endWall,
        result,
      } as never;
    }
    case "stat": {
      const stat = statEventSchema.safeParse(parsed.stat);
      if (!stat.success) throw new Error(stat.error.message);
      return { v: 1, stat: stat.data } as never;
    }
    case "version-changed": {
      for (const key of [
        "fromEngineVersion",
        "toEngineVersion",
        "fromPackVersion",
        "toPackVersion",
      ] as const) {
        if (typeof parsed[key] !== "string" || parsed[key].length === 0) {
          throw new Error(`version-changed needs ${key}.`);
        }
      }
      return {
        v: 1,
        fromEngineVersion: parsed.fromEngineVersion as string,
        toEngineVersion: parsed.toEngineVersion as string,
        fromPackVersion: parsed.fromPackVersion as string,
        toPackVersion: parsed.toPackVersion as string,
      } as never;
    }
    default:
      throw new Error(`Unknown host event kind ${kind satisfies never}.`);
  }
};
