import { z } from "zod";
import {
  deviceIdSchema,
  heroIdSchema,
  levelSchema,
  lineIdSchema,
  message,
  offeredActionSchema,
  publicHeroSchema,
  viewScreenSchema,
} from "./common.ts";
import { refuseBoardContent } from "./refuse.ts";

const issue = (ctx: z.RefinementCtx, messageText: string) => {
  ctx.addIssue({ code: "custom", message: messageText });
};

const narrationSchema = z.strictObject({
  lineId: lineIdSchema,
  text: z.string().min(1).max(2000),
});

const placeStillSchema = z.strictObject({
  building: z.enum(["village", "bazaar", "citadel", "sanctuary"]),
  stillId: z.string().min(1).max(80),
  caption: z.string().min(1).max(500),
});

const tableGroupSchema = z.strictObject({
  heroId: heroIdSchema,
  heroName: z.string().min(1).max(80),
  kingdom: z.enum(["N", "E", "S", "W"]),
  kingdomLabel: z.string().min(1).max(40),
  spaceId: z.string().min(1).max(80),
  spaceName: z.string().min(1).max(80),
  building: z.string().min(1).max(40).nullable(),
  inside: z.boolean(),
  alone: z.boolean(),
});

const tableBandSchema = z.strictObject({
  chapter: z.string().min(1).max(120),
  day: z.number().int().min(0).max(99),
  health: z.literal("unavailable"),
  purse: z.literal("unavailable"),
  actingGroup: z.string().min(1).max(80).nullable(),
  actingHeroId: heroIdSchema.nullable(),
  movesLeft: z.number().int().min(0).max(12).nullable(),
  moveRoll: z.number().int().min(0).max(12).nullable(),
  modifier: z.literal("none"),
  waitingFor: z.string().min(1).max(120).nullable(),
  groups: z.array(tableGroupSchema).max(8),
});

const uniqueIds = (ids: string[], ctx: z.RefinementCtx, label: string) => {
  if (new Set(ids).size !== ids.length) issue(ctx, `A ${label} is listed twice.`);
};

/** Gear panels the iPad can open. The Story board only displays them. */
export const GEAR_PANELS = [
  "current-party",
  "game-board-setup",
  "volume",
  "look-up",
  "change-who-holds-whom",
  "join-another-ipad",
] as const;
export const gearPanelSchema = z.enum(GEAR_PANELS);
export type GearPanelId = z.infer<typeof gearPanelSchema>;

const gearPartyHeroSchema = z.strictObject({
  id: heroIdSchema,
  name: z.string().min(1).max(80),
  hp: z.string().min(1).max(40),
  gold: z.string().min(1).max(40),
  items: z.string().min(1).max(200),
  corruptions: z.string().min(1).max(200),
  holder: z.string().min(1).max(80).nullable(),
});

const gearCardSchema = z.strictObject({
  id: z.string().min(1).max(40),
  title: z.string().min(1).max(80),
});

/**
 * Shared gear snapshot. Absent on views built before this field.
 * `paused` is true while a panel is open. Closing the Menu is not in here.
 */
export const gearViewSchema = z.strictObject({
  paused: z.boolean(),
  panel: gearPanelSchema.nullable(),
  owner: z.string().min(1).max(64).nullable(),
  picked: z.string().min(1).max(80).nullable(),
  volume: z.number().int().min(0).max(2),
  pieceChecks: z.number().int().min(0).max(9999),
  opens: z.number().int().min(0).max(9999),
  card: z.string().min(1).max(80).nullable(),
  inGame: z.boolean(),
  towerConnected: z.boolean(),
  sessionScreen: z.boolean(),
  beforeBegin: z.boolean(),
  partySplit: z.boolean(),
  party: z.array(gearPartyHeroSchema).max(16),
  cards: z.array(gearCardSchema).max(8),
  joinUrl: z.string().min(1).max(500).nullable(),
  setupSteps: z.array(z.string().min(1).max(200)).max(12),
  helpScreen: z.string().min(1).max(40),
  firstHero: z.string().min(1).max(80).nullable(),
});
export type GearView = z.infer<typeof gearViewSchema>;

