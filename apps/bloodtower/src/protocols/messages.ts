import { z } from "zod";
import { controlActionSchema, controlLockSchema, promptIdSchema } from "./control.ts";
import {
  deviceIdSchema,
  formFactorSchema,
  hunterIdSchema,
  joinCodeSchema,
  roleSchema,
  tokenSchema,
} from "./devices.ts";
import { assetIdSchema, momentIdSchema, privateHunterOf } from "./pack.ts";
import { pauseCauseSchema } from "./timing.ts";

export const PROTOCOL_VERSION = 1;

/**
 * WebSocket messages for R1.
 * No message carries raw bytes, a capability id, or tower parameters.
 * Tower connect and calibrate are control actions. The story board is display only:
 * its payloads never carry an `ipad:*` target or a `.private.` moment.
 */

const issue = (ctx: z.RefinementCtx, message: string) => {
  ctx.addIssue({ code: "custom", message });
};

export const envelopeSchema = z.strictObject({
  v: z.literal(PROTOCOL_VERSION),
  type: z.string().min(1).max(80),
  id: z.string().min(1).max(64).optional(),
  correlationId: z.string().min(1).max(64).optional(),
  payload: z.unknown(),
});
export type Envelope = z.infer<typeof envelopeSchema>;

const message = <const T extends string, P extends z.ZodType>(type: T, payload: P) =>
  z.strictObject({
    v: z.literal(PROTOCOL_VERSION),
    type: z.literal(type),
    id: z.string().min(1).max(64).optional(),
    correlationId: z.string().min(1).max(64).optional(),
    payload,
  });

const FORBIDDEN_STORYBOARD_KEYS = new Set([
  "privateMoment",
  "bytes",
  "raw",
  "packet",
  "capabilityId",
  "params",
]);

/** True when a value carries a private moment, an ipad target, or a tower-command field. */
export const containsPrivateChannel = (value: unknown): boolean => {
  const walk = (node: unknown): boolean => {
    if (typeof node === "string") {
      return node.includes(".private.") || node.includes("ipad:");
    }
    if (Array.isArray(node)) return node.some((entry) => walk(entry));
    if (node && typeof node === "object") {
      for (const [key, entry] of Object.entries(node)) {
        if (FORBIDDEN_STORYBOARD_KEYS.has(key) || walk(entry)) return true;
      }
    }
    return false;
  };
  return walk(value);
};

const refusePrivate = (value: unknown, ctx: z.RefinementCtx) => {
  if (containsPrivateChannel(value)) {
    issue(ctx, "The story board cannot carry a private moment or a tower command.");
  }
};

export const helloPayloadSchema = z
  .strictObject({
    role: roleSchema,
    clientLabel: z.string().min(1).max(64),
    formFactor: formFactorSchema,
    token: tokenSchema.optional(),
    joinCode: joinCodeSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.role === "storyboard") {
      if (value.formFactor !== "mac") {
        issue(ctx, "The story board uses the mac form factor.");
      }
      if (value.token || value.joinCode) {
        issue(ctx, "The story board does not join with a code or a device token.");
      }
      return;
    }
    if (value.formFactor === "mac") {
      issue(ctx, "A player device is an iPad or a phone.");
    }
    if (!value.token && !value.joinCode) {
      issue(ctx, "A device joins with a code or rejoins with its token.");
    }
  });

/** Holdings change. The server accepts this only on a device socket. */
export const holdPayloadSchema = z.strictObject({
  hunter: hunterIdSchema,
  action: z.enum(["take", "release"]),
});

/** A press. The server accepts this only on a device socket and locks the first arrival. */
export const controlPayloadSchema = z.strictObject({
  promptId: promptIdSchema,
  action: controlActionSchema,
});

export const helloMessageSchema = message("hello", helloPayloadSchema);
export const holdMessageSchema = message("hold", holdPayloadSchema);
export const controlMessageSchema = message("control", controlPayloadSchema);

export const clientMessageSchema = z.discriminatedUnion("type", [
  helloMessageSchema,
  holdMessageSchema,
  controlMessageSchema,
]);
export type ClientMessage = z.infer<typeof clientMessageSchema>;

export const CLIENT_MESSAGE_TYPES: readonly string[] = clientMessageSchema.options.map(
  (option) => option.shape.type.value,
);

