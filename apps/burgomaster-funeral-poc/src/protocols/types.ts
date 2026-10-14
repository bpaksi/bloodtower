import { z } from "zod";

/**
 * Shared game contract for `n2-burgomasters-funeral` (PRD rev 4, §6–§8).
 * Tower commands, tower events and raw bytes are Phase 2 and are not part of this contract.
 * Unknown values are null. A count of zero is a real zero, not a stand-in for unknown.
 */

export const SCENE_ID = "n2-burgomasters-funeral" as const;

export const HUNTER_IDS = ["agnes", "tomas", "wren", "emeric"] as const;
export const hunterIdSchema = z.enum(HUNTER_IDS);
export type HunterId = z.infer<typeof hunterIdSchema>;

/** 3 would be Turned. The instant-loss guard keeps this scene at 0–2 (PRD §6). */
export const CORRUPTION_MAX = 2;
export const corruptionSchema = z.number().int().min(0).max(CORRUPTION_MAX);
/** Null when the host has no reading yet. Never coerced to 0. */
export const corruptionValueSchema = corruptionSchema.nullable();

export const STORY_ITEM_IDS = ["stake", "holy-water", "host", "holy-symbol"] as const;
export const storyItemIdSchema = z.enum(STORY_ITEM_IDS);
export type StoryItemId = z.infer<typeof storyItemIdSchema>;

const itemCountSchema = z.number().int().nonnegative();

export const carriedItemsSchema = z.strictObject({
  stake: itemCountSchema,
  "holy-water": itemCountSchema,
  host: itemCountSchema,
  "holy-symbol": itemCountSchema,
});
export type CarriedItems = z.infer<typeof carriedItemsSchema>;

/** OQ-3. The holy symbol starts off; it is a test toggle, not part of this kit. */
export const STARTING_CARRIED_ITEMS: Record<HunterId, CarriedItems> = {
  agnes: { stake: 0, "holy-water": 1, host: 0, "holy-symbol": 0 },
  tomas: { stake: 1, "holy-water": 0, host: 0, "holy-symbol": 0 },
  wren: { stake: 1, "holy-water": 0, host: 0, "holy-symbol": 0 },
  emeric: { stake: 0, "holy-water": 0, host: 0, "holy-symbol": 0 },
};

export const DEFAULT_SKULL_SUPPLY = 12;
export const LOW_SKULL_SUPPLY = 5;
export const SKULL_DROP_CAP_PER_NIGHT = 2;
export const SKULL_SUPPLY_CONVERT_BELOW = 6;
export const ADVANTAGE_CAP = 2;

export const HUNTER_LOCATIONS = ["sanctuary", "away"] as const;
export const hunterLocationSchema = z.enum(HUNTER_LOCATIONS);
export type HunterLocation = z.infer<typeof hunterLocationSchema>;

/** OQ-2. Locked when the scene starts; at least one hunter is present (PRD-36). */
export const TEST_DEFAULT_PRESENCE: Record<"present" | "absent", readonly HunterId[]> = {
  present: ["wren", "agnes"],
  absent: ["tomas", "emeric"],
};

export const deviceIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{16,128}$/);
export const joinCodeSchema = z.string().regex(/^\d{4,8}$/);

const unique = (values: readonly string[], label: string, ctx: z.RefinementCtx) => {
  if (new Set(values).size !== values.length) {
    ctx.addIssue({ code: "custom", message: `A ${label} is listed twice.` });
  }
};

export const deviceIdListSchema = z
  .array(deviceIdSchema)
  .max(8)
  .superRefine((ids, ctx) => unique(ids, "device", ctx));

export const hunterStateSchema = z.strictObject({
  corruption: corruptionValueSchema,
  holders: deviceIdListSchema,
  /** Null until "Who is at the Sanctuary" sets it. */
  location: hunterLocationSchema.nullable(),
  /** Null until presence is locked at scene start. */
  present: z.boolean().nullable(),
  carriedItems: carriedItemsSchema,
});
export type HunterState = z.infer<typeof hunterStateSchema>;

export const partyHuntersSchema = z.strictObject({
  agnes: hunterStateSchema,
  tomas: hunterStateSchema,
  wren: hunterStateSchema,
  emeric: hunterStateSchema,
});

export const STORY_FLAG_KEY = "dracula.lead.ladys-rooms" as const;

export const LID_CHOICES = ["nailed", "watched"] as const;
export const lidChoiceSchema = z.enum(LID_CHOICES);
export type LidChoice = z.infer<typeof lidChoiceSchema>;

