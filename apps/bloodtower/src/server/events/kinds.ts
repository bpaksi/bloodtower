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
  "game-record",
  "play-clock",
] as const;

export type HostEventKind = (typeof HOST_EVENT_KINDS)[number];

const assertV1 = (parsed: unknown): Record<string, unknown> => {
  if (typeof parsed !== "object" || parsed === null || (parsed as { v?: unknown }).v !== 1) {
    throw new Error("Expected payload v: 1.");
  }
  return parsed as Record<string, unknown>;
};

/** What a press was, for the tap counts (PT-10). A flow button is any press on a play or setup screen. */
export const PRESS_KINDS = ["flow-button", "menu", "help"] as const;
export type PressKind = (typeof PRESS_KINDS)[number];

/** How a game ended (DEC-043): quit, won, or the way it was lost. */
export const GAME_HOWS = ["quit", "won", "corruption", "skulls", "buildings"] as const;
export type GameHow = (typeof GAME_HOWS)[number];

/**
 * The game's record (DEC-116, DEC-117). A game id can hold more than one: a quit, then the final
 * outcome after Continue. The latest one is the record (PT-03); the log is append-only.
 * Fields past the outcome are absent on a row an older host wrote.
 */
export type GameRecordPayloadV1 = {
  v: 1;
  gameId: string;
  outcome: "quit" | "won" | "lost";
  storyId?: string | null;
  length?: string | null;
  difficulty?: string | null;
  partySize?: number | null;
  heroIds?: string[];
  how?: GameHow;
  sceneId?: string | null;
  endDay?: number | null;
  /** The game's first play start, from the log, UTC. */
  startedWall?: string | null;
  endedWall?: string;
  /** The sum of unpaused play time over the whole game, up to this record. Null: unknown. */
  activeMs?: number | null;
  /** Every counted press so far, over the whole game (PT-10). */
  taps?: number;
};

/** The game clock: it runs while the game is played and stops for a pause, a quit or the end. */
export type PlayClockPayloadV1 = { v: 1; running: boolean };

export type ControlPressPayloadV1 = {
  v: 1;
  press: ControlPress;
  /** Absent on a press an older host logged. */
  kind?: PressKind;
  /** The game day the press was made on; 0 before day 1. */
  day?: number | null;
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
      ? ControlPressPayloadV1
      : K extends "timing-mark-open"
        ? { v: 1; mark: TimingMark }
        : K extends "timing-mark-close"
          ? TimingMarkClosePayloadV1
          : K extends "stat"
            ? { v: 1; stat: StatEvent }
            : K extends "game-record"
              ? GameRecordPayloadV1
              : K extends "play-clock"
                ? PlayClockPayloadV1
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
      const out: ControlPressPayloadV1 = { v: 1, press: press.data };
      if (parsed.kind !== undefined) {
        if (!(PRESS_KINDS as readonly unknown[]).includes(parsed.kind)) {
          throw new Error("control-press kind must be flow-button, menu, or help.");
        }
        out.kind = parsed.kind as PressKind;
      }
      if (parsed.day !== undefined) {
        if (parsed.day !== null && !Number.isInteger(parsed.day)) {
          throw new Error("control-press day must be a whole number or null.");
        }
        out.day = parsed.day as number | null;
      }
      return out as never;
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
    case "game-record": {
      if (typeof parsed.gameId !== "string" || parsed.gameId.length === 0) {
        throw new Error("game-record needs a gameId.");
      }
      if (parsed.outcome !== "quit" && parsed.outcome !== "won" && parsed.outcome !== "lost") {
        throw new Error("game-record outcome must be quit, won, or lost.");
      }
      const record: GameRecordPayloadV1 = {
        v: 1,
        gameId: parsed.gameId,
        outcome: parsed.outcome,
      };
      if (parsed.how !== undefined) {
        if (!(GAME_HOWS as readonly unknown[]).includes(parsed.how)) {
          throw new Error("game-record how must be quit, won, corruption, skulls, or buildings.");
        }
        record.how = parsed.how as GameHow;
      }
      for (const key of ["storyId", "length", "difficulty", "sceneId", "startedWall"] as const) {
        const value = parsed[key];
        if (value === undefined) continue;
        if (value !== null && typeof value !== "string") {
          throw new Error(`game-record ${key} must be text or null.`);
        }
        record[key] = value as string | null;
      }
      for (const key of ["partySize", "endDay", "activeMs"] as const) {
        const value = parsed[key];
        if (value === undefined) continue;
        if (value !== null && (typeof value !== "number" || !Number.isFinite(value))) {
          throw new Error(`game-record ${key} must be a number or null.`);
        }
        record[key] = value as number | null;
      }
      if (parsed.heroIds !== undefined) {
        if (!Array.isArray(parsed.heroIds) || parsed.heroIds.some((id) => typeof id !== "string")) {
          throw new Error("game-record heroIds must be a list of text.");
        }
        record.heroIds = parsed.heroIds as string[];
      }
      if (typeof parsed.endedWall === "string") record.endedWall = parsed.endedWall;
      if (typeof parsed.taps === "number") record.taps = parsed.taps;
      return record as never;
    }
    case "play-clock": {
      if (typeof parsed.running !== "boolean") throw new Error("play-clock needs running.");
      return { v: 1, running: parsed.running } as never;
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
