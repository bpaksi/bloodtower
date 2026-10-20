import path from "node:path";
import {
  buildGraph as buildGraphWith,
  type CardSchema,
  parseCard as parseCardWith,
} from "@dark-tower/workbench";
import { loadCards as loadCardsWith } from "@dark-tower/workbench/server";
import { designDir, loadDocs } from "./content.ts";
import { CARD_TYPES, type Card, type CardType, type Graph, LAYERS, RELS } from "./graph-types.ts";
import { idKind } from "./ids.ts";
import { renderMarkdown } from "./markdown.ts";

export { RELS };

const PREFIX: Record<CardType, string> = {
  area: "AREA",
  option: "OPT",
  piece: "AST",
  idea: "IDEA",
  question: "Q",
  decision: "DEC",
  mechanic: "MEC",
  screen: "SCR",
  ui: "UI",
  cue: "CUE",
  sound: "SND",
  glyph: "GLY",
  seal: "SEAL",
  light: "LGT",
  "light-effect": "LFX",
  "light-sequence": "LSQ",
  drum: "DRM",
  sketch: "SK",
  example: "EX",
};

/** Card format: research/game-design/cards/README.md. */
export const GAME_CARDS: CardSchema = {
  types: CARD_TYPES,
  // Pieces keep their asset-catalog IDs (AST-B04 skulls); every other type is PREFIX-NNN.
  checkId(type, id) {
    if (type === "piece") return /^AST-B\d{2}$/.test(id) ? null : "a piece keeps its AST-Bnn ID";
    const prefix = PREFIX[type as CardType];
    return new RegExp(`^${prefix}-\\d{3,}$`).test(id)
      ? null
      : `ID must be ${prefix}-NNN for type ${type}`;
  },
  layers: LAYERS,
  rels: RELS,
  dir: "research/game-design/cards",
  render: renderMarkdown,
};

export function cardsDir(): string {
  return path.join(designDir(), "cards");
}

/** Parses and checks one card file. Throws with the file name on any format error. */
export function parseCard(file: string, text: string): Card {
  // The schema has checked type and layer, so the narrower game types hold.
  return parseCardWith(file, text, GAME_CARDS) as Card;
}

/** Every card that parses, plus one message per card file that does not. */
export function loadCards(dir = cardsDir()): { cards: Card[]; errors: string[] } {
  const { cards, errors } = loadCardsWith(dir, GAME_CARDS);
  return { cards: cards as Card[], errors };
}

/**
 * Builds the graph over the given cards, or over the cards folder. Problems are links to IDs that
 * appear nowhere, plus, when the folder is read, every card file that does not parse.
 */
export function buildGraph(cards?: Card[]): { graph: Graph; problems: string[] } {
  const loaded = cards ? { cards, errors: [] } : loadCards();
  const { graph, problems } = buildGraphWith(loaded.cards, {
    docs: loadDocs(),
    rels: RELS,
    kindOf: idKind,
  });
  return { graph, problems: [...loaded.errors, ...problems] };
}
