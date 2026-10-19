/** Card and graph types shared by the server loader and the browser graph. No Node imports. */
import type { IdKind } from "./ids.ts";

/** Card format: research/game-design/cards/README.md. */
export const CARD_TYPES = [
  "idea",
  "question",
  "decision",
  "mechanic",
  "screen",
  "ui",
  "cue",
  "sound",
  "sketch",
  "example",
] as const;
export type CardType = (typeof CARD_TYPES)[number];

export const STATUSES = ["open", "answered", "proposed", "decided", "parked"] as const;
export type CardStatus = (typeof STATUSES)[number];

export const RELS = {
  needs: { label: "needs", reverse: "needed by" },
  raises: { label: "raises", reverse: "raised by" },
  answers: { label: "answers", reverse: "answered by" },
  uses: { label: "uses", reverse: "used by" },
  refines: { label: "refines", reverse: "refined by" },
  affects: { label: "affects", reverse: "affected by" },
  conflicts: { label: "conflicts with", reverse: "conflicts with" },
} as const;
export type Rel = keyof typeof RELS;

export type Link = { rel: Rel; to: string; note?: string };
export type Source = { file: string; lines?: string; note?: string };

export type Card = {
  id: string;
  type: CardType;
  title: string;
  status: CardStatus;
  by: string | null;
  links: Link[];
  sources: Source[];
  body: string;
  bodyHtml: string;
  file: string;
};

/** A node in the graph: a card, or a document ID that cards link to (no card of its own). */
export type GraphNode =
  | ({ kind: "card" } & Card)
  | { kind: "ref"; id: string; idKind: IdKind; title: string; foundIn: string[] };

export type Edge = { from: string; to: string; rel: Rel; note?: string };

export type Graph = { nodes: Record<string, GraphNode>; edges: Edge[] };
