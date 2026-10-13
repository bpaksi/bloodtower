import { z } from "zod";
import {
  availabilitySchema,
  type Capability,
  capabilityCategorySchema,
  capabilityKindSchema,
  exclusions,
  inventory,
  LIBRARY_BASELINE,
  SOUND_COUNT,
} from "./inventory.ts";

/**
 * Renders `apps/tower-poc/docs/capabilities.md` from the inventory. Pure: no clock, no
 * file access, no library import, and a fixed order, so the same inventory always gives
 * the same text. `generateCapabilitiesDoc.ts` writes it; `capabilitiesDoc.test.ts` fails
 * when the committed file differs.
 */

type JsonSchema = {
  type?: string;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
};

const range = (min: number | undefined, max: number | undefined): string =>
  min !== undefined && max !== undefined ? ` ${min}..${max}` : "";

const describeSchema = (schema: JsonSchema): string => {
  if (schema.enum) return `one of ${schema.enum.map(String).join(", ")}`;
  if (schema.type === "integer") return `int${range(schema.minimum, schema.maximum)}`;
  if (schema.type === "array") {
    const count = range(schema.minItems, schema.maxItems);
    return `list${count ? ` (${count.trim()} items)` : ""} of ${describeSchema(schema.items ?? {})}`;
  }
  if (schema.type === "object") {
    const properties = Object.entries(schema.properties ?? {});
    if (properties.length === 0) return "none";
    const required = new Set(schema.required ?? []);
    return `{ ${properties
      .map(([name, child]) => `${name}${required.has(name) ? "" : "?"}: ${describeSchema(child)}`)
      .join("; ")} }`;
  }
  return schema.type ?? "any";
};

/** Parameters in a readable form: `none`, or one `name: type` per property, `?` marking optional ones. */
export const describeParams = (params: z.ZodObject): string => {
  const json = z.toJSONSchema(params, { io: "input", unrepresentable: "any" }) as JsonSchema;
  if (Object.keys(json.properties ?? {}).length === 0) return "none";
  const required = new Set(json.required ?? []);
  return Object.entries(json.properties ?? {})
    .map(([name, child]) => `${name}${required.has(name) ? "" : "?"}: ${describeSchema(child)}`)
    .join("; ");
};

const cell = (text: string): string => text.replaceAll("|", "\\|").replaceAll("\n", " ");
const code = (text: string): string => `\`${text.replaceAll("`", "'")}\``;

const countBy = <T extends string>(values: readonly T[], order: readonly T[]): string[] =>
  order.map((value) => `- ${value}: ${values.filter((v) => v === value).length}`);

const row = (cells: string[]): string => `| ${cells.map(cell).join(" | ")} |`;

const categoryTable = (entries: readonly Capability[]): string[] => [
  row([
    "Id",
    "Title",
    "Kind",
    "Availability",
    "Library member",
    "Parameters",
    "UI page",
    "Verification",
  ]),
  row(["---", "---", "---", "---", "---", "---", "---", "---"]),
  ...entries.map((entry) =>
    row([
      code(entry.id),
      entry.title,
      entry.kind,
      entry.availability,
      entry.apiMapping.length === 0 ? "none" : entry.apiMapping.map(code).join(", "),
      code(describeParams(entry.params)),
      entry.uiLocation ?? "none",
      entry.verification,
    ]),
  ),
];

export const renderCapabilitiesDoc = (dataVersion: string): string => {
  const entries: readonly Capability[] = inventory;
  const lines: string[] = [
    "# Capabilities",
    "",
    "<!-- GENERATED FILE. Do not edit by hand. -->",
    "",
    "This file is generated from `apps/tower-poc/src/protocols/inventory.ts` by `pnpm inventory:doc` (run from `apps/tower-poc/`). Do not edit it by hand: change the inventory and regenerate. A test fails when this file is out of date.",
    "",
    "## Versions",
    "",
    `- Library: ${LIBRARY_BASELINE.name} ${LIBRARY_BASELINE.version}`,
    `- Data: ultimatedarktowerdata ${dataVersion} (${SOUND_COUNT} sounds)`,
    "",
    "## Counts",
    "",
    `${entries.length} entries and ${exclusions.length} exclusions.`,
    "",
    "By category:",
    "",
    ...countBy(
      entries.map((entry) => entry.category),
      capabilityCategorySchema.options,
    ),
    "",
    "By kind:",
    "",
    ...countBy(
      entries.map((entry) => entry.kind),
      capabilityKindSchema.options,
    ),
    "",
    "By availability:",
    "",
    ...countBy(
      entries.map((entry) => entry.availability),
      availabilitySchema.options,
    ),
    "",
    "## Entries",
  ];
  for (const category of capabilityCategorySchema.options) {
    const inCategory = entries.filter((entry) => entry.category === category);
    if (inCategory.length === 0) continue;
    lines.push("", `### ${category}`, "", ...categoryTable(inCategory));
  }
  lines.push(
    "",
    "## Exclusions",
    "",
    "Public library members that have no entry, and why.",
    "",
    row(["Member", "Kind", "Reason", "Gap"]),
    row(["---", "---", "---", "---"]),
    ...exclusions.map((exclusion) =>
      row([code(exclusion.member), exclusion.kind, exclusion.reason, exclusion.gapId ?? "none"]),
    ),
    "",
  );
  return lines.join("\n");
};