export const errorCodeSchema = z.enum([
  "invalid-json",
  "invalid-envelope",
  "unknown-type",
  "invalid-payload",
  "invalid-state",
  "private-on-storyboard",
  "storyboard-control",
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorPayloadSchema = z
  .strictObject({
    code: errorCodeSchema,
    message: z.string().min(1).max(300),
    actionable: z.string().min(1).max(300).optional(),
  })
  .superRefine((value, ctx) => refusePrivate(value, ctx));

const httpUrlSchema = z.string().refine(
  (value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  },
  { message: "Expected an http or https URL." },
);

export const channelSchema = z
  .string()
  .refine((value) => value === "storyboard" || /^ipad:[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value), {
    message: "A channel is storyboard or ipad:<hunter>.",
  });

export const welcomePayloadSchema = z
  .strictObject({
    clientId: z.string().min(1).max(64),
    role: roleSchema,
    token: tokenSchema,
    /**
     * Story board: exactly `storyboard`.
     * Device: one `ipad:<hunter>` for each hunter it holds at hello, or none yet.
     * A device that has not taken a hunter has an empty list. That is not the storyboard channel.
     */
    channels: z.array(channelSchema).max(16),
    versions: z.strictObject({
      protocol: z.literal(PROTOCOL_VERSION),
      server: z.string().min(1).max(32),
      node: z.string().min(1).max(32),
    }),
  })
  .superRefine((value, ctx) => {
    if (new Set(value.channels).size !== value.channels.length) {
      issue(ctx, "A channel is listed twice.");
    }
    if (value.role === "storyboard") {
      if (value.channels.length !== 1 || value.channels[0] !== "storyboard") {
        issue(ctx, "A story board socket subscribes only to the storyboard channel.");
      }
      return;
    }
    if (value.channels.includes("storyboard")) {
      issue(ctx, "A device socket does not subscribe to the storyboard channel.");
    }
  });

/** Known reading, or unavailable. A known 0 stays 0. Unavailable is a different state. */
export const towerBatterySchema = z.discriminatedUnion("state", [
  z.strictObject({ state: z.literal("unavailable") }),
  z.strictObject({
    state: z.literal("known"),
    percent: z.number().int().min(0).max(100),
  }),
]);

export const towerCalibrationSchema = z.discriminatedUnion("state", [
  z.strictObject({ state: z.literal("unavailable") }),
  z.strictObject({ state: z.literal("known"), calibrated: z.boolean() }),
]);

export const towerSnapshotSchema = z.strictObject({
  connection: z.enum(["unavailable", "disconnected", "connecting", "connected"]),
  battery: towerBatterySchema,
  calibrated: towerCalibrationSchema,
});
export type TowerSnapshot = z.infer<typeof towerSnapshotSchema>;

export const sharedMomentSchema = z
  .strictObject({
    id: momentIdSchema,
    kind: z.enum(["still", "clip", "text-card", "pick-card"]),
    text: z.string().min(1).max(2000).nullable(),
    still: assetIdSchema.nullable(),
    fallbackAudio: assetIdSchema.nullable(),
  })
  .superRefine((value, ctx) => {
    if (privateHunterOf(value.id)) {
      issue(ctx, "The story board moment is a shared moment.");
    }
  });

export const publicHunterSchema = z.strictObject({
  id: hunterIdSchema,
  name: z.string().min(1).max(80),
  holders: z.array(deviceIdSchema).max(8),
});

export const promptSchema = z.strictObject({
  id: promptIdSchema,
  label: z.string().min(1).max(200),
});

export const pauseBannerSchema = z.strictObject({
  cause: pauseCauseSchema,
  hunter: hunterIdSchema.nullable(),
});

export const STORYBOARD_STAGES = ["lobby", "playing", "paused"] as const;

export const storyboardStatePayloadSchema = z
  .strictObject({
    stage: z.enum(STORYBOARD_STAGES),
    hunters: z.array(publicHunterSchema).max(16),
    join: z
      .strictObject({
        code: joinCodeSchema,
        url: httpUrlSchema,
      })
      .nullable(),
    prompt: promptSchema.nullable(),
    moment: sharedMomentSchema.nullable(),
    pause: pauseBannerSchema.nullable(),
    tower: towerSnapshotSchema,
    gate: z.strictObject({
      canBegin: z.boolean(),
      unheld: z.array(hunterIdSchema).max(16),
    }),
    lock: controlLockSchema.nullable(),
  })
  .superRefine((value, ctx) => {
    refusePrivate(value, ctx);
    const ids = value.hunters.map((hunter) => hunter.id);
    if (new Set(ids).size !== ids.length) issue(ctx, "A hunter is listed twice.");
    for (const hunter of value.hunters) {
      if (new Set(hunter.holders).size !== hunter.holders.length) {
        issue(ctx, `${hunter.id} lists a device twice.`);
      }
    }
    const heldIds = new Set(
      value.hunters.filter((hunter) => hunter.holders.length > 0).map((hunter) => hunter.id),
    );
    if (value.gate.canBegin !== (value.gate.unheld.length === 0)) {
      issue(ctx, "Begin is open only when every hunter is held.");
    }
    for (const id of value.gate.unheld) {
      if (!ids.includes(id)) issue(ctx, `${id} is unheld but not in the hunter list.`);
      if (heldIds.has(id)) issue(ctx, `${id} is unheld but a device holds them.`);
    }
    if (value.stage === "paused" && !value.pause) issue(ctx, "A paused board names the cause.");
    if (value.stage !== "paused" && value.pause)
      issue(ctx, "A pause banner is only on a paused board.");
    if (value.pause?.cause === "host-pause" && value.pause.hunter) {
      issue(ctx, "A host pause does not name a hunter.");
    }
    if (
      value.pause &&
      (value.pause.cause === "unheld-hunter" || value.pause.cause === "disconnect") &&
      !value.pause.hunter
    ) {
      issue(ctx, "An unheld or disconnect pause names the hunter.");
    }
  });
export type StoryboardState = z.infer<typeof storyboardStatePayloadSchema>;

export const privateMomentSchema = z.strictObject({
  momentId: momentIdSchema,
  text: z.string().min(1).max(2000),
  still: assetIdSchema.nullable(),
});

export const hunterViewSchema = z
  .strictObject({
    hunter: hunterIdSchema,
    name: z.string().min(1).max(80),
    privateMoment: privateMomentSchema.nullable(),
  })
  .superRefine((value, ctx) => {
    if (!value.privateMoment) return;
    if (privateHunterOf(value.privateMoment.momentId) !== value.hunter) {
      issue(ctx, "A private moment belongs to the hunter it is shown to.");
    }
  });

const rosterEntrySchema = z.strictObject({
  id: hunterIdSchema,
  name: z.string().min(1).max(80),
});

export const deviceStatePayloadSchema = z
  .strictObject({
    heldHunters: z.array(hunterIdSchema).max(16),
    views: z.array(hunterViewSchema).max(16),
    prompt: promptSchema.nullable(),
    lock: controlLockSchema.nullable(),
    /** This device won the current lock, or it lost. Null when nothing is locked. */
    won: z.boolean().nullable(),
    /**
     * Beside the gameplay lock, so a device can draw the tower, the pause prompt
     * and the connect and calibrate locks without a second message type.
     * The roster is id and name only. It carries no private line.
     */
    tower: towerSnapshotSchema.optional(),
    pausePromptId: promptIdSchema.nullable().optional(),
    connectLock: controlLockSchema.nullable().optional(),
    calibrateLock: controlLockSchema.nullable().optional(),
    roster: z.array(rosterEntrySchema).max(16).optional(),
  })
  .superRefine((value, ctx) => {
    if (new Set(value.heldHunters).size !== value.heldHunters.length) {
      issue(ctx, "A hunter is listed twice.");
    }
    const viewed = value.views.map((view) => view.hunter);
    if (new Set(viewed).size !== viewed.length) issue(ctx, "A hunter view is listed twice.");
    if (
      viewed.length !== value.heldHunters.length ||
      viewed.some((hunter) => !value.heldHunters.includes(hunter))
    ) {
      issue(ctx, "A device state has one view for each hunter it holds.");
    }
    if ((value.lock === null) !== (value.won === null)) {
      issue(ctx, "A lock and its won flag are set together.");
    }
    if (
      value.roster &&
      new Set(value.roster.map((hunter) => hunter.id)).size !== value.roster.length
    ) {
      issue(ctx, "A hunter is listed twice.");
    }
  });
export type DeviceState = z.infer<typeof deviceStatePayloadSchema>;

export const welcomeMessageSchema = message("welcome", welcomePayloadSchema);
export const errorMessageSchema = message("error", errorPayloadSchema);
export const storyboardStateMessageSchema = message(
  "storyboardState",
  storyboardStatePayloadSchema,
);
export const deviceStateMessageSchema = message("deviceState", deviceStatePayloadSchema);

export const serverMessageSchema = z.discriminatedUnion("type", [
  welcomeMessageSchema,
  errorMessageSchema,
  storyboardStateMessageSchema,
  deviceStateMessageSchema,
]);
export type ServerMessage = z.infer<typeof serverMessageSchema>;

export const SERVER_MESSAGE_TYPES: readonly string[] = serverMessageSchema.options.map(
  (option) => option.shape.type.value,
);

/** `GET /health`. Connection only: this process sends no tower effects. */
export const hostHealthSchema = z.strictObject({
  protocol: z.literal(PROTOCOL_VERSION),
  tower: z.literal("connection-only"),
  effects: z.literal("none"),
});
export type HostHealth = z.infer<typeof hostHealthSchema>;
