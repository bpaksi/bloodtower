import { z } from "zod";
import { optionIdSchema } from "./control.ts";
import { hunterIdSchema } from "./devices.ts";

/**
 * Story-pack schema for the sections R1 interprets
 * (metadata, hunters, nights, set pieces, moments, cues, assets, stats).
 * Sections the engine does not run yet are kept as opaque data.
 * Structural rules V-1, V-2, V-3, V-4, V-5, V-8 and V-20 live here so the
 * contract is frozen. The loader (step 3) attaches the file name and the path.
 */

const issue = (ctx: z.RefinementCtx, message: string) => {
  ctx.addIssue({ code: "custom", message });
};

const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
/** `01`–`99`, or a kebab name with further name or number segments (`lit.01`). */
const MOMENT_NUMBER = "0[1-9]|[1-9]\\d";
const MOMENT_NAME = "[a-z][a-z0-9]*(?:-[a-z0-9]+)*";
const MOMENT_PART = new RegExp(
  `^(?:${MOMENT_NUMBER}|(?:${MOMENT_NAME})(?:\\.(?:${MOMENT_NAME}|${MOMENT_NUMBER}))*)$`,
);
const VARIANT = /^(?:no-[a-z][a-z0-9]*(?:-[a-z0-9]+)*|[a-z][a-z0-9]*(?:-[a-z0-9]+)*)$/;
/** Dungeon-room and ending moments have no set piece. No set piece uses these ids. */
const RESERVED_SCENES = new Set(["crypt", "end"]);

export const idSchema = z.string().regex(KEBAB);

export const semverSchema = z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);

export const assetIdSchema = z
  .string()
  .refine(
    (value) =>
      /^[a-z0-9][a-z0-9._@-]*$/.test(value) &&
      !value.includes("..") &&
      !value.includes("/") &&
      !value.includes("\\"),
    { message: "V-2: an asset id is a manifest id, not a path." },
  );

export interface ParsedMomentId {
  scene: string;
  moment: string;
  hunter?: string;
  variants: string[];
}

/** Moment id grammar (story-pack format §4.1). Undefined when the id is not that grammar. */
export const parseMomentId = (value: string): ParsedMomentId | undefined => {
  const pieces = value.split("~");
  const base = pieces[0];
  const variants = pieces.slice(1);
  if (!base || variants.some((variant) => !VARIANT.test(variant))) return undefined;
  const marker = ".private.";
  const privateAt = base.indexOf(marker);
  if (privateAt !== -1 && privateAt !== base.lastIndexOf(marker)) return undefined;
  let head = base;
  let hunter: string | undefined;
  if (privateAt !== -1) {
    head = base.slice(0, privateAt);
    const name = base.slice(privateAt + marker.length);
    if (!KEBAB.test(name)) return undefined;
    hunter = name;
  }
  const dot = head.indexOf(".");
  if (dot <= 0) return undefined;
  const scene = head.slice(0, dot);
  const moment = head.slice(dot + 1);
  if (!KEBAB.test(scene) || !MOMENT_PART.test(moment)) return undefined;
  return hunter ? { scene, moment, hunter, variants } : { scene, moment, variants };
};

export const momentIdSchema = z.string().refine((value) => parseMomentId(value) !== undefined, {
  message: "V-3: moment id does not match the grammar.",
});

export const privateHunterOf = (momentId: string): string | undefined =>
  parseMomentId(momentId)?.hunter;

export const sceneOf = (momentId: string): string | undefined => parseMomentId(momentId)?.scene;

export const absentHuntersOf = (momentId: string): string[] =>
  (parseMomentId(momentId)?.variants ?? [])
    .filter((variant) => variant.startsWith("no-"))
    .map((variant) => variant.slice(3));

export const momentTargetSchema = z
  .string()
  .refine(
    (value) =>
      value === "storyboard" ||
      value === "ipad:all" ||
      value === "phone" ||
      /^ipad:[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value),
    { message: "V-4: target is storyboard, ipad:all, ipad:<hunter>, or phone." },
  );

const textSchema = z.string().min(1).max(2000);

