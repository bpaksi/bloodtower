import { describe, expect, it } from "vitest";
import {
  commandTimes,
  FLASH_DURATION_MS,
  FLASH_LIGHT,
  FLASH_RATES_HZ,
  HELD_LIGHT_SEQUENCES,
  LONG_SOUND_NAME,
  lightSequencePlan,
  lightSequenceSchema,
  OVERLAP_GAP_MS,
  OVERLAP_LIGHT_FIRST,
  OVERLAP_LIGHT_SECOND,
  OVERLAP_LIGHT_WITH_SOUND,
  overlapPlan,
  SHORT_SOUND_NAME,
  SILENT_LIGHT_SEQUENCES,
  soundIndexByName,
  timingResultSchema,
} from "./index.ts";

const startedAt = "2026-10-15T12:00:00.000Z";

const sequence = (
  name: (typeof lightSequenceSchema.options)[number],
  extra: Record<string, unknown> = {},
) => ({
  name,
  flagged: (HELD_LIGHT_SEQUENCES as readonly string[]).includes(name),
  sentWithoutWaiting: (SILENT_LIGHT_SEQUENCES as readonly string[]).includes(name),
  sentAt: 1_000,
  acknowledgedAt: (SILENT_LIGHT_SEQUENCES as readonly string[]).includes(name) ? null : 1_050,
  doneAt: 4_000,
  outcome: (SILENT_LIGHT_SEQUENCES as readonly string[]).includes(name)
    ? "indeterminate"
    : "confirmed",
  ...extra,
});

const result = (extra: Record<string, unknown> = {}) => ({
  version: 1 as const,
  startedAt,
  notes: "The middle drum sequence looked the same as the others.",
  lightSequences: [sequence("twinkle"), sequence("rotationDrumMiddle")],
  overlap: [
    {
      id: "sound-then-sound" as const,
      gapMs: OVERLAP_GAP_MS,
      first: { capabilityId: "sound.play", sentAt: 10, acknowledgedAt: 70, outcome: "confirmed" },
      second: {
        capabilityId: "sound.play",
        sentAt: 1_010,
        acknowledgedAt: 1_070,
        outcome: "confirmed",
      },
      result: "together" as const,
    },
  ],
  skull: { dropAt: null, towerMadeSound: false },
  flash: {
    warningShown: true,
    skipped: false,
    rates: [
      {
        flashesPerSecond: 2 as const,
        durationMs: FLASH_DURATION_MS,
        sentAt: 5_000,
        finishedAt: 10_000,
        outcome: "confirmed" as const,
      },
    ],
    fastestCleanHz: 4 as const,
  },
  ...extra,
});

describe("timing result", () => {
  it("keeps Bob's notes and a missing acknowledgement as null", () => {
    const parsed = timingResultSchema.parse(result());
    expect(parsed.notes).toBe("The middle drum sequence looked the same as the others.");
    const held = parsed.lightSequences.find((row) => row.name === "rotationDrumMiddle");
    expect(held).toMatchObject({
      flagged: true,
      sentWithoutWaiting: true,
      acknowledgedAt: null,
    });
    expect(held?.acknowledgedAt).not.toBe(0);
  });

  it("refuses a result that names its own file or adds a field", () => {
    expect(timingResultSchema.safeParse(result({ file: "../secret.json" })).success).toBe(false);
    expect(timingResultSchema.safeParse(result({ savedAt: startedAt })).success).toBe(false);
  });

  it("refuses a held sequence that is not flagged, and an ack for a command that was not sent", () => {
    expect(
      timingResultSchema.safeParse({
        ...result(),
        lightSequences: [sequence("rotationDrumMiddle", { flagged: false })],
      }).success,
    ).toBe(false);
    expect(
      timingResultSchema.safeParse({
        ...result(),
        lightSequences: [sequence("twinkle", { sentAt: null, acknowledgedAt: 10 })],
      }).success,
    ).toBe(false);
  });

  it("reads sent and acknowledged times from a lifecycle, and leaves a missing ack null", () => {
    expect(
      commandTimes([
        { stage: "started", at: 100 },
        { stage: "write-completed", at: 160 },
        { stage: "confirmed", at: 160 },
      ]),
    ).toEqual({ sentAt: 160, acknowledgedAt: 160, finishedAt: 160, outcome: "confirmed" });
    expect(
      commandTimes([
        { stage: "started", at: 100 },
        { stage: "write-completed", at: 130 },
        { stage: "indeterminate", at: 130 },
      ]),
    ).toEqual({ sentAt: 130, acknowledgedAt: null, finishedAt: 130, outcome: "indeterminate" });
    expect(commandTimes(undefined)).toEqual({
      sentAt: null,
      acknowledgedAt: null,
      outcome: null,
      finishedAt: null,
    });
  });
});

