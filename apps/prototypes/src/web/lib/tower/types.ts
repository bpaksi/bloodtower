// A local copy of the tower-poc messages this client uses (Bob, 2026-10-21: a copy, not a move to
// packages/). drift.test.ts reads apps/tower-poc/src/protocols as text and fails if it differs.
// Nothing here carries raw bytes: the only way to the hardware is command{capabilityId, params}.

export const PROTOCOL_VERSION = 1;

/** Message types this client sends. */
export const CLIENT_TYPES = ["hello", "connect", "disconnect", "calibrate", "command"] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];

/** Message types this client understands from the server. */
export const SERVER_TYPES = ["welcome", "error", "connection", "command.lifecycle"] as const;

export const LIFECYCLE_STAGES = [
  "queued",
  "started",
  "write-completed",
  "confirmed",
  "indeterminate",
  "failed",
  "timed-out",
  "rejected",
] as const;
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

/** A command ends in exactly one of these. */
export const END_STAGES: readonly LifecycleStage[] = [
  "confirmed",
  "indeterminate",
  "failed",
  "timed-out",
  "rejected",
];

export const ERROR_CODES = [
  "invalid-json",
  "invalid-envelope",
  "unknown-type",
  "invalid-payload",
  "invalid-state",
] as const;
export type ServerErrorCode = (typeof ERROR_CODES)[number];

export const CONNECTION_STATES = [
  "bluetooth-unavailable",
  "disconnected",
  "scanning",
  "connecting",
  "connected",
  "disconnecting",
  "error",
] as const;
export type ConnectionState = (typeof CONNECTION_STATES)[number];

export const CALIBRATION_STATES = ["uncalibrated", "calibrating", "calibrated"] as const;
export type CalibrationState = (typeof CALIBRATION_STATES)[number];

/**
 * Capability ids the prototypes name (P-06 and P-07). A prototype may name only these; add one
 * here, and the drift test checks it still exists in tower-poc's inventory.
 */
export const CAPABILITY_IDS = [
  "sound.play",
  "lighting.all-on",
  "lighting.all-off",
  "lighting.flash",
] as const;
export type CapabilityId = (typeof CAPABILITY_IDS)[number];

/** Top-level fields of each copied payload, checked by the drift test. */
export const PAYLOAD_FIELDS = {
  helloPayloadSchema: ["clientLabel"],
  commandPayloadSchema: ["capabilityId", "params"],
  commandLifecyclePayloadSchema: [
    "commandId",
    "capabilityId",
    "clientId",
    "stage",
    "at",
    "reason",
    "issues",
    "written",
  ],
  connectionPayloadSchema: ["state", "calibration", "device", "error"],
  errorPayloadSchema: ["code", "message", "actionable"],
  envelopeSchema: ["v", "type", "id", "correlationId", "payload"],
} as const;

export interface Envelope<T extends string = string, P = unknown> {
  v: typeof PROTOCOL_VERSION;
  type: T;
  id?: string;
  correlationId?: string;
  payload: P;
}

export interface CommandPayload {
  capabilityId: CapabilityId;
  params: unknown;
}

export interface LifecyclePayload {
  commandId: string;
  capabilityId: string;
  clientId: string;
  stage: LifecycleStage;
  at: number;
  reason?: string;
  issues?: { path: (string | number)[]; message: string }[];
  written?: false;
}

export interface ConnectionPayload {
  state: ConnectionState;
  calibration: CalibrationState;
  device?: Record<string, string | null>;
  error?: { code: string; message: string; actionable?: string };
}

export interface ErrorPayload {
  code: ServerErrorCode;
  message: string;
  actionable?: string;
}

export interface WelcomePayload {
  clientId: string;
  tower: "mock" | "bluetooth";
  [key: string]: unknown;
}
