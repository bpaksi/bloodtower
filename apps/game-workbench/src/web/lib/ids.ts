/**
 * Design IDs. Every piece of the game design has a stable kind-prefixed ID, so Bob and Claude
 * can name it exactly. The new prefixes (SCR-, UI-, CUE-…) come with the research/game-design
 * reorg and the cards; the older families (R-ENG-20, AST-T04, E17, Q3) already appear in the docs and are kept.
 */

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
const ID_SOURCE = [
  String.raw`(?:SCR|UI|CUE|SND|MEC|IDEA|DEC|AREA|OPT|SK|EX|Q)-\d+`,
  String.raw`R\d?-[A-Z]+(?:-[A-Z]+)*-\d+[a-z]?`,
  String.raw`AST-[A-Z]\d+`,
  String.raw`E\d{1,2}[a-z]?`,
  String.raw`Q\d{1,2}`,
].join("|");

/** Matches an ID with word boundaries. Global; reset `lastIndex` or use `matchAll`. */
export const ID_PATTERN = new RegExp(String.raw`(?<![\w-])(?:${ID_SOURCE})(?![\w-])`, "g");

/** Matches an ID only at the start of the string (for the markdown tokenizer). */
export const ID_AT_START = new RegExp(String.raw`^(?:${ID_SOURCE})(?![\w-])`);

export function idKind(id: string): IdKind {
  const prefix = id.split("-")[0] ?? "";
  if (id.includes("-") && prefix in NEW_PREFIX) return NEW_PREFIX[prefix] as IdKind;
  if (/^R\d?-/.test(id)) return "requirement";
  if (id.startsWith("AST-")) return "asset";
  if (/^E\d/.test(id)) return "engine";
  return "question";
}

/** Unique IDs in the text, in first-seen order. Fenced code is skipped. */
export function extractIds(markdown: string): string[] {
  const text = markdown.replace(/```[\s\S]*?```/g, "");
  return [...new Set([...text.matchAll(ID_PATTERN)].map((m) => m[0]))];
}

/** "R-ENG-20" → "R-ENG"; "AST-T04" → "AST-T"; "E17" → "E"; "SCR-007" → "SCR". */
export function idFamily(id: string): string {
  return id.replace(/\d+[a-z]?$/, "").replace(/-$/, "");
}