export const momentSchema = z
  .strictObject({
    id: momentIdSchema,
    kind: z.enum(["still", "clip", "text-card", "pick-card"]),
    target: momentTargetSchema.default("storyboard"),
    cond: z.string().min(1).max(300).optional(),
    lines: z
      .array(
        z.strictObject({
          speaker: idSchema,
          text: textSchema,
          voice: assetIdSchema,
        }),
      )
      .max(2)
      .optional(),
    cues: z
      .array(
        z.strictObject({
          cue: idSchema,
          at: z.union([
            z.literal("start"),
            z.literal("end"),
            z.string().regex(/^after-line [1-9]\d*$/),
          ]),
        }),
      )
      .optional(),
    music: z.array(assetIdSchema).optional(),
    sfx: z.array(assetIdSchema).optional(),
    props: z.array(idSchema).optional(),
    advance: z
      .union([z.enum(["next", "clip-end", "step"]), z.string().regex(/^auto:\d+(?:\.\d+)?$/)])
      .optional(),
    asset: assetIdSchema.optional(),
    placeholder: z.string().min(1).max(300).optional(),
    scope: z.enum(["scene", "global"]).optional(),
  })
  .superRefine((moment, ctx) => {
    if ((moment.kind === "still" || moment.kind === "clip") && !moment.asset) {
      issue(ctx, "V-1: a still or a clip names an asset.");
    }
    const parsed = parseMomentId(moment.id);
    if (!parsed) return;
    if (parsed.hunter) {
      if (moment.target !== `ipad:${parsed.hunter}`) {
        issue(ctx, `V-4: .private.${parsed.hunter} targets ipad:${parsed.hunter}.`);
      }
      return;
    }
    if (/^ipad:/.test(moment.target) && moment.target !== "ipad:all") {
      issue(ctx, "V-4: a shared moment does not target one hunter.");
    }
  });
export type Moment = z.infer<typeof momentSchema>;

/**
 * A pick's options, from `choices.yaml`. An entry is `{id: <pick moment id>, options: [{id, label}]}`.
 * Other entries in the list are parsed and kept, and are not read here (D13).
 */
const pickChoiceSchema = z.strictObject({
  id: z.string(),
  options: z
    .array(z.strictObject({ id: optionIdSchema, label: z.string().min(1).max(120) }))
    .min(1),
});

/** The options for one pick moment, or none when the choices file has no entry for it. */
export const pickOptionsFor = (
  choices: unknown,
  momentId: string,
): Array<{ id: string; label: string }> => {
  if (!Array.isArray(choices)) return [];
  const entry = choices.find(
    (item) => typeof item === "object" && item !== null && "id" in item && item.id === momentId,
  );
  if (entry === undefined) return [];
  const parsed = pickChoiceSchema.safeParse(entry);
  if (!parsed.success) throw new Error(`choices for ${momentId} are not valid pick options.`);
  return parsed.data.options;
};

export const cueSchema = z
  .strictObject({
    name: idSchema,
    capability: z.string().min(1).max(200),
    status: z.enum(["Verified", "Library", "GAP"]),
    screen: assetIdSchema,
    fallback_sfx: assetIdSchema,
    drums: z.union([z.literal("none"), idSchema]),
    /**
     * Seconds after this cue's sound before the next sound or spoken line.
     * R1 keeps the number and does not wait on it.
     */
    hold_s: z.number().finite().positive().optional(),
    confirm: z.boolean().optional(),
    base_game: z.boolean().optional(),
    trigger: z
      .strictObject({
        after: z.string().min(1).max(200),
        when: z.string().min(1).max(300).optional(),
      })
      .optional(),
  })
  .superRefine((cue, ctx) => {
    if (cue.drums !== "none" && cue.base_game !== true) {
      issue(ctx, "V-8: a story cue uses drums none unless it is flagged base-game.");
    }
  });
export type Cue = z.infer<typeof cueSchema>;

const relativePathSchema = z.string().refine(
  (value) => {
    if (value.length === 0 || value.startsWith("/") || value.startsWith("\\")) return false;
    if (value.includes("\\") || /^[A-Za-z]:/.test(value)) return false;
    return !value.split("/").some((part) => part === ".." || part === ".");
  },
  { message: "V-2: a manifest path stays inside the pack." },
);

