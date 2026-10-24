import { z } from "zod";

/** v2 envelope version. v1 stays at 1 until the host switch-over. */
export const PROTOCOL_VERSION = 2 as const;

/**
 * Game-setup screens the projection covers (D33, C1 step 6).
 * `claim-heroes` is the v2 id for the R1 `party-join` screen.
 * `tower-connect` is connect and calibrate on one screen (SCR-005).
 * `setup` is one pack step at a time, including seals and skulls.
 * `begin` is the last screen before play (SCR-012).
 */
export const SETUP_SCREENS = [
  "pick-story",
  "game-settings",
  "tower-connect",
  "claim-heroes",
  "setup",
  "begin",
] as const;
export const setupScreenSchema = z.enum(SETUP_SCREENS);
export type SetupScreen = z.infer<typeof setupScreenSchema>;

/** Runtime screens the host projects during play and between games (C1 step 9). */
export const RUNTIME_SCREENS = ["pick-game", "play", "pause", "session", "goodbye"] as const;
export const viewScreenSchema = z.enum([...SETUP_SCREENS, ...RUNTIME_SCREENS]);
export type ViewScreen = z.infer<typeof viewScreenSchema>;

export const heroIdSchema = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
export const deviceIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
export const promptIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
export const actionIdSchema = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{16,128}$/);
export const joinCodeSchema = z.string().regex(/^\d{6}$/);

/** A line id. A private line ends with `.private.<hero id>`. */
export const lineIdSchema = z.string().regex(/^[a-z0-9][a-z0-9.-]{0,79}$/);

export const FORM_FACTORS = ["mac", "ipad", "phone"] as const;
export const formFactorSchema = z.enum(FORM_FACTORS);
export const ROLES = ["storyboard", "device"] as const;
export const roleSchema = z.enum(ROLES);

export const message = <const T extends string, P extends z.ZodType>(type: T, payload: P) =>
  z.strictObject({
    v: z.literal(PROTOCOL_VERSION),
    type: z.literal(type),
    id: z.string().min(1).max(64).optional(),
    correlationId: z.string().min(1).max(64).optional(),
    payload,
  });

const closedActionSchema = z.strictObject({
  promptId: promptIdSchema,
  actionId: actionIdSchema,
  label: z.string().min(1).max(200),
  open: z.literal(false),
  reason: z.string().min(1).max(200),
});

const openActionSchema = z.strictObject({
  promptId: promptIdSchema,
  actionId: actionIdSchema,
  label: z.string().min(1).max(200),
  open: z.literal(true),
});

/**
 * An action the view offers. Open actions have no reason.
 * A closed action says why, so the client does not decide legality.
 */
export const offeredActionSchema = z.discriminatedUnion("open", [
  openActionSchema,
  closedActionSchema,
]);
export type OfferedAction = z.infer<typeof offeredActionSchema>;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string().max(500),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema).max(32),
    z.record(z.string().min(1).max(64), jsonValueSchema),
  ]),
);

export const levelSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/),
  label: z.string().min(1).max(80),
  shows: z.string().min(1).max(500),
});

export const publicHeroSchema = z.strictObject({
  id: heroIdSchema,
  name: z.string().min(1).max(80),
  held: z.boolean(),
});

export const envelopeSchema = z.strictObject({
  v: z.literal(PROTOCOL_VERSION),
  type: z.string().min(1).max(80),
  id: z.string().min(1).max(64).optional(),
  correlationId: z.string().min(1).max(64).optional(),
  payload: z.unknown(),
});

const FORBIDDEN_STORYBOARD_KEYS = new Set([
  "privateMoment",
  "bytes",
  "raw",
  "packet",
  "capabilityId",
  "params",
]);

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
