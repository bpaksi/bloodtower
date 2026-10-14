import { z } from "zod";
import {
  battleStatusSchema,
  carriedItemsSchema,
  containsPrivateMoment,
  corruptionValueSchema,
  costAppliedPayloadSchema,
  cuePlaySchema,
  deviceIdSchema,
  endReasonSchema,
  fightResultSchema,
  forewarnedChoiceSchema,
  formFactorSchema,
  holdPausePayloadSchema,
  hunterIdSchema,
  investigationActionSchema,
  isDashboardSafe,
  joinCodeSchema,
  lidChoiceSchema,
  loggedEventSchema,
  momentIdSchema,
  momentTargetSchema,
  nightSchema,
  partyHuntersSchema,
  privateHunterOf,
  STORY_FLAG_KEY,
  storyItemIdSchema,
  targetForMoment,
  tokenSchema,
} from "./types.ts";

export const PROTOCOL_VERSION = 1;

/**
 * Every WebSocket message in both directions.
 * `payload` is checked again by the schema for that type. No message carries raw bytes,
 * and none of these types is a tower command (R4-1).
 */
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

const refusePrivate = (value: unknown, ctx: z.RefinementCtx) => {
  if (!isDashboardSafe(value) || containsPrivateMoment(value)) {
    ctx.addIssue({
      code: "custom",
      message: "The dashboard channel cannot carry a private moment or a personal event.",
    });
  }
};

// Client → server

export const helloPayloadSchema = z
  .strictObject({
    role: z.enum(["dashboard", "device"]),
    clientLabel: z.string().min(1).max(64),
    formFactor: z.enum(["mac", "ipad", "phone"]),
    /** Set when a device is rejoining with the token from its first welcome. */
    token: tokenSchema.optional(),
    /** Numeric code from the Dashboard QR, when the device is joining rather than rejoining. */
    joinCode: joinCodeSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.role === "dashboard" && value.formFactor !== "mac") {
      ctx.addIssue({ code: "custom", message: "The dashboard role uses the mac form factor." });
    }
    if (value.role === "device" && value.formFactor === "mac") {
      ctx.addIssue({ code: "custom", message: "A player device is an iPad or a phone." });
    }
  });

export const holdPayloadSchema = z.strictObject({
  deviceId: deviceIdSchema,
  hunter: hunterIdSchema,
  action: z.enum(["take", "release"]),
  by: z.enum(["device", "dashboard"]),
});

export const setPresencePayloadSchema = z.strictObject({
  hunter: hunterIdSchema,
  location: z.enum(["sanctuary", "away"]),
});

const emptyPayloadSchema = z.strictObject({});

export const lidChoiceMessagePayloadSchema = z
  .strictObject({
    choice: lidChoiceSchema,
    /** Present carrier who spends the stake. Required for nailed, null for watched. */
    stakeCarrier: hunterIdSchema.nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.choice === "nailed" && !value.stakeCarrier) {
      ctx.addIssue({
        code: "custom",
        message: "Nailing names the present hunter who spends the stake.",
      });
    }
    if (value.choice === "watched" && value.stakeCarrier) {
      ctx.addIssue({ code: "custom", message: "Watching does not spend a stake." });
    }
  });

export const fightResultMessagePayloadSchema = z.strictObject({
  result: fightResultSchema,
});

export const spendHolyWaterPayloadSchema = z.strictObject({
  hunter: hunterIdSchema,
  /** +1 Undead toward the cap, or a price removed before a later cost is picked (R3-7). */
  purpose: z.enum(["advantage", "price"]),
});

export const costPickPayloadSchema = z
  .strictObject({
    kind: z.enum(["corruption", "item"]),
    hunter: hunterIdSchema,
    item: storyItemIdSchema.nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "corruption" && value.item) {
      ctx.addIssue({ code: "custom", message: "A corruption pick does not name an item." });
    }
    if (value.kind === "item" && !value.item) {
      ctx.addIssue({ code: "custom", message: "An item pick names the item." });
    }
  });

export const reassignPayloadSchema = z.strictObject({
  hunter: hunterIdSchema,
  deviceId: deviceIdSchema,
});

export const endSessionPayloadSchema = z.strictObject({
  reason: z.enum(["end-for-now", "concede"]),
});

export const investigationPickPayloadSchema = z.strictObject({
  hunter: hunterIdSchema,
  action: investigationActionSchema,
});

