import { z } from "zod";
import { HINT_TEXT_MISSING, HINTS_AFTER_SETUP, RULES_PAGE_MISSING } from "../../hints/registry.ts";

/** Error code logged when a no-tower skull has nowhere to land (Q3.1). */
export const SKULL_NO_BUILDING = "skull-no-building" as const;

/** Error code logged when a queued Split or Rejoin cannot apply at the day start (CU/04, Q4.2). */
export const REGROUP_DROPPED = "regroup-dropped" as const;

/** Error codes for Fix my position (CU/05, Q5.3): a press in a battle, scene or building menu; a space or group that does not exist. */
export const FIX_POSITION_NOT_NOW = "fix-position-not-now" as const;
export const FIX_POSITION_BAD_TARGET = "fix-position-bad-target" as const;

/** Error code logged and toasted when a use-item act is refused (CU/13, EV-20). */
export const USE_ITEM_REFUSED = "use-item-refused" as const;

export const viewRefreshEffectV1 = z.object({
  kind: z.literal("view-refresh"),
  v: z.literal(1),
});

export const autosaveWriteEffectV1 = z.object({
  kind: z.literal("autosave-write"),
  v: z.literal(1),
  gameId: z.string(),
});

export const gameRecordEffectV1 = z.object({
  kind: z.literal("game-record"),
  v: z.literal(1),
  gameId: z.string(),
  outcome: z.enum(["quit", "won", "lost"]),
  /**
   * What the record holds beyond the outcome (DEC-116, PT-04). Optional so a quit before the game
   * began, and an older log, still parse. Unknown is null, never zero.
   */
  storyId: z.string().nullable().optional(),
  length: z.string().nullable().optional(),
  difficulty: z.string().nullable().optional(),
  /** Seated heroes at the start, and who they were. */
  partySize: z.number().int().min(0).nullable().optional(),
  heroIds: z.array(z.string()).optional(),
  /** How it ended: quit, won, or the way it was lost (DEC-043). */
  how: z.enum(["quit", "won", "corruption", "skulls", "buildings"]).optional(),
  /** The scene the end plays (DEC-144); absent on a quit. */
  sceneId: z.string().nullable().optional(),
  /** The day the game ended on, null before the first day. */
  endDay: z.number().int().nullable().optional(),
  /**
   * The game's stats as they stood at the end (DEC-627, SCR-019). The stats screen reads these,
   * never the live state. Absent on a quit before play and on an older log row. Key moments are
   * not here: each is its own `key-moment` row (Gamewright 2026-11-23).
   */
  stats: z
    .object({
      questsDone: z.number().int().min(0).nullable(),
      corruptionsTaken: z.number().int().min(0).nullable(),
      goldLeft: z.number().int().nullable(),
    })
    .optional(),
});

/** The five Q-C3-18 kinds of key moment. */
export const KEY_MOMENT_KINDS = [
  "quest-done",
  "item-gained",
  "building-fallen",
  "corruption-taken",
  "chapter-won",
] as const;

/**
 * One key moment, as it happened (Q-C3-18, Gamewright 2026-11-23): its day and the names the
 * C3/17 line fills in. The host writes it as a `key-moment` log row; a replay writes nothing.
 */
export const keyMomentEffectV1 = z.object({
  kind: z.literal("key-moment"),
  v: z.literal(1),
  gameId: z.string(),
  moment: z.enum(KEY_MOMENT_KINDS),
  /** The game day it happened on; null before day 1. */
  day: z.number().int().min(1).nullable(),
  questId: z.string().optional(),
  /** {quest}: the quest's place name, else its id (a quest has no name in the pack). */
  quest: z.string().optional(),
  heroId: z.string().optional(),
  /** {hero}: the hero's name. */
  hero: z.string().optional(),
  itemId: z.string().optional(),
  /** {item}: the item's name, else its id. */
  item: z.string().optional(),
  spaceId: z.string().optional(),
  /** {building}: the space's name. */
  building: z.string().optional(),
  corruptionId: z.string().optional(),
  chapter: z.number().int().min(1).optional(),
});

export const towerCommandEffectV1 = z.object({
  kind: z.literal("tower-command"),
  v: z.literal(1),
  capabilityId: z.string(),
  params: z.record(z.string(), z.unknown()),
});

export const checkpointWriteEffectV1 = z.object({
  kind: z.literal("checkpoint-write"),
  v: z.literal(1),
  gameId: z.string(),
  day: z.number().int().min(1),
});

/** A press the engine could not honour. The host logs it, toasts the board and tells the pressing iPad. */
export const pressErrorEffectV1 = z.object({
  kind: z.literal("press-error"),
  v: z.literal(1),
  code: z.enum([
    "invalid-state",
    SKULL_NO_BUILDING,
    REGROUP_DROPPED,
    HINT_TEXT_MISSING,
    HINTS_AFTER_SETUP,
    RULES_PAGE_MISSING,
    FIX_POSITION_NOT_NOW,
    FIX_POSITION_BAD_TARGET,

    USE_ITEM_REFUSED,
  ]),
  message: z.string().min(1).max(300),
  /**
   * The iPad to tell when it is not the one whose press stepped the engine: a queued Split or
   * Rejoin is reported to the iPad that queued it (CU/04 EV-24). Omitted: the pressing iPad.
   */
  deviceId: z.string().min(1).optional(),
});

/**
 * A no-tower skull that found no standing building in two kingdoms (PT-07, Q3.1). It is the
 * night's own happening, not a bad press, so it has its own code. A loop pushes it through
 * `ctx.effects`; the shell step treats it as the press-error row the host already logs.
 */
export const skullNoBuildingEffect = (night: number) => ({
  kind: "press-error" as const,
  v: 1 as const,
  code: SKULL_NO_BUILDING,
  message: `Night ${night}: a skull found no standing building in two kingdoms, so none fell.`,
});

export const shellEffectSchema = z.discriminatedUnion("kind", [
  viewRefreshEffectV1,
  autosaveWriteEffectV1,
  gameRecordEffectV1,
  keyMomentEffectV1,
  towerCommandEffectV1,
  checkpointWriteEffectV1,
  pressErrorEffectV1,
]);

export type ShellEffect = z.infer<typeof shellEffectSchema>;