export const FIGHT_RESULTS = ["won", "lost"] as const;
export const fightResultSchema = z.enum(FIGHT_RESULTS);
export type FightResult = z.infer<typeof fightResultSchema>;

export const NIGHTS = [2, 3] as const;
export const nightSchema = z.union([z.literal(2), z.literal(3)]);
export const START_NIGHT = 2;
export const END_NIGHT = 3;

export const ADVANTAGE_TRAITS = ["undead", "wild"] as const;
export const advantageTraitSchema = z.enum(ADVANTAGE_TRAITS);

export const hunterAdvantageSchema = z.strictObject({
  hunter: hunterIdSchema,
  trait: advantageTraitSchema,
  /** After the +2 cap. Null when it has not been worked out. */
  amount: z.number().int().min(0).max(ADVANTAGE_CAP).nullable(),
});

export const FOREWARNED_CHOICES = ["corruption", "sit-out"] as const;
export const forewarnedChoiceSchema = z.enum(FOREWARNED_CHOICES);
export type ForewarnedChoice = z.infer<typeof forewarnedChoiceSchema>;

/** Battle status the Dashboard shows (R3-1). The app does not simulate the fight. */
export const battleStatusSchema = z.strictObject({
  presentHunters: z
    .array(hunterIdSchema)
    .min(1)
    .max(4)
    .superRefine((hunters, ctx) => unique(hunters, "hunter", ctx)),
  foes: z.number().int().min(1),
  advantages: z.array(hunterAdvantageSchema).max(16),
  forewarned: z
    .strictObject({
      hunter: hunterIdSchema,
      /** Card the host typed in. Null until then. */
      card: z.string().min(1).max(120).nullable(),
      sittingOut: z.boolean(),
    })
    .nullable(),
});
export type BattleStatus = z.infer<typeof battleStatusSchema>;

/**
 * Beats in play order. Variants replace a beat. Investigation sits before the lid
 * choice (E17, R3-6). `.09` is the private-thought beat, not its own moment id.
 */
export const SCENE_BEATS = [
  "01",
  "02",
  "03",
  "investigate",
  "investigate.share",
  "lid-choice",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
] as const;

export const INVESTIGATION_ACTIONS = [
  "examine-body",
  "question-mother",
  "anton-coat",
  "pray-over-coffins",
  "follow-the-mourner",
] as const;
export const investigationActionSchema = z.enum(INVESTIGATION_ACTIONS);
export type InvestigationAction = z.infer<typeof investigationActionSchema>;

/** Finding played privately to the hunter who locked that card. */
export const INVESTIGATION_FINDINGS = {
  "examine-body": "two-bites",
  "question-mother": "singing",
  "anton-coat": "holy-water",
  "pray-over-coffins": "consecrated",
  "follow-the-mourner": "the-servant",
} as const satisfies Record<InvestigationAction, string>;

/** The follow-the-mourner card is the risky pick. Its cue is `seal-sequence`. */
export const RISKY_INVESTIGATION_ACTION = "follow-the-mourner" as const;

const MOMENT_SUFFIXES = [
  "01",
  "02",
  "02~no-wren",
  "03",
  "03~no-emeric",
  "investigate",
  "investigate.share",
  "investigate.follow-the-mourner.cue",
  "investigate.examine-body.two-bites.private.agnes",
  "investigate.examine-body.two-bites.private.tomas",
  "investigate.examine-body.two-bites.private.wren",
  "investigate.examine-body.two-bites.private.emeric",
  "investigate.question-mother.singing.private.agnes",
  "investigate.question-mother.singing.private.tomas",
  "investigate.question-mother.singing.private.wren",
  "investigate.question-mother.singing.private.emeric",
  "investigate.anton-coat.holy-water.private.agnes",
  "investigate.anton-coat.holy-water.private.tomas",
  "investigate.anton-coat.holy-water.private.wren",
  "investigate.anton-coat.holy-water.private.emeric",
  "investigate.pray-over-coffins.consecrated.private.agnes",
  "investigate.pray-over-coffins.consecrated.private.tomas",
  "investigate.pray-over-coffins.consecrated.private.wren",
  "investigate.pray-over-coffins.consecrated.private.emeric",
  "investigate.follow-the-mourner.the-servant.private.agnes",
  "investigate.follow-the-mourner.the-servant.private.tomas",
  "investigate.follow-the-mourner.the-servant.private.wren",
  "investigate.follow-the-mourner.the-servant.private.emeric",
  "lid-choice",
  "lid-choice~nailed",
  "lid-choice~nailed~no-wren",
  "lid-choice~watched",
  "lid-choice~watched~no-agnes",
  "04",
  "04~holy-symbol",
  "05",
  "05~no-agnes",
  "06",
  "06~no-tomas",
  "07",
  "07~no-wren",
  "07~fight-lost",
  "07~fight-lost~no-wren",
  "08",
  "08~no-agnes",
  "09.private.agnes",
  "09.private.tomas",
  "09.private.wren",
  "09.private.emeric",
  "10",
  "end.private.agnes",
  "end.private.tomas",
  "end.private.wren",
  "end.private.emeric",
] as const;