export const assetSchema = z
  .strictObject({
    id: assetIdSchema,
    type: z.enum(["still", "clip", "line", "sfx", "music", "ambient", "portrait"]),
    target: z.enum(["storyboard", "ipad", "phone"]),
    status: z.enum(["placeholder", "draft", "final"]),
    path: relativePathSchema.optional(),
    speaker: idSchema.optional(),
    moment: momentIdSchema.optional(),
    text: z.string().max(2000).optional(),
    duration_s: z.number().positive().optional(),
    poster: assetIdSchema.optional(),
    reuse_of: assetIdSchema.optional(),
  })
  .superRefine((asset, ctx) => {
    const priv = asset.id.includes(".private.") || asset.moment?.includes(".private.") === true;
    if (priv && asset.target === "storyboard") {
      issue(ctx, "V-4: a private asset is not a storyboard target.");
    }
  });
export type Asset = z.infer<typeof assetSchema>;

const hunterSchema = z.strictObject({
  id: hunterIdSchema,
  name: z.string().min(1).max(80),
  portrait: assetIdSchema,
  voice: assetIdSchema,
  start_items: z.array(idSchema).optional(),
  start_location: z.string().min(1).max(80),
  secret_goals: z.array(idSchema).optional(),
  rtdt_hero: idSchema.optional(),
});

const castSchema = z.strictObject({
  id: idSchema,
  name: z.string().min(1).max(80),
  voice: assetIdSchema,
  role: z.enum(["narrator", "npc", "adversary", "companion"]),
  companion_card: idSchema.optional(),
});

const nightSchema = z.strictObject({
  id: idSchema,
  index: z.number().int().positive(),
  kingdom: z.string().regex(/^(?:fixed:K[1-4]|seed|player-choice|after:[a-z][a-z0-9-]*)$/),
  phases: z
    .array(
      z.strictObject({
        id: idSchema,
        advance: z.strictObject({
          after_actions: z.number().int().positive(),
          on_event: z.string().min(1).max(120),
        }),
      }),
    )
    .min(1),
  phase_moments: z.record(z.string(), momentIdSchema).optional(),
  set_pieces: z
    .array(
      z.strictObject({
        ref: idSchema,
        required: z.boolean(),
        when: z.string().min(1).max(300).optional(),
      }),
    )
    .min(1),
  encounter_tables: z.unknown().optional(),
  key: idSchema.optional(),
  end: z.string().min(1).max(300),
});

const setPieceSchema = z.strictObject({
  id: idSchema,
  night: z.union([idSchema, z.array(idSchema).min(1)]),
  site: z.unknown(),
  trigger: z.string().min(1).max(80),
  scope: z.enum(["scene", "global"]).optional(),
  flow: z.array(z.unknown()).min(1),
  outcome: z.unknown(),
  stats: z.array(idSchema).optional(),
});

const statsSchema = z.strictObject({
  custom: z.array(
    z.strictObject({
      id: idSchema,
      type: z.enum(["counter", "event"]),
      scope: z.enum(["party", "hunter"]),
    }),
  ),
  highlight_weights: z.record(z.string(), z.number()).optional(),
  timing: z.strictObject({
    marks: z.literal("auto"),
    estimate: z.unknown().optional(),
  }),
});

const ambientSchema = z
  .strictObject({
    bed: assetIdSchema,
    accents: z.array(assetIdSchema),
    interval_s: z.tuple([z.number().positive(), z.number().positive()]),
  })
  .superRefine((phase, ctx) => {
    const [min, max] = phase.interval_s;
    if (min > max) issue(ctx, "V-1: an accent interval lists the lower bound first.");
  });

const duplicate = (ids: readonly string[]): string | undefined => {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) return id;
    seen.add(id);
  }
  return undefined;
};

const SEEDED_CALL = /^seed\([a-z][a-z0-9]*(?:-[a-z0-9]+)*\)$/;

