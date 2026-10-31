/** The game design's card types, layers and verbs. No Node imports. */
import type {
  Card as BaseCard,
  Graph as BaseGraph,
  GraphNode as BaseGraphNode,
} from "@dark-tower/workbench";

export {
  type CardStatus,
  type Edge,
  type Link,
  RELS,
  type Source,
  STATUSES,
} from "@dark-tower/workbench";

/** Card format: research/game-design/cards/README.md. */
export const CARD_TYPES = [
  "area",
  "idea",
  "question",
  "option",
  "decision",
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
  "art",
  "sketch",
  "example",
] as const;
export type CardType = (typeof CARD_TYPES)[number];

/**
 * Where a card sits between "every story" and "one story":
 * core = the same in every story; configurable = an engine mechanism each story fills with data;
 * optional = an engine module a story may switch on; story = lives in one story pack;
 * process = how we design, not what gets built (DEC-695).
 */
export const LAYERS = ["core", "configurable", "optional", "story", "process"] as const;
export type Layer = (typeof LAYERS)[number];

export const LAYER_LABEL: Record<Layer, string> = {
  core: "Core · every story",
  configurable: "Configurable · story fills it",
  optional: "Optional module",
  story: "Story-specific",
  process: "Process · how we design",
};

export type Card = BaseCard<CardType, Layer>;
export type GraphNode = BaseGraphNode<Card>;
export type Graph = BaseGraph<Card>;
