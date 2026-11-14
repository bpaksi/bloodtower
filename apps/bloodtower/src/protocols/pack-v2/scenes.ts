import { z } from "zod";
import { conditionSchema, flagReadsInCondition } from "./conditions.ts";
import { idSchema, spaceIdSchema } from "./ids.ts";

/*
 * Pack v2 scene data (C3-18): a quest's place, plain scenes (MEC-077), items and endings.
 * The shapes mirror the engine's PlainScene, SceneOption, SceneCost and SceneEffect
 * (engine/loops/scene/scene.ts). Every field here is optional on the story, so a pack
 * without them loads as before.
 */

/** Where a quest stands (DEC-662): a village or a wild space. */
export const QUEST_PLACE_TYPES = ["village", "wild"] as const;

export const questPlaceSchema = z.strictObject({
  space: spaceIdSchema,
  type: z.enum(QUEST_PLACE_TYPES),
});

/** DEC-693: gold, hit points, corruption, and the Ambush toll (Q-C3-22). An item is never a cost. */
export const SCENE_COST_KINDS = ["gold", "hp", "corruption", "toll"] as const;

export const sceneCostSchema = z.discriminatedUnion(
  "kind",
  [
    z.strictObject({ kind: z.literal("gold"), amount: z.number().int().positive() }),
    z.strictObject({ kind: z.literal("hp"), amount: z.number().int().positive() }),
    z.strictObject({ kind: z.literal("corruption") }),
    z.strictObject({ kind: z.literal("toll") }),
  ],
  {
    error: "P2-1: a cost is gold, hp, corruption or toll (DEC-693); an item is never a cost.",
  },
);

/**
 * DEC-642's engine effects for a plain-scene option. A battle is an effect here, so DEC-692's
 * count includes it; the engine turns it into the option's `battle` flag. Hit points and
 * corruption are costs only.
 */
export const SCENE_EFFECT_KINDS = ["gold", "item", "flag", "battle"] as const;

export const sceneEffectSchema = z.discriminatedUnion(
  "kind",
  [
    z.strictObject({
      kind: z.literal("gold"),
      amount: z
        .number()
        .int()
        .refine((n) => n !== 0, { message: "P2-1: a gold effect is not zero." }),
    }),
    z.strictObject({ kind: z.literal("item"), item: idSchema }),
    z.strictObject({ kind: z.literal("flag"), flag: idSchema }),
    z.strictObject({ kind: z.literal("battle") }),
  ],
  { error: "P2-1: a scene effect is gold, item, flag or battle (DEC-642)." },
);

export const MIN_SCENE_OPTIONS = 2;
export const MAX_SCENE_OPTIONS = 3;
export const MAX_OPTION_EFFECTS = 3;

export const sceneOptionSchema = z.strictObject({
  id: idSchema,
  label: z.string().min(1).max(120),
  /** Shown disabled when no present hero holds it (DEC-654). Never spent (DEC-674). */
  needs_item: idSchema.optional(),
  cost: sceneCostSchema.optional(),
  /** 1 to 3, at most one battle (DEC-692). Counted by the scene check, so it names the option. */
  effects: z.array(sceneEffectSchema),
});

const isBattle = (effect: PackSceneEffect) => effect.kind === "battle";

export const plainSceneSchema = z
  .strictObject({
    id: idSchema,
    options: z.array(sceneOptionSchema),
  })
  .superRefine((scene, ctx) => {
    const total = scene.options.length;
    const hidden = scene.options.filter((o) => o.effects.some(isBattle)).length;
    // C3 exception to DEC-692 (Q-C3-02): one shown option is fine when the rest are hidden battles.
    if (total > MAX_SCENE_OPTIONS || total < MIN_SCENE_OPTIONS) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message:
          total === 1
            ? `P2-1: scene ${scene.id}: a one-option scene needs a hidden battle option beside it (DEC-692).`
            : `P2-1: scene ${scene.id}: a scene has ${MIN_SCENE_OPTIONS} or ${MAX_SCENE_OPTIONS} options, found ${total} (DEC-692).`,
      });
    } else if (hidden === total) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: `P2-1: scene ${scene.id}: every option is a hidden battle, so none can be shown (Q-C3-02).`,
      });
    }
    const optionIds = scene.options.map((o) => o.id);
    if (new Set(optionIds).size !== optionIds.length) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: `P2-1: scene ${scene.id}: each option id is unique.`,
      });
    }
    for (const [index, option] of scene.options.entries()) {
      const count = option.effects.length;
      if (count < 1 || count > MAX_OPTION_EFFECTS) {
        ctx.addIssue({
          code: "custom",
          path: ["options", index, "effects"],
          message: `P2-1: scene ${scene.id} option ${option.id}: 1 to ${MAX_OPTION_EFFECTS} effects, found ${count} (DEC-692).`,
        });
      }
      const battles = option.effects.filter(isBattle).length;
      if (battles > 1) {
        ctx.addIssue({
          code: "custom",
          path: ["options", index, "effects"],
          message: `P2-1: scene ${scene.id} option ${option.id}: at most one battle, found ${battles} (DEC-692).`,
        });
      }
    }
  });

