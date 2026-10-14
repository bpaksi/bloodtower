import { z } from "zod";
import type { Verification } from "./inventory.ts";

// Verify mode (M3 step 3.6, spec D14): a person records what a capability did on the tower. The
// records live in the service's SQLite only; the repo inventory never claims `hardware-verified`.

export const verificationResultSchema = z.enum(["pass", "partial", "fail"]);
export type VerificationResult = z.infer<typeof verificationResultSchema>;

/** The most a note may hold. Enough for what was seen; evidence files belong in a gap entry. */
export const VERIFICATION_NOTES_MAX = 2000;

/**
 * Payload of `verify.record`. A `partial` or a `fail` needs notes saying what happened, as that
 * is what its gap entry is written from. The link to a saved diagnostics session (`sessionId`)
 * comes with saved sessions in M4.
 */
export const verifyRecordPayloadSchema = z
  .strictObject({
    capabilityId: z.string().min(1).max(64),
    result: verificationResultSchema,
    notes: z.string().max(VERIFICATION_NOTES_MAX),
  })
  .refine((payload) => payload.result === "pass" || payload.notes.trim() !== "", {
    path: ["notes"],
    message: "Say what happened: a partial or a fail needs notes.",
  });
export type VerifyRecordPayload = z.infer<typeof verifyRecordPayloadSchema>;

/** Where a result was recorded: which tower the service drove, and the device that recorded it. */
export const verificationEnvironmentSchema = z.strictObject({
  tower: z.enum(["mock", "bluetooth"]),
  /** The recording client's `hello` label, such as "iPad Safari". */
  client: z.string().min(1).max(64),
});
export type VerificationEnvironment = z.infer<typeof verificationEnvironmentSchema>;

/** One row of the `verifications` table, as the service sends it. */
export const verificationRecordSchema = z.strictObject({
  id: z.int().positive(),
  capabilityId: z.string().min(1).max(64),
  result: verificationResultSchema,
  notes: z.string().max(VERIFICATION_NOTES_MAX),
  /** Null until saved diagnostics sessions exist (M4). */
  diagnosticSessionId: z.string().min(1).nullable(),
  libraryVersion: z.string().min(1),
  appVersion: z.string().min(1),
  /** Milliseconds since the epoch. */
  testedAt: z.int().nonnegative(),
  environment: verificationEnvironmentSchema,
});
export type VerificationRecord = z.infer<typeof verificationRecordSchema>;

/** The newest record for each capability that has one, keyed by inventory id. */
export const verificationOverlaySchema = z.record(
  z.string().min(1).max(64),
  verificationRecordSchema,
);
export type VerificationOverlay = z.infer<typeof verificationOverlaySchema>;

/** Payload of `verify.changed`, sent to every client when a result is recorded. */
export const verifyChangedPayloadSchema = z.strictObject({
  verificationOverlay: verificationOverlaySchema,
});

/**
 * What the app can say about a capability: the repo's claim, overlaid with the newest result
 * recorded on the real tower (D14). A result recorded on the mock tower changes nothing here.
 */
export type EffectiveVerification =
  | Verification
  | "hardware-verified"
  | "hardware-partial"
  | "hardware-failed";

export const EFFECTIVE_VERIFICATIONS: readonly EffectiveVerification[] = [
  "untested",
  "mock-tested",
  "hardware-verified",
  "hardware-partial",
  "hardware-failed",
];

const HARDWARE: Record<VerificationResult, EffectiveVerification> = {
  pass: "hardware-verified",
  partial: "hardware-partial",
  fail: "hardware-failed",
};

export const effectiveVerification = (
  repo: Verification,
  latest: VerificationRecord | undefined,
): EffectiveVerification =>
  latest?.environment.tower === "bluetooth" ? HARDWARE[latest.result] : repo;