export const forewarnedChoiceMessagePayloadSchema = z.strictObject({
  hunter: hunterIdSchema,
  choice: forewarnedChoiceSchema,
});

/** The host types the physical Forewarned card so the battle status can show it (R3-1). */
export const forewarnedCardPayloadSchema = z.strictObject({
  hunter: hunterIdSchema,
  card: z.string().min(1).max(120),
});

export const privateContinuePayloadSchema = z
  .strictObject({
    hunter: hunterIdSchema,
    momentId: momentIdSchema,
  })
  .superRefine((value, ctx) => {
    if (privateHunterOf(value.momentId) !== value.hunter) {
      ctx.addIssue({
        code: "custom",
        message: "Continue names a private moment for that hunter.",
      });
    }
  });

export const funRatingMessagePayloadSchema = z.strictObject({
  hunter: hunterIdSchema,
  rating: z.number().int().min(1).max(5),
  note: z.string().max(500).nullable(),
});

export const helloMessageSchema = message("hello", helloPayloadSchema);
export const holdMessageSchema = message("hold", holdPayloadSchema);
export const setPresenceMessageSchema = message("setPresence", setPresencePayloadSchema);
export const confirmKitMessageSchema = message("confirmKit", emptyPayloadSchema);
export const startMessageSchema = message("start", emptyPayloadSchema);
export const advanceMessageSchema = message("advance", emptyPayloadSchema);
export const lidChoiceMessageSchema = message("lidChoice", lidChoiceMessagePayloadSchema);
export const fightResultMessageSchema = message("fightResult", fightResultMessagePayloadSchema);
export const costPickMessageSchema = message("costPick", costPickPayloadSchema);
export const spendHolyWaterMessageSchema = message("spendHolyWater", spendHolyWaterPayloadSchema);
export const skullDoneMessageSchema = message("skullDone", emptyPayloadSchema);
export const reassignMessageSchema = message("reassign", reassignPayloadSchema);
export const endSessionMessageSchema = message("endSession", endSessionPayloadSchema);
export const investigationPickMessageSchema = message(
  "investigationPick",
  investigationPickPayloadSchema,
);
export const investigationContinueMessageSchema = message(
  "investigationContinue",
  emptyPayloadSchema,
);
export const forewarnedChoiceMessageSchema = message(
  "forewarnedChoice",
  forewarnedChoiceMessagePayloadSchema,
);
export const forewarnedCardMessageSchema = message("forewarnedCard", forewarnedCardPayloadSchema);
export const privateContinueMessageSchema = message(
  "privateContinue",
  privateContinuePayloadSchema,
);
export const funRatingMessageSchema = message("funRating", funRatingMessagePayloadSchema);

export const clientMessageSchema = z.discriminatedUnion("type", [
  helloMessageSchema,
  holdMessageSchema,
  setPresenceMessageSchema,
  confirmKitMessageSchema,
  startMessageSchema,
  advanceMessageSchema,
  lidChoiceMessageSchema,
  fightResultMessageSchema,
  costPickMessageSchema,
  spendHolyWaterMessageSchema,
  skullDoneMessageSchema,
  reassignMessageSchema,
  endSessionMessageSchema,
  investigationPickMessageSchema,
  investigationContinueMessageSchema,
  forewarnedChoiceMessageSchema,
  forewarnedCardMessageSchema,
  privateContinueMessageSchema,
  funRatingMessageSchema,
]);
export type ClientMessage = z.infer<typeof clientMessageSchema>;

/** Message types a client may send. Anything else is answered with `unknown-type`. */
export const CLIENT_MESSAGE_TYPES: readonly string[] = clientMessageSchema.options.map(
  (option) => option.shape.type.value,
);

// Server → client

