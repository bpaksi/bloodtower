/**
 * Gaps in the card graph, as pure functions. A gap is a warning that steers a design session; it
 * never fails a check. Each gap carries the card ID and the rule that found it. No Node imports.
 */
import type { Card, Graph } from "./graph-types.ts";

export const GAP_RULES = [
  "open-question",
  "mechanic-surface",
  "conflict-unparked",
  "no-deliverable",
  "area-undecided",
] as const;
export type GapRule = (typeof GAP_RULES)[number];

export const GAP_RULE_LABEL: Record<GapRule, string> = {
  "open-question": "Open question with no answer",
  "mechanic-surface": "Mechanic with no screen, UI piece or cue",
  "conflict-unparked": "Conflict not yet settled",
  "no-deliverable": "Decided ruling no deliverable reaches",
  "area-undecided": "Area with nothing decided",
};

export type Gap = {
  /** The card the gap is about. */
  id: string;
  rule: GapRule;
  title: string;
  /** The areas the card is part of (the area itself for an area gap); empty when it has none. */
  areas: string[];
  /** Short detail, e.g. the other side of a conflict. */
  detail?: string;
};

/** ID kinds that live in documents, not as cards: a conflict with one is settled by deciding. */
const DOCUMENT_ID_KINDS = ["requirement", "asset", "engine", "question"];

const SURFACE_TYPES = ["screen", "ui", "cue"];
/** The cards that get built (DEC-355): each decided ruling is reached from one by needs or uses. */
const DELIVERABLE_TYPES = ["screen", "ui", "cue", "mechanic", "art"];
const REACH_RELS = ["needs", "uses"];

function cardsOf(graph: Graph): Card[] {
  return Object.values(graph.nodes).flatMap((n) => (n.kind === "card" ? [n] : []));
}

/** The areas each card is directly part of. */
function areasOf(graph: Graph): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const e of graph.edges) {
    if (e.rel !== "part-of" || graph.nodes[e.to]?.kind !== "card") continue;
    const n = graph.nodes[e.to];
    if (n?.kind !== "card" || n.type !== "area") continue;
    const list = out.get(e.from) ?? [];
    if (!list.includes(e.to)) list.push(e.to);
    out.set(e.from, list);
  }
  return out;
}

/** Every card in the `part-of` subtree under `area` (not the area itself). */
function subtree(graph: Graph, area: string): Set<string> {
  const children = new Map<string, string[]>();
  for (const e of graph.edges) {
    if (e.rel === "part-of") children.set(e.to, [...(children.get(e.to) ?? []), e.from]);
  }
  const seen = new Set<string>();
  const walk = (id: string) => {
    for (const c of children.get(id) ?? []) {
      if (seen.has(c) || c === area) continue;
      seen.add(c);
      walk(c);
    }
  };
  walk(area);
  return seen;
}

/** Every node reached from a live deliverable card by `needs` or `uses`, over any number of hops. */
function reachedFromDeliverables(graph: Graph): Set<string> {
  const out = new Map<string, string[]>();
  for (const e of graph.edges) {
    if (REACH_RELS.includes(e.rel)) out.set(e.from, [...(out.get(e.from) ?? []), e.to]);
  }
  const seen = new Set<string>();
  const stack = cardsOf(graph)
    .filter((c) => DELIVERABLE_TYPES.includes(c.type) && c.status !== "parked")
    .map((c) => c.id);
  while (stack.length > 0) {
    for (const to of out.get(stack.pop() as string) ?? []) {
      if (seen.has(to)) continue;
      seen.add(to);
      stack.push(to);
    }
  }
  return seen;
}

const isAnsweredQuestion = (n: Graph["nodes"][string] | undefined, answered: Set<string>) =>
  n?.kind === "card" && n.type === "question" && (n.status === "answered" || answered.has(n.id));