/** V-20: randomness names a seeded table. Returns a message, or undefined when it holds. */
export const randomnessIssue = (value: unknown): string | undefined => {
  const walk = (node: unknown): string | undefined => {
    if (typeof node === "string") {
      if (/\brandom\b/i.test(node)) {
        return "V-20: randomness names a seeded table.";
      }
      const calls = node.match(/seed\([^)]*\)/g) ?? [];
      for (const call of calls) {
        if (!SEEDED_CALL.test(call)) return "V-20: seed() names a table id.";
      }
      return undefined;
    }
    if (Array.isArray(node)) {
      for (const entry of node) {
        const found = walk(entry);
        if (found) return found;
      }
      return undefined;
    }
    if (node && typeof node === "object") {
      for (const entry of Object.values(node)) {
        const found = walk(entry);
        if (found) return found;
      }
    }
    return undefined;
  };
  return walk(value);
};

export const LENGTH_IDS = ["short", "standard", "long"] as const;

/** Cover image: a file directly inside `<pack>/assets/`, the same folder jail as the other assets. */
export const coverSchema = z
  .string()
  .regex(/^assets\/[A-Za-z0-9][A-Za-z0-9._-]*\.(?:png|jpe?g|webp)$/i, {
    message: "V-1: cover is a file directly inside assets/, such as assets/cover.png.",
  });

/**
 * Limits on manifest `settings`. The board and device states carry the settings with the same
 * limits (`gameSettingsSchema`), so a pack over them fails the lint instead of breaking a frame.
 */
export const SETTINGS_MAX = 16;
export const SETTING_OPTIONS_MAX = 16;
/** A setting or option id travels in a `set` press, so it fits the control option id (64). */
export const SETTING_ID_MAX = 64;
export const SETTING_LABEL_MAX = 80;

const settingIdSchema = idSchema.max(SETTING_ID_MAX);
const settingLabelSchema = z.string().min(1).max(SETTING_LABEL_MAX);

/** A game setting the player picks on Game settings (R3-UI-22). */
export const settingSchema = z.strictObject({
  id: settingIdSchema,
  label: settingLabelSchema,
  options: z
    .array(z.strictObject({ id: settingIdSchema, label: settingLabelSchema }))
    .min(1)
    .max(SETTING_OPTIONS_MAX),
  default: settingIdSchema,
});
export type GameSetting = z.infer<typeof settingSchema>;

/**
 * Setting rules that need a list. A `length` setting uses `lengths`; a `difficulty` setting uses
 * the pack's difficulty ids. A metadata-only pack has no difficulty list, so that check is skipped.
 */
const settingIssues = (
  settings: readonly z.infer<typeof settingSchema>[],
  lengths: readonly string[],
  difficulties?: readonly string[],
): string[] => {
  const messages: string[] = [];
  const dup = duplicate(settings.map((setting) => setting.id));
  if (dup) messages.push(`V-1: setting ${dup} is listed twice.`);
  for (const setting of settings) {
    const optionIds = setting.options.map((option) => option.id);
    if (duplicate(optionIds)) messages.push(`V-1: setting ${setting.id} lists an option twice.`);
    if (!optionIds.includes(setting.default)) {
      messages.push(
        `V-1: setting ${setting.id} default ${setting.default} is not one of its options.`,
      );
    }
    const allowed =
      setting.id === "length" ? lengths : setting.id === "difficulty" ? difficulties : undefined;
    if (!allowed) continue;
    for (const id of optionIds) {
      if (!allowed.includes(id)) {
        messages.push(`V-1: setting ${setting.id} option ${id} is not in the pack's list.`);
      }
    }
  }
  return messages;
};

/** Manifest fields every pack has. A `playable: false` pack carries only these. */
const metadataShape = {
  pack_id: idSchema,
  title: z.string().min(1).max(120),
  version: semverSchema,
  engine_min: semverSchema,
  tagline: z.string().min(1).max(200).optional(),
  cover: coverSchema.optional(),
  tower: z.enum(["required", "optional", "none"]).default("optional"),
  settings: z.array(settingSchema).max(SETTINGS_MAX).default([]),
  playable: z.boolean().default(true),
};

/** A pack listed on Pick Game that cannot be chosen yet (`playable: false`). */
export const packMetadataSchema = z.strictObject(metadataShape).superRefine((pack, ctx) => {
  for (const message of settingIssues(pack.settings, LENGTH_IDS)) issue(ctx, message);
});
export type PackMetadata = z.infer<typeof packMetadataSchema>;