/** The giving quest and, when that quest is a plain scene, its option (DEC-653). */
export const sceneItemSchema = z.strictObject({
  id: idSchema,
  label: z.string().min(1).max(120),
  from: z.strictObject({
    quest: idSchema,
    option: idSchema.optional(),
  }),
});

/** DEC-043: the ways the game is lost. */
export const LOSS_WAYS = ["corruption", "skulls", "buildings"] as const;

export const winLineSchema = z.strictObject({
  id: idSchema,
  /** The flag condition that picks this line (DEC-664). Checked by the lint, so it names the line. */
  when: conditionSchema.optional(),
  text: z.string().min(1).max(2000),
});

export const lossSceneSchema = z.strictObject({
  way: z.enum(LOSS_WAYS),
  text: z.string().min(1).max(2000),
});

export const endingsSchema = z.strictObject({
  win: z.array(winLineSchema).min(1),
  /** One scene per DEC-043 way to lose; the lint names a missing one. */
  loss: z.array(lossSceneSchema).default([]),
});

export type PackQuestPlace = z.infer<typeof questPlaceSchema>;
export type PackSceneCost = z.infer<typeof sceneCostSchema>;
export type PackSceneEffect = z.infer<typeof sceneEffectSchema>;
export type PackSceneOption = z.infer<typeof sceneOptionSchema>;
export type PackPlainScene = z.infer<typeof plainSceneSchema>;
export type PackSceneItem = z.infer<typeof sceneItemSchema>;
export type PackEndings = z.infer<typeof endingsSchema>;

/**
 * Names the scene and option a schema issue path points into, read from the raw pack input,
 * so a lint line says `scene ambush option toll` and not only `scenes.1.options.1`.
 */
export const sceneLabelForPath = (input: unknown, path: string): string | undefined => {
  const match = /^scenes\.(\d+)(?:\.options\.(\d+))?/.exec(path);
  if (!match || !input || typeof input !== "object") return undefined;
  const scenes = (input as { scenes?: unknown }).scenes;
  if (!Array.isArray(scenes)) return undefined;
  const scene = scenes[Number(match[1])] as { id?: unknown; options?: unknown } | undefined;
  const sceneId = typeof scene?.id === "string" ? scene.id : `#${match[1]}`;
  if (match[2] === undefined) return `scene ${sceneId}`;
  const options = Array.isArray(scene?.options) ? scene.options : [];
  const option = options[Number(match[2])] as { id?: unknown } | undefined;
  const optionId = typeof option?.id === "string" ? option.id : `#${match[2]}`;
  return `scene ${sceneId} option ${optionId}`;
};

interface SceneDataIssue {
  rule: string;
  path: string;
  message: string;
}

/** The parts of a loaded story the scene checks read. */
export interface SceneDataStory {
  chapters: Array<{
    quests: Array<{ id: string; scene?: string | undefined }>;
  }>;
  scenes?: PackPlainScene[] | undefined;
  items?: PackSceneItem[] | undefined;
  endings?: PackEndings | undefined;
}

/**
 * Cross-reference lint for scene data (C3-18): quests name declared scenes, items are given by a
 * real quest and option, every item an option gives or needs is declared, every win line reads a
 * flag, and every DEC-043 way to lose has a scene.
 */