export const MOMENT_IDS = MOMENT_SUFFIXES.map((suffix) => `${SCENE_ID}.${suffix}` as const);
export const momentIdSchema = z.enum(MOMENT_IDS);
export type MomentId = z.infer<typeof momentIdSchema>;

export const MOMENT_TARGETS = [
  "dashboard",
  "ipad:agnes",
  "ipad:tomas",
  "ipad:wren",
  "ipad:emeric",
] as const;
export const momentTargetSchema = z.enum(MOMENT_TARGETS);
export type MomentTarget = z.infer<typeof momentTargetSchema>;

const PRIVATE_HUNTER = /\.private\.(agnes|tomas|wren|emeric)$/;

/** The hunter a `.private.<hunter>` moment belongs to, if it is one. */
export const privateHunterOf = (id: string): HunterId | undefined => {
  const found = PRIVATE_HUNTER.exec(id)?.[1];
  const parsed = hunterIdSchema.safeParse(found);
  return parsed.success ? parsed.data : undefined;
};

export const isPrivateMomentId = (id: string): boolean => privateHunterOf(id) !== undefined;

/** Shared moments go to the Dashboard. A private moment goes only to its hunter. */
export const targetForMoment = (id: MomentId): MomentTarget => {
  const hunter = privateHunterOf(id);
  if (!hunter) return "dashboard";
  const target = `ipad:${hunter}`;
  const parsed = momentTargetSchema.safeParse(target);
  if (!parsed.success) throw new Error(`No device target for ${id}.`);
  return parsed.data;
};

export const routedMomentSchema = z
  .strictObject({
    id: momentIdSchema,
    target: momentTargetSchema,
  })
  .superRefine((value, ctx) => {
    const expected = targetForMoment(value.id);
    if (value.target !== expected) {
      ctx.addIssue({
        code: "custom",
        message: `${value.id} targets ${expected}.`,
      });
    }
  });
export type RoutedMoment = z.infer<typeof routedMomentSchema>;

/**
 * Neutral Dashboard copy during `.09` (PRD §4). It is not a moment and it has no private text.
 * §9 shortens the same beat to "Each hunter has a private thought."
 */
export const DASHBOARD_PRIVATE_PLACEHOLDER =
  "Each hunter has a private thought; check your device.";

/** Cue ids the scene fires. Phase 2 maps these same ids to the tower (R4-3). */
export const CUE_IDS = ["dim-all", "heartbeat", "skull-drop", "seal-sequence"] as const;
export const cueIdSchema = z.enum(CUE_IDS);
export type CueId = z.infer<typeof cueIdSchema>;

export const CUE_SCREEN_EFFECTS = [
  "fade-near-black",
  "pulse",
  "seal-flicker",
  "skull-prompt",
] as const;
export const cueScreenEffectSchema = z.enum(CUE_SCREEN_EFFECTS);

export const CUE_STATUSES = ["Verified", "Library", "GAP"] as const;

/** POC playback: screen half and fallback audio, both required (R4-2). No tower command. */
export const cuePlaySchema = z.strictObject({
  cue: cueIdSchema,
  screen: z.strictObject({
    effect: cueScreenEffectSchema,
    /** Null when the cue sheet names no duration. Zero is not used as a stand-in. */
    durationMs: z.number().int().positive().nullable(),
  }),
  fallbackAudio: z.strictObject({
    /** Manifest id. Null when the sheet names no audio asset, which fails readiness (PRD-12). */
    assetId: z.string().min(1).nullable(),
  }),
});
export type CuePlay = z.infer<typeof cuePlaySchema>;