export const errorCodeSchema = z.enum([
  "invalid-json",
  "invalid-envelope",
  "unknown-type",
  "invalid-payload",
  "invalid-state",
  "private-on-dashboard",
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorPayloadSchema = z
  .strictObject({
    code: errorCodeSchema,
    message: z.string().min(1).max(300),
    actionable: z.string().min(1).max(300).optional(),
  })
  .superRefine((value, ctx) => refusePrivate(value, ctx));

export const welcomePayloadSchema = z
  .strictObject({
    clientId: z.string().min(1).max(64),
    role: z.enum(["dashboard", "device"]),
    token: tokenSchema,
    channels: z.array(momentTargetSchema).max(4),
    versions: z.strictObject({
      protocol: z.literal(PROTOCOL_VERSION),
      server: z.string().min(1).max(32),
      node: z.string().min(1).max(32),
    }),
  })
  .superRefine((value, ctx) => {
    if (value.role === "dashboard") {
      if (value.channels.length !== 1 || value.channels[0] !== "dashboard") {
        ctx.addIssue({
          code: "custom",
          message: "A dashboard socket subscribes only to the dashboard channel.",
        });
      }
      return;
    }
    if (value.channels.includes("dashboard")) {
      ctx.addIssue({
        code: "custom",
        message: "A device socket does not subscribe to the dashboard channel.",
      });
    }
    if (new Set(value.channels).size !== value.channels.length) {
      ctx.addIssue({ code: "custom", message: "A channel is listed twice." });
    }
  });

const httpUrlSchema = z.string().refine(
  (value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  },
  { message: "Expected an http or https URL." },
);

export const publicMomentSchema = z
  .strictObject({
    id: momentIdSchema,
    target: z.literal("dashboard"),
  })
  .superRefine((value, ctx) => {
    if (targetForMoment(value.id) !== "dashboard") {
      ctx.addIssue({ code: "custom", message: "The dashboard moment is a shared moment." });
    }
  });

/** Screens in PRD §4. One value, so a null moment is not also the join screen and the summary. */
export const FLOW_STAGES = [
  "door",
  "join",
  "holdings",
  "presence",
  "kit",
  "scene",
  "night-card",
  "summary",
  "ended",
] as const;
export const flowStageSchema = z.enum(FLOW_STAGES);

/** Mini summary computed from stored stats (PRD-25). No private text and no fun ratings. */
export const publicSummarySchema = z.strictObject({
  outcome: endReasonSchema.nullable(),
  lidChoice: lidChoiceSchema.nullable(),
  fightResult: fightResultSchema.nullable(),
  costs: z.array(costAppliedPayloadSchema).max(16),
  skullsDropped: z.number().int().nonnegative().nullable(),
  storyFlag: z.boolean().nullable(),
  cuesFallback: z.number().int().nonnegative().nullable(),
});

/** A player device the Dashboard can reassign a hunter onto (R3-2, PRD-20). */
export const deviceRosterEntrySchema = z.strictObject({
  deviceId: deviceIdSchema,
  formFactor: formFactorSchema,
  connected: z.boolean(),
  heldHunters: z
    .array(hunterIdSchema)
    .max(4)
    .superRefine((hunters, ctx) => {
      if (new Set(hunters).size !== hunters.length) {
        ctx.addIssue({ code: "custom", message: "A hunter is listed twice." });
      }
    }),
});

export const dashboardStatePayloadSchema = z
  .strictObject({
    stage: flowStageSchema,
    night: nightSchema,
    hunters: partyHuntersSchema,
    skullSupply: z.number().int().nonnegative().nullable(),
    skullDropsTonight: z.number().int().nonnegative().nullable(),
    storyFlag: z
      .strictObject({
        key: z.literal(STORY_FLAG_KEY),
        value: z.boolean(),
      })
      .nullable(),
    moment: publicMomentSchema.nullable(),
    /** Every hunter whose holdings have no connected device. Empty while play is running. */
    paused: z.array(holdPausePayloadSchema).max(4),
    devices: z.array(deviceRosterEntrySchema).max(16),
    join: z
      .strictObject({
        code: joinCodeSchema,
        url: httpUrlSchema,
      })
      .nullable(),
    battle: battleStatusSchema.nullable(),
    lidChoice: lidChoiceSchema.nullable(),
    fightResult: fightResultSchema.nullable(),
    /** Set on the summary and ended screens. Null before then. */
    summary: publicSummarySchema.nullable(),
    gate: z.strictObject({
      canBegin: z.boolean(),
      unheld: z.array(hunterIdSchema).max(4),
    }),
  })
  .superRefine((value, ctx) => {
    refusePrivate(value, ctx);
    const pausedHunters = value.paused.map((row) => row.hunter);
    if (new Set(pausedHunters).size !== pausedHunters.length) {
      ctx.addIssue({ code: "custom", message: "A paused hunter is listed twice." });
    }
    const deviceIds = value.devices.map((device) => device.deviceId);
    if (new Set(deviceIds).size !== deviceIds.length) {
      ctx.addIssue({ code: "custom", message: "A device is listed twice." });
    }
    for (const row of value.paused) {
      const stillHeld = value.devices.some(
        (device) => device.connected && device.heldHunters.includes(row.hunter),
      );
      if (stillHeld) {
        ctx.addIssue({
          code: "custom",
          message: `${row.hunter} is paused, but a connected device still holds them.`,
        });
      }
    }
  });
export type DashboardState = z.infer<typeof dashboardStatePayloadSchema>;

export const pendingChoiceSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("investigation"),
    actions: z.array(investigationActionSchema).min(1).max(5),
  }),
  z.strictObject({ kind: z.literal("forewarned") }),
  z.strictObject({ kind: z.literal("continue") }),
  z.strictObject({ kind: z.literal("fun-rating") }),
]);

