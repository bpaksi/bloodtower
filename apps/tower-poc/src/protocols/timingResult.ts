import { z } from "zod";
import { END_STAGES, type LifecycleStage } from "./command.ts";
import {
  FLASH_DURATION_MS,
  FLASH_RATES_HZ,
  HELD_LIGHT_SEQUENCES,
  lightSequenceSchema,
  SILENT_LIGHT_SEQUENCES,
} from "./inventory.ts";
import { SOUND_CATALOG } from "./soundCatalog.ts";

/**
 * What the timing page records and the service writes. Times are milliseconds since the epoch,
 * UTC. A time the tower did not give is null, never zero.
 */

const epochMs = z.int().nonnegative();
const optionalEpoch = epochMs.nullable();

const endStageSchema = z.enum(["confirmed", "indeterminate", "failed", "timed-out", "rejected"]);

export const overlapTrialIdSchema = z.enum([
  "sound-then-sound",
  "sound-then-light",
  "light-then-light",
]);
export type OverlapTrialId = z.infer<typeof overlapTrialIdSchema>;

export const overlapResultSchema = z.enum(["cut-off", "together", "waited"]);

const commandTimingSchema = z
  .strictObject({
    capabilityId: z.string().min(1).max(64),
    sentAt: optionalEpoch,
    acknowledgedAt: optionalEpoch,
    outcome: endStageSchema.nullable(),
  })
  .refine((timing) => timing.sentAt !== null || timing.acknowledgedAt === null, {
    path: ["acknowledgedAt"],
    message: "A command that was not sent has no acknowledgement.",
  });

export const sequenceObservationSchema = z
  .strictObject({
    name: lightSequenceSchema,
    /** True when this sequence has not been played on the tower through this service. */
    flagged: z.boolean(),
    /** The four rotation sequences are written and not waited on (D23). */
    sentWithoutWaiting: z.boolean(),
    sentAt: optionalEpoch,
    acknowledgedAt: optionalEpoch,
    /** When Bob tapped Done, after the lights stopped. Null when he did not. */
    doneAt: optionalEpoch,
    outcome: endStageSchema.nullable(),
  })
  .refine((row) => row.flagged === (HELD_LIGHT_SEQUENCES as readonly string[]).includes(row.name), {
    path: ["flagged"],
    message: "flagged must match the sequences never played on the tower.",
  })
  .refine(
    (row) =>
      row.sentWithoutWaiting === (SILENT_LIGHT_SEQUENCES as readonly string[]).includes(row.name),
    {
      path: ["sentWithoutWaiting"],
      message: "Only the rotation sequences are sent without waiting.",
    },
  )
  .refine((row) => row.sentAt !== null || row.acknowledgedAt === null, {
    path: ["acknowledgedAt"],
    message: "A command that was not sent has no acknowledgement.",
  });
export type SequenceObservation = z.infer<typeof sequenceObservationSchema>;

const overlapTrialSchema = z.strictObject({
  id: overlapTrialIdSchema,
  /**
   * Milliseconds from the first command's sent time to the second's, when both were sent.
   * Otherwise the planned pause. The light pair is planned back to back, so that pause is 0.
   */
  gapMs: z.int().nonnegative(),
  first: commandTimingSchema,
  second: commandTimingSchema.nullable(),
  result: overlapResultSchema.nullable(),
});

const skullSchema = z.strictObject({
  /** When the service saw the skull count rise. Null when it saw no drop. */
  dropAt: optionalEpoch,
  /** Bob's mark. Null when he has not answered. */
  towerMadeSound: z.boolean().nullable(),
});

const flashRateSchema = z.union([z.literal(2), z.literal(4), z.literal(6), z.literal(8)]);

const flashRateRunSchema = z.strictObject({
  flashesPerSecond: flashRateSchema,
  durationMs: z.literal(FLASH_DURATION_MS),
  sentAt: optionalEpoch,
  finishedAt: optionalEpoch,
  outcome: endStageSchema.nullable(),
});

const flashSchema = z.strictObject({
  /** The warning was on screen before any flash command. */
  warningShown: z.boolean(),
  skipped: z.boolean(),
  rates: z.array(flashRateRunSchema).max(FLASH_RATES_HZ.length),
  /** The fastest rate Bob marked as still a clean flash. Null if he skipped or has not marked. */
  fastestCleanHz: flashRateSchema.nullable(),
});