export const AMBIENT_BED_IDS = ["dusk-breathe", "wake-flicker"] as const;
export const ambientBedIdSchema = z.enum(AMBIENT_BED_IDS);
export const ambientAccentIdSchema = z.string().regex(/^[a-z0-9-]{1,64}$/);

export const FORM_FACTORS = ["ipad", "phone"] as const;
export const formFactorSchema = z.enum(FORM_FACTORS);

export const END_REASONS = ["completed", "end-for-now", "concede"] as const;
export const endReasonSchema = z.enum(END_REASONS);

export const HOLDING_ACTIONS = ["take", "release"] as const;
export const HOLDING_ACTORS = ["device", "dashboard"] as const;

export const COST_KINDS = ["corruption", "item", "redirected", "unpayable"] as const;

export const RESOURCE_NAMES = [
  "corruption:agnes",
  "corruption:tomas",
  "corruption:wren",
  "corruption:emeric",
  "stake",
  "holy-water",
  "host",
  "holy-symbol",
  "skull-supply",
  "finale-extra-foes",
] as const;

/** UTC timestamp with a Z suffix. Offsets and missing zones are rejected. */
export const utcTimestampSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/)
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: "Times are UTC." });

const eventIdSchema = z.string().min(1).max(64);
const countOrUnknown = z.number().int().nonnegative().nullable();

const issue = (ctx: z.RefinementCtx, message: string) => {
  ctx.addIssue({ code: "custom", message });
};

export const sessionStartedPayloadSchema = z.strictObject({
  seed: z.string().min(1).max(128),
  packVersion: z.string().min(1).max(64),
  /** Always false in the POC (R4-1). Phase 2 is what connects a tower. */
  towerUsed: z.literal(false),
});

export const sessionEndedPayloadSchema = sessionStartedPayloadSchema.extend({
  endReason: endReasonSchema,
  /** OQ-8: this POC awards no key. */
  keyEligible: z.literal(false),
});

export const devicePresencePayloadSchema = z.strictObject({
  deviceId: deviceIdSchema,
  formFactor: formFactorSchema,
  heldHunters: z
    .array(hunterIdSchema)
    .max(4)
    .superRefine((hunters, ctx) => unique(hunters, "hunter", ctx)),
});

export const holdingChangedPayloadSchema = z.strictObject({
  deviceId: deviceIdSchema,
  hunter: hunterIdSchema,
  action: z.enum(HOLDING_ACTIONS),
  by: z.enum(HOLDING_ACTORS),
  holdersAfter: deviceIdListSchema,
});

export const holdingsSnapshotPayloadSchema = z.strictObject({
  agnes: deviceIdListSchema,
  tomas: deviceIdListSchema,
  wren: deviceIdListSchema,
  emeric: deviceIdListSchema,
});

export const startGateBlockedPayloadSchema = z.strictObject({
  unheld: z.array(hunterIdSchema).min(1).max(4),
});

export const holdPausePayloadSchema = z.strictObject({
  hunter: hunterIdSchema,
  /** Null on pause, before the wait has a length. A number on resume. */
  pausedMs: z.number().int().nonnegative().nullable(),
});

export const presenceLockedPayloadSchema = z
  .strictObject({
    sceneId: z.literal(SCENE_ID),
    present: z.array(hunterIdSchema).max(4),
    absent: z.array(hunterIdSchema).max(4),
    locations: z.strictObject({
      agnes: hunterLocationSchema,
      tomas: hunterLocationSchema,
      wren: hunterLocationSchema,
      emeric: hunterLocationSchema,
    }),
  })
  .superRefine((value, ctx) => {
    unique(value.present, "hunter", ctx);
    unique(value.absent, "hunter", ctx);
    const present = new Set(value.present);
    const absent = new Set(value.absent);
    if (present.size < 1) issue(ctx, "At least one hunter must be present.");
    for (const hunter of HUNTER_IDS) {
      const isPresent = present.has(hunter);
      const isAbsent = absent.has(hunter);
      if (isPresent === isAbsent) {
        issue(ctx, `${hunter} must be present or absent, not both and not neither.`);
      }
      const location = value.locations[hunter];
      if (isPresent && location !== "sanctuary") {
        issue(ctx, `${hunter} is present, so their location is the sanctuary.`);
      }
      if (isAbsent && location !== "away") {
        issue(ctx, `${hunter} is absent, so their location is away.`);
      }
    }
  });

export const momentPlayedPayloadSchema = z.strictObject({
  momentId: momentIdSchema,
  target: momentTargetSchema,
  startedAt: utcTimestampSchema,
  skipped: z.boolean(),
});