/**
 * One held hunter on a device (PRD-20, PRD-35). Status and a pending choice stand on their own.
 * `privateMoment` is set only when that hunter has a real private moment to read.
 */
export const hunterViewSchema = z
  .strictObject({
    hunter: hunterIdSchema,
    corruption: corruptionValueSchema,
    carriedItems: carriedItemsSchema,
    statusLine: z.string().min(1).max(300).nullable(),
    pendingChoice: pendingChoiceSchema.nullable(),
    privateMoment: z
      .strictObject({
        momentId: momentIdSchema,
        text: z.string().min(1).max(2000),
      })
      .nullable(),
    /** Personal end line (R3-9). Null until the summary. */
    endLine: z.string().min(1).max(2000).nullable(),
    funRating: z.number().int().min(1).max(5).nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.privateMoment && privateHunterOf(value.privateMoment.momentId) !== value.hunter) {
      ctx.addIssue({
        code: "custom",
        message: "A private moment belongs to the hunter it names.",
      });
    }
  });

export const deviceStatePayloadSchema = z
  .strictObject({
    heldHunters: z.array(hunterIdSchema).max(4),
    views: z.array(hunterViewSchema).max(4),
  })
  .superRefine((value, ctx) => {
    if (new Set(value.heldHunters).size !== value.heldHunters.length) {
      ctx.addIssue({ code: "custom", message: "A hunter is listed twice." });
    }
    const viewed = value.views.map((view) => view.hunter);
    if (new Set(viewed).size !== viewed.length) {
      ctx.addIssue({ code: "custom", message: "A hunter view is listed twice." });
    }
    if (
      viewed.length !== value.heldHunters.length ||
      viewed.some((hunter) => !value.heldHunters.includes(hunter))
    ) {
      ctx.addIssue({
        code: "custom",
        message: "A device state has one view for each hunter it holds.",
      });
    }
  });

export const dashboardEventPayloadSchema = loggedEventSchema.superRefine((value, ctx) =>
  refusePrivate(value, ctx),
);

export const welcomeMessageSchema = message("welcome", welcomePayloadSchema);
export const errorMessageSchema = message("error", errorPayloadSchema);
export const dashboardStateMessageSchema = message("dashboardState", dashboardStatePayloadSchema);
export const deviceStateMessageSchema = message("deviceState", deviceStatePayloadSchema);
export const cueMessagePayloadSchema = cuePlaySchema.superRefine((value, ctx) =>
  refusePrivate(value, ctx),
);
export const cueMessageSchema = message("cue", cueMessagePayloadSchema);
export const dashboardEventMessageSchema = message("dashboardEvent", dashboardEventPayloadSchema);

export const serverMessageSchema = z.discriminatedUnion("type", [
  welcomeMessageSchema,
  errorMessageSchema,
  dashboardStateMessageSchema,
  deviceStateMessageSchema,
  cueMessageSchema,
  dashboardEventMessageSchema,
]);
export type ServerMessage = z.infer<typeof serverMessageSchema>;

export const SERVER_MESSAGE_TYPES: readonly string[] = serverMessageSchema.options.map(
  (option) => option.shape.type.value,
);

/** `GET /health`. The host is up, and it is not using a tower. */
export const hostHealthSchema = z.strictObject({
  protocol: z.literal(PROTOCOL_VERSION),
  towerUsed: z.literal(false),
});
export type HostHealth = z.infer<typeof hostHealthSchema>;