/** A result the page sends. The service adds `savedAt` when it writes the file. */
export const timingResultSchema = z.strictObject({
  version: z.literal(1),
  /** When Bob opened the page, UTC. */
  startedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
  /** Bob's notes. Always present; an empty string when he wrote nothing. */
  notes: z.string().max(4_000),
  lightSequences: z.array(sequenceObservationSchema).max(lightSequenceSchema.options.length),
  overlap: z.array(overlapTrialSchema).max(overlapTrialIdSchema.options.length),
  skull: skullSchema,
  flash: flashSchema,
});
export type TimingResult = z.infer<typeof timingResultSchema>;

export const savedTimingResultSchema = timingResultSchema.extend({
  savedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
});

export interface CommandTimes {
  sentAt: number | null;
  acknowledgedAt: number | null;
  /** When the command reached an end stage. Null when it has not ended. */
  finishedAt: number | null;
  outcome: LifecycleStage | null;
}

/**
 * Sent time is when the write completed, or when the command started if it never got that far.
 * Acknowledged time is only a `confirmed` stage. Anything else stays null.
 */
export const commandTimes = (
  stages: readonly { stage: string; at: number }[] | undefined,
): CommandTimes => {
  const list = stages ?? [];
  const write = list.find((stage) => stage.stage === "write-completed");
  const started = list.find((stage) => stage.stage === "started");
  const confirmed = list.find((stage) => stage.stage === "confirmed");
  const end = [...list]
    .reverse()
    .find((stage) => (END_STAGES as readonly string[]).includes(stage.stage));
  return {
    sentAt: write?.at ?? started?.at ?? null,
    acknowledgedAt: confirmed?.at ?? null,
    finishedAt: end?.at ?? null,
    outcome: (end?.stage as LifecycleStage | undefined) ?? null,
  };
};

/** The long sound, then the short one, in the overlap test. */
export const LONG_SOUND_NAME = "Tower Idle 1";
export const SHORT_SOUND_NAME = "Tower Connected";
/** Pause between the first command and the second, for the two trials that wait. */
export const OVERLAP_GAP_MS = 1_000;
/**
 * Ordinary sequences, none of them a rotation. The sound-and-light trial uses one; the back-to-back
 * trial uses two others, so a later command is never a repeat of the sequence the tower is already
 * playing. A repeat can change nothing, and the library queue then waits 30 s.
 */
export const OVERLAP_LIGHT_WITH_SOUND = "victory";
export const OVERLAP_LIGHT_FIRST = "gloat01";
export const OVERLAP_LIGHT_SECOND = "gloat02";
/** One light on the top ring. Layer 0, light 0. */
export const FLASH_LIGHT = { layerIndex: 0, lightIndex: 0 } as const;

export const soundIndexByName = (name: string) =>
  SOUND_CATALOG.find((sound) => sound.name === name)?.index;

export interface PlannedSequence {
  name: (typeof lightSequenceSchema.options)[number];
  flagged: boolean;
  sentWithoutWaiting: boolean;
  capabilityId: "lighting.sequence";
  params: { sequence: string };
}

/** The 21 catalog sequences, in catalog order, with the hold and the silent path marked. */
export const lightSequencePlan = (): PlannedSequence[] =>
  lightSequenceSchema.options.map((name) => ({
    name,
    flagged: (HELD_LIGHT_SEQUENCES as readonly string[]).includes(name),
    sentWithoutWaiting: (SILENT_LIGHT_SEQUENCES as readonly string[]).includes(name),
    capabilityId: "lighting.sequence",
    params: { sequence: name },
  }));

export interface PlannedOverlap {
  id: OverlapTrialId;
  gapMs: number;
  first: { capabilityId: string; params: Record<string, number | string> };
  second: { capabilityId: string; params: Record<string, number | string> };
}

/** The three overlap trials. Sound indexes come from the catalog; a missing name is omitted. */
export const overlapPlan = (): PlannedOverlap[] | undefined => {
  const long = soundIndexByName(LONG_SOUND_NAME);
  const short = soundIndexByName(SHORT_SOUND_NAME);
  if (long === undefined || short === undefined) return undefined;
  return [
    {
      id: "sound-then-sound",
      gapMs: OVERLAP_GAP_MS,
      first: { capabilityId: "sound.play", params: { soundIndex: long } },
      second: { capabilityId: "sound.play", params: { soundIndex: short } },
    },
    {
      id: "sound-then-light",
      gapMs: OVERLAP_GAP_MS,
      first: { capabilityId: "sound.play", params: { soundIndex: long } },
      second: { capabilityId: "lighting.sequence", params: { sequence: OVERLAP_LIGHT_WITH_SOUND } },
    },
    {
      id: "light-then-light",
      gapMs: 0,
      first: { capabilityId: "lighting.sequence", params: { sequence: OVERLAP_LIGHT_FIRST } },
      second: { capabilityId: "lighting.sequence", params: { sequence: OVERLAP_LIGHT_SECOND } },
    },
  ];
};
