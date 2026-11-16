import { z } from "zod";
import { assetIdSchema } from "../pack-v2/ids.ts";
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

/**
 * A packed line the Story board plays from the Mac (A1-8b-2, D49). Ids and text only: the board
 * fetches each file from the host by asset id (`/packs/<packId>/by-id/<id>`), so no message
 * carries file bytes. `audio`, `painting` and `glow` are null when that file is not packed, and
 * the caption still shows. `play` goes up by one on each explicit play; a board plays only when
 * it sees `play` change, never on the first view after it loads (a reload does not replay).
 */
export const packedLineSchema = z.strictObject({
  packId: z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/),
  lineId: assetIdSchema,
  caption: z.string().min(1).max(500),
  audio: assetIdSchema.nullable(),
  painting: assetIdSchema.nullable(),
  glow: assetIdSchema.nullable(),
  play: z.number().int().min(1).max(1_000_000),
});
export type PackedLine = z.infer<typeof packedLineSchema>;

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

/** One group's move roll: the raw 2d3 and each modifier, so the board can show the sum (UI-021). */
const dayRollSchema = z.strictObject({
  groupId: z.string().min(1).max(80),
  name: z.string().min(1).max(80),
  /** Named `rolled`: the board refuses any key called `raw`. */
  rolled: z.number().int().min(0).max(99),
  virtue: z.number().int().min(-99).max(99),
  terrain: z.number().int().min(-99).max(99),
  corruption: z.number().int().min(-99).max(99),
  /** The per-split-group shift while the party is split (PT-06). Absent on older views: 0. */
  split: z.number().int().min(-99).max(99).optional(),
  total: z.number().int().min(0).max(99),
});

/**
 * How long a no-button day card stays on the board before it leaves by itself, in ms (Q4.4).
 * One constant: the groups card reads it now, and the day loop's 4 s timer (C3-11 Ruling 1)
 * must read it too when that step is built. It is not a tuning key.
 */
export const AUTO_ADVANCE_MS = 4000;

/**
 * The groups card (PT-18, Q4.1): only on a day whose start applied a queued Split or Rejoin.
 * One row per group in turn order, each with its heroes. No button; it leaves by itself.
 */
const groupsCardSchema = z.strictObject({
  day: z.number().int().min(1).max(99),
  holdMs: z.number().int().min(1).max(60_000),
  groups: z
    .array(
      z.strictObject({
        groupId: z.string().min(1).max(80),
        heroNames: z.array(z.string().min(1).max(80)).min(1).max(8),
      }),
    )
    .min(1)
    .max(8),
});

/**
 * A first-time hint (CU/09, DEC-571): one sentence on the Story board, no button, over the loop's
 * first view. Under art (`caption`) it is a line under the picture, not a Scroll. It ends by itself
 * after `holdMs` (the engine's `AUTO_ADVANCE_MS`). `voiceId` names the narrator clip to play.
 */
export const hintViewSchema = z.strictObject({
  id: z.string().regex(/^hint\.[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/),
  text: z.string().min(1).max(120),
  caption: z.boolean(),
  holdMs: z.number().int().min(1).max(60_000),
  voiceId: z.string().min(1).max(80).nullable(),
});
export type HintView = z.infer<typeof hintViewSchema>;

const skullBuildingSchema = z.strictObject({
  spaceId: z.string().min(1).max(80),
  name: z.string().min(1).max(80),
  skulls: z.number().int().min(0).max(99),
  fallen: z.boolean(),
});

/** Skull placement (DEC-092) and the simulated drop (DEC-305): the kingdom and its buildings. */
const daySkullSchema = z.strictObject({
  kingdomLabel: z.string().min(1).max(40).nullable(),
  buildings: z.array(skullBuildingSchema).max(64),
  /** Buildings that fell tonight, named for the board (DEC-093). */
  fell: z.array(z.string().min(1).max(80)).max(16),
  /** The simulated drop, one line per skull in drop order, never cut or merged (PT-07). */
  lines: z.array(z.string().min(1).max(120)).max(16).optional(),
});

const heroCorruptionSchema = z.strictObject({
  heroId: heroIdSchema,
  heroName: z.string().min(1).max(80),
  /** The hero whose panel (its group's lead, `groups[].heroId`) shows this row (UI-030). */
  panelHeroId: heroIdSchema,
  count: z.number().int().min(0).max(99),
});

/**
 * The day on the board (C3 feature 11). Every field is optional so older views stay valid.
 * `phase` says which panel the board paints; unknown numbers are null, never zero.
 */
export const DAY_PHASES = ["regroup", "roll", "turn", "skull", "skull-sim", "effects"] as const;

const tableBandSchema = z.strictObject({
  chapter: z.string().min(1).max(120),
  day: z.number().int().min(0).max(99),
  daysLeft: z.number().int().min(0).max(99).nullable().optional(),
  /** The coming night's drop only (Q-C3-19). */
  threat: z.number().int().min(0).max(9).nullable().optional(),
  phase: z.enum(DAY_PHASES).nullable().optional(),
  rolls: z.array(dayRollSchema).max(8).optional(),
  effects: z.array(z.string().min(1).max(120)).max(16).optional(),
  skull: daySkullSchema.nullable().optional(),
  corruptions: z.array(heroCorruptionSchema).max(16).optional(),
  groupsCard: groupsCardSchema.nullable().optional(),
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
  "tower",
  "split",
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

/** One Split party pick or queued action, by hero (PT-18, Q4.2). */
const regroupRowSchema = z.strictObject({
  kind: z.enum(["split", "join"]),
  heroId: heroIdSchema,
  name: z.string().min(1).max(80),
});

/**
 * The Split party panel: the picks on offer (read against the groups after the queue) and the
 * queue in pick order. `open` is false when there is nothing to pick or cancel.
 */
const gearRegroupSchema = z.strictObject({
  open: z.boolean(),
  picks: z.array(regroupRowSchema).max(32),
  queue: z.array(regroupRowSchema).max(32),
});

const gearCardSchema = z.strictObject({
  id: z.string().min(1).max(40),
  title: z.string().min(1).max(80),
  /** A heading the iPad lists the card under (Look up, Rules). Absent on an ungrouped card. */
  group: z.string().min(1).max(40).optional(),
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
  /** The open Look up card's title and page (display only on the board). Absent when none is open. */
  cardTitle: z.string().min(1).max(80).nullable().optional(),
  cardPage: z.string().min(1).max(600).nullable().optional(),
  inGame: z.boolean(),
  towerConnected: z.boolean(),
  sessionScreen: z.boolean(),
  /** Done for tonight was confirmed: every gear item is disabled (DEC-713). */
  sessionOver: z.boolean(),
  beforeBegin: z.boolean(),
  partySplit: z.boolean(),
  /** Absent on views built before CU/04. */
  regroup: gearRegroupSchema.optional(),
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
    /** The first-time hint on now (CU/09). Story board only; the iPads show nothing new. */
    hint: hintViewSchema.nullable().optional(),
    /** Gear panel the Story board displays. Omitted when the host has no gear snapshot. */
    gear: gearViewSchema.optional(),
    /** The demo's packed line (A1-8b-2, D49). Omitted until the demo entry plays one. */
    packedLine: packedLineSchema.nullable().optional(),
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
     * True while a first-time hint is on the Story board (CU/09): this is the screen from before
     * the hint, kept as it was, and every control on it is greyed until the hint ends.
     */
    held: z.literal(true).optional(),
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