export const privateDeliveryPayloadSchema = z
  .strictObject({
    momentId: momentIdSchema,
    hunter: hunterIdSchema,
    deviceId: deviceIdSchema,
  })
  .superRefine((value, ctx) => {
    if (privateHunterOf(value.momentId) !== value.hunter) {
      issue(ctx, "A private delivery names the hunter that moment belongs to.");
    }
  });

export const cueFiredPayloadSchema = z.strictObject({
  cue: cueIdSchema,
  capability: z.string().min(1).max(120),
  status: z.enum(CUE_STATUSES),
  /** POC: nothing is sent to a tower (PRD-24, R4-1). */
  result: z.literal("fallback"),
  reason: z.literal("no_tower"),
});

export const ambientBedPayloadSchema = z.strictObject({
  phase: nightSchema,
  bedId: ambientBedIdSchema,
  startedAt: utcTimestampSchema,
  suppressed: z.boolean(),
  reason: z.string().min(1).max(64).nullable(),
});

export const ambientAccentPayloadSchema = z.strictObject({
  phase: nightSchema,
  accentId: ambientAccentIdSchema,
  seedDraw: z.string().min(1).max(64),
  startedAt: utcTimestampSchema,
  suppressed: z.boolean(),
  reason: z.string().min(1).max(64).nullable(),
});

export const lidChoicePayloadSchema = z
  .strictObject({
    choice: lidChoiceSchema,
    stakeBefore: countOrUnknown,
    stakeAfter: countOrUnknown,
    nailOffered: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.choice === "nailed" && !value.nailOffered) {
      issue(ctx, "Nail is stored only when it was offered.");
    }
    if (value.stakeBefore === null || value.stakeAfter === null) return;
    if (value.choice === "nailed" && value.stakeAfter !== value.stakeBefore - 1) {
      issue(ctx, "Nailing spends one stake.");
    }
    if (value.choice === "watched" && value.stakeAfter !== value.stakeBefore) {
      issue(ctx, "Watching keeps the stake.");
    }
  });

const foeCountSchema = z.number().int().min(1).max(8);

export const fightPayloadSchema = z.strictObject({
  baseFoes: foeCountSchema,
  foes: foeCountSchema,
  hunters: z
    .array(hunterIdSchema)
    .min(1)
    .max(4)
    .superRefine((hunters, ctx) => unique(hunters, "hunter", ctx)),
});

export const fightResolvedPayloadSchema = fightPayloadSchema.extend({
  result: fightResultSchema,
});

export const costAppliedPayloadSchema = z
  .strictObject({
    kind: z.enum(COST_KINDS),
    hunter: hunterIdSchema.nullable(),
    item: storyItemIdSchema.nullable(),
    guardTriggered: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "corruption") {
      if (!value.hunter) issue(ctx, "A corruption cost names a present hunter.");
      if (value.item) issue(ctx, "A corruption cost does not remove an item.");
      return;
    }
    if (value.kind === "item" || value.kind === "redirected") {
      if (!value.hunter) issue(ctx, "An item cost names the hunter who carried it.");
      if (!value.item) issue(ctx, "An item cost names the item.");
      if (value.kind === "redirected" && !value.guardTriggered) {
        issue(ctx, "A redirected cost has already hit the instant-loss guard.");
      }
      return;
    }
    if (value.hunter || value.item) {
      issue(ctx, "An unpayable cost names neither a hunter nor an item.");
    }
  });

export const resourceChangedPayloadSchema = z.strictObject({
  resource: z.enum(RESOURCE_NAMES),
  value: z.number().int().nullable(),
  delta: z.number().int().nullable(),
  causeEventId: eventIdSchema.nullable(),
});

export const skullDropPayloadSchema = z.strictObject({
  night: nightSchema,
  dropsTonight: z.number().int().nonnegative().max(SKULL_DROP_CAP_PER_NIGHT),
  supplyBefore: countOrUnknown,
  /** Null when this row does not touch the night-5 ledger. */
  ledgerDelta: z.number().int().min(0).max(1).nullable(),
});

export const flagSetPayloadSchema = z.strictObject({
  key: z.literal(STORY_FLAG_KEY),
  value: z.literal(true),
});

export const phaseAdvancedPayloadSchema = z.strictObject({
  fromNight: z.literal(START_NIGHT),
  toNight: z.literal(END_NIGHT),
});