/** All gaps, ordered by rule, then card ID. */
export function findGaps(graph: Graph): Gap[] {
  const cards = cardsOf(graph);
  const areas = areasOf(graph);
  const gap = (c: Card, rule: GapRule, detail?: string): Gap => ({
    id: c.id,
    rule,
    title: c.title,
    areas: c.type === "area" ? [c.id] : (areas.get(c.id) ?? []),
    ...(detail ? { detail } : {}),
  });
  const gaps: Gap[] = [];

  const answered = new Set(graph.edges.filter((e) => e.rel === "answers").map((e) => e.to));
  for (const c of cards) {
    if (c.type === "question" && c.status === "open" && !answered.has(c.id)) {
      gaps.push(gap(c, "open-question"));
    }
  }

  const surface = new Set<string>();
  for (const e of graph.edges) {
    const from = graph.nodes[e.from];
    const to = graph.nodes[e.to];
    if (from?.kind === "card" && to?.kind === "card") {
      if (SURFACE_TYPES.includes(to.type)) surface.add(from.id);
      if (SURFACE_TYPES.includes(from.type)) surface.add(to.id);
    }
  }
  for (const c of cards) {
    if (c.type === "mechanic" && !surface.has(c.id)) gaps.push(gap(c, "mechanic-surface"));
  }

  const pairs = new Set<string>();
  for (const e of graph.edges) {
    if (e.rel !== "conflicts") continue;
    const a = graph.nodes[e.from];
    const b = graph.nodes[e.to];
    if (a?.kind !== "card" || a.status === "parked") continue;
    if (b?.kind === "card" && b.status === "parked") continue;
    // On an answered question, a conflict records what the question was about (DEC-611).
    if (isAnsweredQuestion(a, answered) || isAnsweredQuestion(b, answered)) continue;
    // A conflict with a document ID (R-, E...) is settled once the card side is decided.
    if (b?.kind === "ref" && DOCUMENT_ID_KINDS.includes(b.idKind) && a.status === "decided")
      continue;
    // A conflict written on both cards is one gap.
    const key = [e.from, e.to].sort().join("|");
    if (pairs.has(key)) continue;
    pairs.add(key);
    gaps.push(gap(a, "conflict-unparked", `conflicts with ${e.to}`));
  }

  const reached = reachedFromDeliverables(graph);
  for (const c of cards) {
    if (c.status === "decided" && c.type === "decision" && !reached.has(c.id)) {
      gaps.push(gap(c, "no-deliverable"));
    }
  }

  for (const c of cards) {
    if (c.type !== "area") continue;
    const decided = [...subtree(graph, c.id)].some((id) => {
      const n = graph.nodes[id];
      return n?.kind === "card" && n.status === "decided";
    });
    if (!decided) gaps.push(gap(c, "area-undecided"));
  }

  const order = (r: GapRule) => GAP_RULES.indexOf(r);
  return gaps.sort(
    (a, b) =>
      order(a.rule) - order(b.rule) ||
      a.id.localeCompare(b.id, "en", { numeric: true }) ||
      (a.detail ?? "").localeCompare(b.detail ?? ""),
  );
}

export type GapGroup = {
  rule: GapRule;
  label: string;
  /** Gaps in this rule; the group counts add up to the number of gaps. */
  count: number;
  /** The same gaps by area; a card in several areas is listed under each. */
  byArea: { area: string | null; gaps: Gap[] }[];
};

/** Gaps grouped by rule, then by area (areas in ID order, cards with no area last). */
export function groupGaps(gaps: Gap[]): GapGroup[] {
  return GAP_RULES.flatMap((rule) => {
    const mine = gaps.filter((g) => g.rule === rule);
    if (mine.length === 0) return [];
    const ids = [...new Set(mine.flatMap((g) => g.areas))].sort((a, b) =>
      a.localeCompare(b, "en", { numeric: true }),
    );
    const byArea: GapGroup["byArea"] = ids.map((area) => ({
      area,
      gaps: mine.filter((g) => g.areas.includes(area)),
    }));
    const loose = mine.filter((g) => g.areas.length === 0);
    if (loose.length > 0) byArea.push({ area: null, gaps: loose });
    return [{ rule, label: GAP_RULE_LABEL[rule], count: mine.length, byArea }];
  });
}

/** Gaps per area; a card in several areas counts once in each. */
export function gapsPerArea(gaps: Gap[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const g of gaps) for (const a of g.areas) out.set(a, (out.get(a) ?? 0) + 1);
  return out;
}
