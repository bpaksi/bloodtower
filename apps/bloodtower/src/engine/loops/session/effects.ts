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
  towerCommandEffectV1,
  checkpointWriteEffectV1,
  pressErrorEffectV1,
]);

export type ShellEffect = z.infer<typeof shellEffectSchema>;