export const winlossCheckedPayloadSchema = z.strictObject({
  result: z.literal("none"),
});

export const funRatingPayloadSchema = z.strictObject({
  hunter: hunterIdSchema,
  deviceId: deviceIdSchema,
  rating: z.number().int().min(1).max(5),
  note: z.string().max(500).nullable(),
});

/** R3-8. The log type is the id the ruling names. */
export const FOREWARNED_CHOICE_EVENT = `${SCENE_ID}.forewarned.choice` as const;

export const forewarnedChoicePayloadSchema = z.strictObject({
  hunter: hunterIdSchema,
  choice: forewarnedChoiceSchema,
  forced: z.boolean(),
});

const logged = <const T extends string, P extends z.ZodType>(type: T, payload: P) =>
  z.strictObject({
    id: eventIdSchema,
    at: utcTimestampSchema,
    type: z.literal(type),
    payload,
  });

export const loggedEventSchema = z.discriminatedUnion("type", [
  logged("session_started", sessionStartedPayloadSchema),
  logged("session_ended", sessionEndedPayloadSchema),
  logged("device_joined", devicePresencePayloadSchema),
  logged("device_left", devicePresencePayloadSchema),
  logged("device_rejoined", devicePresencePayloadSchema),
  logged("holding_changed", holdingChangedPayloadSchema),
  logged("holdings_snapshot", holdingsSnapshotPayloadSchema),
  logged("start_gate_blocked", startGateBlockedPayloadSchema),
  logged("paused_unheld", holdPausePayloadSchema),
  logged("resumed_held", holdPausePayloadSchema),
  logged("presence_locked", presenceLockedPayloadSchema),
  logged("moment_played", momentPlayedPayloadSchema),
  logged("private_delivered", privateDeliveryPayloadSchema),
  logged("private_acknowledged", privateDeliveryPayloadSchema),
  logged("private_skipped_absent", privateDeliveryPayloadSchema),
  logged("cue_fired", cueFiredPayloadSchema),
  logged("ambient_bed", ambientBedPayloadSchema),
  logged("ambient_accent", ambientAccentPayloadSchema),
  logged("lid_choice", lidChoicePayloadSchema),
  logged("fight_started", fightPayloadSchema),
  logged("fight_resolved", fightResolvedPayloadSchema),
  logged("cost_applied", costAppliedPayloadSchema),
  logged("resource_changed", resourceChangedPayloadSchema),
  logged("skull_drop_requested", skullDropPayloadSchema),
  logged("skull_drop_confirmed", skullDropPayloadSchema),
  logged("skull_drop_converted", skullDropPayloadSchema),
  logged("skull_drop_capped", skullDropPayloadSchema),
  logged("flag_set", flagSetPayloadSchema),
  logged("phase_advanced", phaseAdvancedPayloadSchema),
  logged("winloss_checked", winlossCheckedPayloadSchema),
  logged("fun_rating", funRatingPayloadSchema),
  logged(FOREWARNED_CHOICE_EVENT, forewarnedChoicePayloadSchema),
]);
export type LoggedEvent = z.infer<typeof loggedEventSchema>;

/**
 * Events whose payload is a hunter's own line, rating or choice.
 * They stay off the Dashboard channel even when the text has no `.private.` marker.
 */
export const PERSONAL_EVENT_TYPES = [
  "private_delivered",
  "private_acknowledged",
  "private_skipped_absent",
  "fun_rating",
  FOREWARNED_CHOICE_EVENT,
] as const;

export const EVENT_TYPES = loggedEventSchema.options.map((option) => option.shape.type.value);

/** True when a JSON value carries a private moment id. */
export const containsPrivateMoment = (value: unknown): boolean => {
  if (typeof value === "string") return isPrivateMomentId(value) || value.includes(".private.");
  if (Array.isArray(value)) return value.some(containsPrivateMoment);
  if (typeof value === "object" && value !== null) {
    return Object.values(value).some(containsPrivateMoment);
  }
  return false;
};

export const isPersonalEventType = (type: string): boolean =>
  (PERSONAL_EVENT_TYPES as readonly string[]).includes(type);

/** A value the Dashboard channel may carry: no private moment id and no personal event. */
export const isDashboardSafe = (value: unknown): boolean => {
  if (!value || typeof value !== "object") return !containsPrivateMoment(value);
  if ("type" in value && typeof value.type === "string" && isPersonalEventType(value.type)) {
    return false;
  }
  return !containsPrivateMoment(value);
};
