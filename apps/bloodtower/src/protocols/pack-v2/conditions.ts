import { z } from "zod";
import { idSchema, kingdomIdSchema } from "./ids.ts";

const counterCompareSchema = z.strictObject({
  type: z.literal("counter"),
  counter: idSchema,
  op: z.enum(["eq", "gte", "lte"]),
  value: z.number().int(),
});

const flagConditionSchema = z.strictObject({
  type: z.literal("flag"),
  flag: idSchema,
  value: z.boolean().default(true),
});

const chapterConditionSchema = z.strictObject({
  type: z.literal("chapter"),
  chapter: idSchema,
});

const dayConditionSchema = z.strictObject({
  type: z.literal("day"),
  op: z.enum(["eq", "gte", "lte"]),
  value: z.number().int().positive(),
});

const kingdomConditionSchema = z.strictObject({
  type: z.literal("kingdom"),
  kingdom: kingdomIdSchema,
});

const conditionLeafSchema = z.discriminatedUnion("type", [
  flagConditionSchema,
  counterCompareSchema,
  chapterConditionSchema,
  dayConditionSchema,
  kingdomConditionSchema,
]);

type ConditionNode =
  | z.infer<typeof conditionLeafSchema>
  | { type: "and"; all: ConditionNode[] }
  | { type: "or"; any: ConditionNode[] }
  | { type: "not"; cond: ConditionNode };

const conditionNodeSchema: z.ZodType<ConditionNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    flagConditionSchema,
    counterCompareSchema,
    chapterConditionSchema,
    dayConditionSchema,
    kingdomConditionSchema,
    z.strictObject({
      type: z.literal("and"),
      all: z.array(conditionNodeSchema).min(1),
    }),
    z.strictObject({
      type: z.literal("or"),
      any: z.array(conditionNodeSchema).min(1),
    }),
    z.strictObject({
      type: z.literal("not"),
      cond: conditionNodeSchema,
    }),
  ]),
);

export const conditionSchema = conditionNodeSchema;
export type PackCondition = ConditionNode;

/** Every story flag read by a condition in the pack. */
export const flagReadsInCondition = (cond: PackCondition): string[] => {
  switch (cond.type) {
    case "flag":
      return [cond.flag];
    case "and":
      return cond.all.flatMap(flagReadsInCondition);
    case "or":
      return cond.any.flatMap(flagReadsInCondition);
    case "not":
      return flagReadsInCondition(cond.cond);
    default:
      return [];
  }
};
