/**
 * The game design's link rules (step 9; the table in research/game-design/cards/README.md).
 * Bob, 2026-10-21: allow every shape today's cards use 5 or more times, plus a few rules by
 * meaning. Breaks that existed then are grandfathered in cards/.link-baseline.json. No Node imports.
 */
import type { LinkRule, LinkRules } from "@dark-tower/workbench";
import type { CardType } from "./graph-types.ts";

/** Things that get built: the order between them is what `needs` records. */
const BUILDABLE: readonly CardType[] = [
  "decision",
  "option",
  "mechanic",
  "piece",
  "screen",
  "ui",
  "cue",
  "sound",
  "glyph",
  "seal",
  "light",
  "light-effect",
  "light-sequence",
  "drum",
];

const TOWER_OUTPUTS: readonly CardType[] = [
  "sound",
  "glyph",
  "seal",
  "light",
  "light-effect",
  "light-sequence",
  "drum",
];

/** "from rel to" shapes used 5 or more times on 2026-10-21. A ref is written `ref:<kind>`. */
export const COMMON = [
  "decision affects decision",
  "decision affects mechanic",
  "decision affects piece",
  "idea affects decision",
  "idea affects mechanic",
  "idea affects piece",
  "idea affects question",
  "question affects decision",
  "question affects idea",
  "question affects mechanic",
  "question affects piece",
  "question affects question",
  "decision answers idea",
  "decision answers question",
  "option answers question",
  "question needs question",
  "decision raises question",
  "idea raises question",
  "area refines ref:asset",
  "decision refines decision",
  "decision refines idea",
  "decision refines mechanic",
  "decision refines piece",
  "decision refines ref:engine",
  "decision refines ref:requirement",
  "idea refines decision",
  "idea refines idea",
  "idea refines mechanic",
  "idea refines piece",
  "idea refines ref:requirement",
  "mechanic refines idea",
  "mechanic refines mechanic",
  "mechanic refines ref:engine",
  "mechanic refines ref:requirement",
  "piece refines piece",
  "piece refines ref:engine",
  "question refines decision",
  "screen refines ref:requirement",
  "ui refines ref:requirement",
  "area uses piece",
  "decision uses decision",
  "decision uses idea",
  "decision uses mechanic",
  "glyph uses drum",
  "idea uses piece",
  "mechanic uses decision",
  "mechanic uses mechanic",
  "mechanic uses piece",
  "piece uses mechanic",
  "question uses decision",
  "question uses mechanic",
  "seal uses drum",
] as const;

/** Rules by meaning, on top of the common shapes. */
const BY_MEANING: Record<string, LinkRule[]> = {
  "part-of": [{ from: "any", to: ["area"] }],
  needs: [
    { from: [...BUILDABLE, "idea"], to: [...BUILDABLE, "question"] },
    { from: ["question"], to: ["question"] },
  ],
  answers: [{ from: "any", to: ["question"] }],
  conflicts: [{ from: "any", to: "any" }],
  uses: [{ from: ["screen", "ui", "cue"], to: ["ui", "cue", ...TOWER_OUTPUTS] }],
};

function build(): LinkRules["rels"] {
  const rels: Record<string, LinkRule[]> = {};
  for (const [rel, rules] of Object.entries(BY_MEANING)) rels[rel] = [...rules];
  for (const shape of COMMON) {
    const [from, rel, to] = shape.split(" ") as [string, string, string];
    rels[rel] = [...(rels[rel] ?? []), { from: [from], to: [to] }];
  }
  return rels;
}

export const GAME_LINK_RULES: LinkRules = {
  rels: build(),
  buildOrder: ["needs"],
  acyclic: ["needs", "part-of"],
};
