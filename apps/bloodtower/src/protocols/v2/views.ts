import { z } from "zod";
import { issue, messageV2 } from "./envelope.ts";
import { actionIdSchema, deviceIdSchema, heroIdSchema, promptIdSchema } from "./ids.ts";
import { boardCarriesForbidden, carriesForbiddenKey } from "./refuse.ts";

/**
 * Setup screens the core projects before play (spec §3.1).
 * Session, Goodbye and the day slice are later steps; this list is the setup set.
 */
export const SETUP_SCREENS = [
  "splash",
  "landing",
  "sound",
  "tower-connect",
  "volume-test",
  "pick-game",
  "pick-story",
  "game-settings",
  "claim-heroes",
  "seals-and-skulls",
] as const;
export const setupScreenSchema = z.enum(SETUP_SCREENS);
export type SetupScreen = z.infer<typeof setupScreenSchema>;

const LOOP_PHASES = ["enter", "start", "body", "exit", "close", "result", "end", "done"] as const;

const levelSchema = z.strictObject({
  loopId: z.string().min(1).max(80),
  phase: z.enum(LOOP_PHASES),
  shows: z.string().min(1).max(200),
});

const publicHeroSchema = z.strictObject({
  id: heroIdSchema,
  name: z.string().min(1).max(80),
  held: z.boolean(),
});

const narrationSchema = z
  .strictObject({
    id: z.string().min(1).max(120),
    text: z.string().min(1).max(2000),
  })
  .nullable();

/**
 * Open, or closed with a reason. The web renders this and does not decide legality.
 */
export const offeredActionSchema = z.discriminatedUnion("open", [
  z.strictObject({
    promptId: promptIdSchema,
    actionId: actionIdSchema,
    label: z.string().min(1).max(200),
    open: z.literal(true),
  }),
  z.strictObject({
    promptId: promptIdSchema,
    actionId: actionIdSchema,
    label: z.string().min(1).max(200),
    open: z.literal(false),
    reason: z.string().min(1).max(300),
  }),
]);
export type OfferedAction = z.infer<typeof offeredActionSchema>;

const uniqueIds = (ids: string[], ctx: z.RefinementCtx, message: string) => {
  if (new Set(ids).size !== ids.length) issue(ctx, message);
};

/**
 * Public view for the story board. No offered actions: the board stays display only.
 * The refine is what refuses a private id and an `ipad:` string inside an otherwise valid field.
 */
export const boardViewSchema = z
  .strictObject({
    screen: setupScreenSchema,
    levels: z.array(levelSchema).max(16),
    heroes: z.array(publicHeroSchema).max(16),
    narration: narrationSchema,
  })
  .superRefine((value, ctx) => {
    if (boardCarriesForbidden(value)) {
      issue(ctx, "The board view cannot carry a private line, an ipad target, or a tower command.");
    }
    uniqueIds(
      value.heroes.map((hero) => hero.id),
      ctx,
      "A hero is listed twice.",
    );
  });
export type BoardView = z.infer<typeof boardViewSchema>;

const privateLineSchema = z.strictObject({
  id: z.string().min(1).max(120),
  text: z.string().min(1).max(2000),
});

const deviceHeroSchema = z.strictObject({
  id: heroIdSchema,
  name: z.string().min(1).max(80),
  privateLines: z.array(privateLineSchema).max(32),
});

/** One iPad: its own heroes' private lines, and the actions offered to it. */
export const deviceViewSchema = z
  .strictObject({
    screen: setupScreenSchema,
    deviceId: deviceIdSchema,
    levels: z.array(levelSchema).max(16),
    roster: z.array(publicHeroSchema).max(16),
    heroes: z.array(deviceHeroSchema).max(16),
    narration: narrationSchema,
    actions: z.array(offeredActionSchema).max(32),
  })
  .superRefine((value, ctx) => {
    if (carriesForbiddenKey(value)) {
      issue(ctx, "A device view cannot carry raw bytes or a tower command.");
    }
    uniqueIds(
      value.roster.map((hero) => hero.id),
      ctx,
      "A hero is listed twice.",
    );
    uniqueIds(
      value.heroes.map((hero) => hero.id),
      ctx,
      "A held hero is listed twice.",
    );
    const prompts = value.actions.map((action) => action.promptId);
    uniqueIds(prompts, ctx, "A prompt is offered twice.");
  });
export type DeviceView = z.infer<typeof deviceViewSchema>;

export const boardViewMessageSchema = messageV2("boardView", boardViewSchema);
export const deviceViewMessageSchema = messageV2("deviceView", deviceViewSchema);
