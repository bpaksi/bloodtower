/** Card and graph types shared by the server loader and the browser graph. No Node imports. */

export const STATUSES = ["open", "answered", "proposed", "decided", "parked"] as const;
export type CardStatus = (typeof STATUSES)[number];

/** A link verb, read both ways: "A <label> B" and "B <reverse> A". */
export type RelTable = Record<string, { label: string; reverse: string }>;

/** The verbs every workbench has. An app may add its own after these. */
export const RELS = {
  needs: { label: "needs", reverse: "needed by" },
  raises: { label: "raises", reverse: "raised by" },
  answers: { label: "answers", reverse: "answered by" },
  uses: { label: "uses", reverse: "used by" },
  refines: { label: "refines", reverse: "refined by" },
  affects: { label: "affects", reverse: "affected by" },
  conflicts: { label: "conflicts with", reverse: "conflicts with" },
  "part-of": { label: "part of", reverse: "has part" },
} as const satisfies RelTable;

/**
 * The release a card belongs to (DEC-696). A card says `release: "1.1"` when it waits for 1.1;
 * a card with no field is 1.0, and the lint fails any other value.
 */
export type Release = "1.0" | "1.1";
export const LATER_RELEASES = ["1.1"] as const;

export function releaseOf(card: { data: Record<string, unknown> }): Release {
  return card.data.release === "1.1" ? "1.1" : "1.0";
}

export type Link = { rel: string; to: string; note?: string };
export type Source = { file: string; lines?: string; note?: string };

export type Card<Type extends string = string, Layer extends string = string> = {
  id: string;
  type: Type;
  title: string;
  status: CardStatus;
  layer: Layer | null;
  by: string | null;
  links: Link[];
  sources: Source[];
  body: string;
  bodyHtml: string;
  /** Repo-relative path of the card file. */
  file: string;
  /** The whole front matter as written, for fields only one app reads. */
  data: Record<string, unknown>;
};

export type RefNode = { kind: "ref"; id: string; idKind: string; title: string; foundIn: string[] };

/** A node in the graph: a card, or an ID that cards link to that has no card of its own. */
export type GraphNode<C extends Card = Card> = ({ kind: "card" } & C) | RefNode;

export type Edge = { from: string; to: string; rel: string; note?: string };

/** `rels` travels with the graph, so the browser can read verbs without another prop. */
export type Graph<C extends Card = Card> = {
  nodes: Record<string, GraphNode<C>>;
  edges: Edge[];
  rels: RelTable;
};