export const packSchema = z
  .strictObject({
    ...metadataShape,
    tone: z.string().min(1).max(200).optional(),
    structure: z.enum(["one-shot", "campaign"]),
    players: z.strictObject({
      min: z.number().int().min(1),
      max: z.number().int().min(1),
    }),
    lengths: z.array(z.enum(["short", "standard", "long"])).min(1),
    difficulties: z
      .array(
        z.strictObject({
          id: idSchema,
          label: z.string().min(1).max(80),
          mods: z.unknown(),
        }),
      )
      .min(1),
    systems: z.record(z.string(), z.union([z.string(), z.boolean(), z.number()])),
    rule_modules: z.array(idSchema).optional(),
    components: z
      .array(
        z.strictObject({
          "asset-group": z.string().min(1).max(80),
          use: z.enum(["used", "optional", "unused"]),
        }),
      )
      .min(1),
    setup: z.array(z.unknown()).min(1),
    av_theme: z.strictObject({
      art_style: z.string().min(1).max(80),
      clip_style: z.string().min(1).max(80),
      palette: z.string().min(1).max(80),
      narrator_voice: z.string().min(1).max(80),
      music_mood: z.string().min(1).max(80),
      sfx_set: z.string().min(1).max(80),
    }),
    ambient: z.record(z.string(), ambientSchema),
    advantage_cap: z.number().int().positive().optional(),
    skull_cap_per_night: z.number().int().nonnegative().optional(),
    hunters: z.array(hunterSchema).min(1).max(16),
    cast: z.array(castSchema).optional(),
    nights: z.array(nightSchema).min(1),
    set_pieces: z.array(setPieceSchema).min(1),
    moments: z.array(momentSchema).min(1),
    cues: z.array(cueSchema).min(1),
    assets: z.array(assetSchema).min(1),
    stats: statsSchema,
    // Parsed and kept. R1 does not run these.
    by_length: z.unknown().optional(),
    choices: z.unknown().optional(),
    items: z.unknown().optional(),
    tracks: z.unknown().optional(),
    corruption: z.unknown().optional(),
    guard: z.unknown().optional(),
    hooks: z.unknown().optional(),
    quest_tokens: z.unknown().optional(),
    encounters: z.unknown().optional(),
    dungeons: z.unknown().optional(),
    endings: z.unknown().optional(),
    titles: z.unknown().optional(),
  })
  .superRefine((pack, ctx) => {
    if (!pack.playable) {
      issue(ctx, "V-1: a playable: false pack carries only its metadata.");
    }
    for (const message of settingIssues(
      pack.settings,
      pack.lengths,
      pack.difficulties.map((difficulty) => difficulty.id),
    )) {
      issue(ctx, message);
    }
    if (pack.players.min > pack.players.max) {
      issue(ctx, "V-1: players.min is above players.max.");
    }
    if (Object.keys(pack.ambient).length === 0) {
      issue(ctx, "V-1: ambient names at least one phase.");
    }
    const groups: Array<[string, string[]]> = [
      ["hunter", pack.hunters.map((hunter) => hunter.id)],
      ["cast", (pack.cast ?? []).map((member) => member.id)],
      ["night", pack.nights.map((night) => night.id)],
      ["set piece", pack.set_pieces.map((piece) => piece.id)],
      ["moment", pack.moments.map((moment) => moment.id)],
      ["cue", pack.cues.map((cue) => cue.name)],
      ["asset", pack.assets.map((asset) => asset.id)],
    ];
    for (const [label, ids] of groups) {
      const id = duplicate(ids);
      if (id) issue(ctx, `V-1: ${label} ${id} is listed twice.`);
    }

    const hunters = new Set(pack.hunters.map((hunter) => hunter.id));
    const cast = new Set((pack.cast ?? []).map((member) => member.id));
    const nights = new Set(pack.nights.map((night) => night.id));
    const pieces = new Set(pack.set_pieces.map((piece) => piece.id));
    for (const name of RESERVED_SCENES) {
      if (pieces.has(name)) issue(ctx, `V-3: a set piece is not named ${name}.`);
    }
    const cues = new Set(pack.cues.map((cue) => cue.name));
    const assets = new Set(pack.assets.map((asset) => asset.id));
    const speakers = new Set([...hunters, ...cast]);

    const missingAsset = (id: string) => !assets.has(id);

    for (const night of pack.nights) {
      for (const ref of night.set_pieces) {
        if (!pieces.has(ref.ref)) issue(ctx, `V-2: set piece ${ref.ref} is not in the pack.`);
      }
    }
    for (const piece of pack.set_pieces) {
      const refs = Array.isArray(piece.night) ? piece.night : [piece.night];
      for (const ref of refs) {
        if (!nights.has(ref)) issue(ctx, `V-2: night ${ref} is not in the pack.`);
      }
    }
    for (const moment of pack.moments) {
      const parsed = parseMomentId(moment.id);
      if (parsed && !RESERVED_SCENES.has(parsed.scene) && !pieces.has(parsed.scene)) {
        issue(ctx, `V-3: ${moment.id} does not start with a set piece id.`);
      }
      if (parsed?.hunter && !hunters.has(parsed.hunter)) {
        issue(ctx, `V-4: .private.${parsed.hunter} is not a declared hunter.`);
      }
      for (const name of absentHuntersOf(moment.id)) {
        if (!hunters.has(name)) issue(ctx, `V-5: ~no-${name} is not a declared hunter.`);
      }
      if (moment.asset && missingAsset(moment.asset)) {
        issue(ctx, `V-2: asset ${moment.asset} is not in the manifest.`);
      }
      for (const line of moment.lines ?? []) {
        if (!speakers.has(line.speaker)) {
          issue(ctx, `V-2: speaker ${line.speaker} is not a hunter or cast member.`);
        }
        if (missingAsset(line.voice)) {
          issue(ctx, `V-2: asset ${line.voice} is not in the manifest.`);
        }
      }
      for (const cue of moment.cues ?? []) {
        if (!cues.has(cue.cue)) issue(ctx, `V-2: cue ${cue.cue} is not in the pack.`);
      }
      for (const id of [...(moment.music ?? []), ...(moment.sfx ?? [])]) {
        if (missingAsset(id)) issue(ctx, `V-2: asset ${id} is not in the manifest.`);
      }
    }
    for (const hunter of pack.hunters) {
      for (const id of [hunter.portrait, hunter.voice]) {
        if (missingAsset(id)) issue(ctx, `V-2: asset ${id} is not in the manifest.`);
      }
    }
    for (const member of pack.cast ?? []) {
      if (missingAsset(member.voice)) {
        issue(ctx, `V-2: asset ${member.voice} is not in the manifest.`);
      }
    }
    for (const cue of pack.cues) {
      for (const id of [cue.screen, cue.fallback_sfx]) {
        if (missingAsset(id)) issue(ctx, `V-2: asset ${id} is not in the manifest.`);
      }
    }
    for (const phase of Object.values(pack.ambient)) {
      for (const id of [phase.bed, ...phase.accents]) {
        if (missingAsset(id)) issue(ctx, `V-2: asset ${id} is not in the manifest.`);
      }
    }
    for (const asset of pack.assets) {
      for (const id of [asset.poster, asset.reuse_of]) {
        if (id && missingAsset(id)) issue(ctx, `V-2: asset ${id} is not in the manifest.`);
      }
    }

    const random = randomnessIssue(pack);
    if (random) issue(ctx, random);
  });
export type Pack = z.infer<typeof packSchema>;

export interface PackIssue {
  rule: string;
  path: string;
  message: string;
}

/** Rule id for a Zod issue. Untagged schema failures are V-1, except a cue's screen and fallback (V-8). */
export const packIssueRule = (path: string, message: string): string => {
  const tagged = /^V-\d+/.exec(message);
  if (tagged?.[0]) return tagged[0];
  if (/(^|\.)cues(?:\.\d+)?\.(?:screen|fallback_sfx|drums)$/.test(path)) return "V-8";
  return "V-1";
};

export const packIssues = (error: z.ZodError): PackIssue[] =>
  error.issues.map((item) => {
    const path = item.path.map(String).join(".");
    const rule = packIssueRule(path, item.message);
    const message = item.message.startsWith("V-") ? item.message : `${rule}: ${item.message}`;
    return { rule, path, message };
  });