describe("timing plan", () => {
  it("plays each of the 21 sequences once, flags the one never played, and does not wait on rotation", () => {
    const plan = lightSequencePlan();
    expect(plan).toHaveLength(21);
    expect(plan.map((row) => row.name)).toEqual(lightSequenceSchema.options);
    expect(new Set(plan.map((row) => row.name)).size).toBe(21);
    expect(plan.filter((row) => row.flagged).map((row) => row.name)).toEqual([
      "rotationDrumMiddle",
    ]);
    expect(
      plan
        .filter((row) => row.sentWithoutWaiting)
        .map((row) => row.name)
        .sort(),
    ).toEqual([...SILENT_LIGHT_SEQUENCES].sort());
    for (const row of plan) {
      expect(row.capabilityId).toBe("lighting.sequence");
      expect(row.params).toEqual({ sequence: row.name });
    }
  });

  it("overlaps a long sound with a short one, then a light, then two lights back to back", () => {
    const plan = overlapPlan();
    expect(plan).toBeDefined();
    if (!plan) return;
    expect(plan.map((trial) => trial.id)).toEqual([
      "sound-then-sound",
      "sound-then-light",
      "light-then-light",
    ]);
    expect(plan[0]?.gapMs).toBe(1_000);
    expect(plan[1]?.gapMs).toBe(1_000);
    expect(plan[2]?.gapMs).toBe(0);
    expect(plan[0]?.first.params).toEqual({ soundIndex: soundIndexByName(LONG_SOUND_NAME) });
    expect(plan[0]?.second.params).toEqual({ soundIndex: soundIndexByName(SHORT_SOUND_NAME) });
    expect(plan[0]?.first.params).not.toEqual(plan[0]?.second.params);
    expect(plan[2]?.first.params).not.toEqual(plan[2]?.second.params);
    expect(plan[1]?.second.params).toEqual({ sequence: OVERLAP_LIGHT_WITH_SOUND });
    expect(plan[2]?.first.params).toEqual({ sequence: OVERLAP_LIGHT_FIRST });
    expect(plan[2]?.second.params).toEqual({ sequence: OVERLAP_LIGHT_SECOND });
    const sequences = [OVERLAP_LIGHT_WITH_SOUND, OVERLAP_LIGHT_FIRST, OVERLAP_LIGHT_SECOND];
    expect(new Set(sequences).size).toBe(3);
    for (const name of sequences) {
      expect(SILENT_LIGHT_SEQUENCES as readonly string[]).not.toContain(name);
      expect(name).not.toBe(lightSequenceSchema.options[0]);
      expect(name).not.toBe(lightSequenceSchema.options.at(-1));
    }
    expect(soundIndexByName(LONG_SOUND_NAME)).toBeTypeOf("number");
    expect(soundIndexByName(SHORT_SOUND_NAME)).toBeTypeOf("number");
  });

  it("flashes one light at 2, 4, 6 and 8 Hz for 5 seconds each", () => {
    expect(FLASH_RATES_HZ).toEqual([2, 4, 6, 8]);
    expect(FLASH_DURATION_MS).toBe(5_000);
    expect(FLASH_LIGHT).toEqual({ layerIndex: 0, lightIndex: 0 });
  });
});
