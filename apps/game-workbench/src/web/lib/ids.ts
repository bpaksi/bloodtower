/**
 * Design IDs. Every piece of the game design has a stable kind-prefixed ID, so Bob and Claude
 * can name it exactly. The new prefixes (SCR-, UI-, CUE-…) come with the research/game-design
 * reorg and the cards; the older families (R-ENG-20, AST-T04, E17, Q3) already appear in the docs and are kept.
 */
import {
  extractIds as extractIdsWith,
  type IdScheme,
  idFamily,
  makeIdScheme,
} from "@dark-tower/workbench";

export type IdKind =
  | "requirement"
  | "asset"
  | "engine"
  | "question"
  | "decision"
  | "area"
  | "option"
  | "screen"
  | "ui"
  | "cue"
  | "sound"
  | "glyph"
  | "seal"
  | "light"
  | "light-effect"
  | "light-sequence"
  | "drum"
  | "mechanic"
  | "idea"
  | "sketch"
  | "example";

export const KIND_LABEL: Record<IdKind, string> = {
  requirement: "Requirement",
  asset: "Asset",
  engine: "Engine",
  question: "Question",
  decision: "Decision",
  area: "Area",
  option: "Option",
  screen: "Screen",
  ui: "UI piece",
  cue: "Tower cue",
  sound: "Tower sound",
  glyph: "Tower glyph",
  seal: "Tower seal",
  light: "Tower light",
  "light-effect": "Light effect",
  "light-sequence": "Light sequence",
  drum: "Tower drum",
  mechanic: "Mechanic",
  idea: "Idea",
  sketch: "Sketch",
  example: "Story example",
};

const NEW_PREFIX: Record<string, IdKind> = {
  SCR: "screen",
  UI: "ui",
  CUE: "cue",
  SND: "sound",
  GLY: "glyph",
  SEAL: "seal",
  LGT: "light",
  LFX: "light-effect",
  LSQ: "light-sequence",
  DRM: "drum",
  MEC: "mechanic",
  IDEA: "idea",
  SK: "sketch",
  EX: "example",
  Q: "question",
  DEC: "decision",
  AREA: "area",
  OPT: "option",
};

// Order matters: longer, more specific forms first so R-AST-ORG-1 is not read as AST-….
const ID_SOURCES = [
  String.raw`(?:SCR|UI|CUE|SND|GLY|SEAL|LGT|LFX|LSQ|DRM|MEC|IDEA|DEC|AREA|OPT|SK|EX|Q)-\d+`,
  String.raw`R\d?-[A-Z]+(?:-[A-Z]+)*-\d+[a-z]?`,
  String.raw`AST-[A-Z]\d+`,
  String.raw`E\d{1,2}[a-z]?`,
  String.raw`Q\d{1,2}`,
];

export function idKind(id: string): IdKind {
  const prefix = id.split("-")[0] ?? "";
  if (id.includes("-") && prefix in NEW_PREFIX) return NEW_PREFIX[prefix] as IdKind;
  if (/^R\d?-/.test(id)) return "requirement";
  if (id.startsWith("AST-")) return "asset";
  if (/^E\d/.test(id)) return "engine";
  return "question";
}

/** The game design's ID scheme, for the shared workbench code. */
export const GAME_IDS: IdScheme = makeIdScheme({
  sources: ID_SOURCES,
  kindOf: idKind,
  labels: KIND_LABEL,
});

/** Unique IDs in the text, in first-seen order. Fenced code is skipped. */
export function extractIds(markdown: string): string[] {
  return extractIdsWith(markdown, GAME_IDS);
}

export { idFamily };