export const sceneDataIssues = (story: SceneDataStory): SceneDataIssue[] => {
  const issues: SceneDataIssue[] = [];
  const add = (rule: string, path: string, message: string) =>
    issues.push({ rule, path, message: `${rule}: ${message}` });
  const scenes = story.scenes ?? [];
  const items = story.items ?? [];
  const sceneById = new Map(scenes.map((s) => [s.id, s]));

  const sceneIds = scenes.map((s) => s.id);
  if (new Set(sceneIds).size !== sceneIds.length) add("P2-1", "scenes", "each scene id is unique.");
  const itemIds = items.map((i) => i.id);
  if (new Set(itemIds).size !== itemIds.length) add("P2-1", "items", "each item id is unique.");
  const declared = new Set(itemIds);

  const quests = new Map<string, { scene?: string | undefined }>();
  const questIds: string[] = [];
  for (const [ci, chapter] of story.chapters.entries()) {
    for (const [qi, quest] of chapter.quests.entries()) {
      questIds.push(quest.id);
      quests.set(quest.id, quest);
      if (quest.scene !== undefined && !sceneById.has(quest.scene)) {
        add(
          "P2-2",
          `chapters.${ci}.quests.${qi}.scene`,
          `quest ${quest.id} names scene ${quest.scene}, which is not declared.`,
        );
      }
    }
  }
  if (new Set(questIds).size !== questIds.length) {
    add("P2-1", "chapters", "each quest id is unique across the story.");
  }

  for (const [si, scene] of scenes.entries()) {
    for (const [oi, option] of scene.options.entries()) {
      const where = `scene ${scene.id} option ${option.id}`;
      if (option.needs_item !== undefined && !declared.has(option.needs_item)) {
        add(
          "P2-2",
          `scenes.${si}.options.${oi}.needs_item`,
          `${where} needs item ${option.needs_item}, which is not declared.`,
        );
      }
      for (const [ei, effect] of option.effects.entries()) {
        if (effect.kind === "item" && !declared.has(effect.item)) {
          add(
            "P2-2",
            `scenes.${si}.options.${oi}.effects.${ei}`,
            `${where} gives item ${effect.item}, which is not declared.`,
          );
        }
      }
    }
  }

  for (const [ii, item] of items.entries()) {
    const path = `items.${ii}.from`;
    const quest = quests.get(item.from.quest);
    if (!quest) {
      add("P2-2", path, `item ${item.id}: quest ${item.from.quest} is not declared.`);
      continue;
    }
    const scene = quest.scene === undefined ? undefined : sceneById.get(quest.scene);
    if (!scene) {
      // A quest with no plain scene (a Tomb, MEC-026) gives its item from its own game.
      if (item.from.option !== undefined) {
        add(
          "P2-2",
          path,
          `item ${item.id}: quest ${item.from.quest} has no plain scene, so it has no option ${item.from.option}.`,
        );
      }
      continue;
    }
    if (item.from.option === undefined) {
      add(
        "P2-2",
        path,
        `item ${item.id}: quest ${item.from.quest} is a plain scene, so name the option that gives it.`,
      );
      continue;
    }
    const option = scene.options.find((o) => o.id === item.from.option);
    if (!option) {
      add("P2-2", path, `item ${item.id}: scene ${scene.id} has no option ${item.from.option}.`);
      continue;
    }
    if (!option.effects.some((e) => e.kind === "item" && e.item === item.id)) {
      add("P2-2", path, `item ${item.id}: scene ${scene.id} option ${option.id} does not give it.`);
    }
  }

  if (story.endings) {
    for (const [wi, line] of story.endings.win.entries()) {
      if (!line.when || flagReadsInCondition(line.when).length === 0) {
        add(
          "P2-2",
          `endings.win.${wi}.when`,
          `win line ${line.id} has no flag condition (DEC-664).`,
        );
      }
    }
    const winIds = story.endings.win.map((l) => l.id);
    if (new Set(winIds).size !== winIds.length) {
      add("P2-1", "endings.win", "each win line id is unique.");
    }
    const ways = story.endings.loss.map((l) => l.way);
    for (const way of LOSS_WAYS) {
      const count = ways.filter((w) => w === way).length;
      if (count === 0) {
        add("P2-2", "endings.loss", `loss way ${way} has no scene (DEC-043).`);
      } else if (count > 1) {
        add("P2-1", "endings.loss", `loss way ${way} has ${count} scenes; it has one.`);
      }
    }
  }
  return issues;
};