/**
 * Public view for the story board. Loop levels and the text each one shows,
 * which heroes are held, the public narration line, and the actions on offer.
 * No private line and no `ipad:` channel.
 */
export const boardViewPayloadSchema = z
  .strictObject({
    screen: viewScreenSchema,
    levels: z.array(levelSchema).min(1).max(8),
    heroes: z.array(publicHeroSchema).max(16),
    narration: narrationSchema.nullable(),
    actions: z.array(offeredActionSchema).max(32),
    /** Status band for the move. Absent on setup screens. */
    table: tableBandSchema.nullable().optional(),
    /** Place still and caption. Story board only, and only while a group is inside. */
    place: placeStillSchema.nullable().optional(),
    /** Gear panel the Story board displays. Omitted when the host has no gear snapshot. */
    gear: gearViewSchema.optional(),
  })
  .superRefine((value, ctx) => {
    refuseBoardContent(value, ctx);
    uniqueIds(
      value.levels.map((level) => level.id),
      ctx,
      "level",
    );
    uniqueIds(
      value.heroes.map((hero) => hero.id),
      ctx,
      "hero",
    );
  });
export type BoardView = z.infer<typeof boardViewPayloadSchema>;

const privateLineSchema = z.strictObject({
  id: lineIdSchema,
  text: z.string().min(1).max(2000),
});

const deviceDoorSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(120),
  focus: z.boolean(),
});

const deviceHeroSchema = z
  .strictObject({
    id: heroIdSchema,
    name: z.string().min(1).max(80),
    lines: z.array(privateLineSchema).max(8),
    /** Claim-heroes only. `taken` is greyed for this iPad (DEC-098). */
    claim: z.enum(["open", "yours", "taken"]).optional(),
  })
  .superRefine((value, ctx) => {
    for (const line of value.lines) {
      if (!line.id.endsWith(`.private.${value.id}`)) {
        issue(ctx, "A private line id ends with .private.<hero id>.");
      }
    }
  });

/**
 * One iPad. Heroes are only the ones this device holds, each with its own private lines.
 * `shows` is the public line the board is showing. Actions are the ones offered to this device.
 */
export const deviceViewPayloadSchema = z
  .strictObject({
    deviceId: deviceIdSchema,
    screen: viewScreenSchema,
    shows: z.string().min(1).max(500),
    heroes: z.array(deviceHeroSchema).max(16),
    actions: z.array(offeredActionSchema).max(32),
    /** Same status band as the board. No place still and no caption. */
    table: tableBandSchema.nullable().optional(),
    /**
     * Pick Story doors, in catalog order. Present only while the board is listing doors.
     * Previous and Next send `focus-story`; the iPad does not draw the carousel.
     */
    doors: z.array(deviceDoorSchema).max(8).optional(),
    /** Game settings only. Existing `set-setting` act; not a new message type. */
    settings: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(64),
          label: z.string().min(1).max(80),
          optionId: z.string().min(1).max(64),
          options: z
            .array(
              z.strictObject({
                id: z.string().min(1).max(64),
                label: z.string().min(1).max(80),
              }),
            )
            .min(1)
            .max(16),
        }),
      )
      .max(8)
      .optional(),
    /** Same gear snapshot as the board, so this iPad can press the panel's buttons. */
    gear: gearViewSchema.optional(),
  })
  .superRefine((value, ctx) => {
    uniqueIds(
      value.heroes.map((hero) => hero.id),
      ctx,
      "hero",
    );
    if (value.doors) {
      uniqueIds(
        value.doors.map((door) => door.id),
        ctx,
        "door",
      );
    }
    const lineIds = value.heroes.flatMap((hero) => hero.lines.map((line) => line.id));
    uniqueIds(lineIds, ctx, "line");
  });
export type DeviceView = z.infer<typeof deviceViewPayloadSchema>;

export const boardViewMessageSchema = message("boardView", boardViewPayloadSchema);
export const deviceViewMessageSchema = message("deviceView", deviceViewPayloadSchema);
