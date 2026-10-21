/**
 * Link rules: which node types each verb may join, which verbs set build order, and which must
 * not form a cycle. A rule break that is listed in the app's baseline is grandfathered; any other
 * break, a stale baseline entry or a cycle is a problem. No Node imports.
 */
import type { Graph } from "./graph-types.ts";

/** A node's type for the rules: a card's `type`, or `ref:<kind>` for an ID with no card. */
export type TypeOf = (id: string) => string;

/** `any` matches every node type. */
export type LinkRule = { from: readonly string[] | "any"; to: readonly string[] | "any" };

export type LinkRules = {
  /** The rules for each verb. A link is allowed when any rule for its verb matches. */
  rels: Record<string, readonly LinkRule[]>;
  /** Verbs that mean "B must be settled or built before A". */
  buildOrder: readonly string[];
  /** Verbs whose links must not loop back on themselves. */
  acyclic: readonly string[];
};

/** The baseline key for one link. */
export const linkKey = (from: string, rel: string, to: string) => `${from}|${rel}|${to}`;

/** The node type a rule sees: a card's type, or `ref:<kind>` for an ID with no card. */
export function typeOfIn(graph: Graph): TypeOf {
  return (id) => {
    const n = graph.nodes[id];
    if (!n) return "ref:unknown";
    return n.kind === "card" ? n.type : `ref:${n.idKind}`;
  };
}

const matches = (allowed: readonly string[] | "any", type: string) =>
  allowed === "any" || allowed.includes(type);

export function allows(rules: LinkRules, rel: string, from: string, to: string): boolean {
  return (rules.rels[rel] ?? []).some((r) => matches(r.from, from) && matches(r.to, to));
}

/** The key of every link no rule allows, sorted. */
export function linkBreaks(graph: Graph, rules: LinkRules): string[] {
  const typeOf = typeOfIn(graph);
  const keys = graph.edges
    .filter((e) => !allows(rules, e.rel, typeOf(e.from), typeOf(e.to)))
    .map((e) => linkKey(e.from, e.rel, e.to));
  return [...new Set(keys)].sort();
}

/** Each cycle formed by links of one verb, as the IDs around it (first ID repeated at the end). */
export function cycles(graph: Graph, rel: string): string[][] {
  const next = new Map<string, string[]>();
  for (const e of graph.edges) {
    if (e.rel === rel) next.set(e.from, [...(next.get(e.from) ?? []), e.to]);
  }
  const found: string[][] = [];
  const done = new Set<string>();
  const onPath: string[] = [];
  const visit = (id: string) => {
    const at = onPath.indexOf(id);
    if (at >= 0) {
      found.push([...onPath.slice(at), id]);
      return;
    }
    if (done.has(id)) return;
    onPath.push(id);
    for (const to of next.get(id) ?? []) visit(to);
    onPath.pop();
    done.add(id);
  };
  for (const id of [...next.keys()].sort()) visit(id);
  return found;
}

/**
 * Everything the card lint fails on: a break not in the baseline, a baseline entry that is no
 * longer a break (remove it), and a cycle in an acyclic verb.
 */
export function linkProblems(
  graph: Graph,
  rules: LinkRules,
  baseline: readonly string[],
): string[] {
  const breaks = linkBreaks(graph, rules);
  const known = new Set(baseline);
  const now = new Set(breaks);
  const problems = [
    ...breaks
      .filter((k) => !known.has(k))
      .map((k) => `link ${k} breaks the link rules (see the rules table in the cards README)`),
    ...[...known]
      .filter((k) => !now.has(k))
      .sort()
      .map((k) => `baseline entry ${k} is no longer a break; remove it from the baseline`),
  ];
  for (const rel of rules.acyclic) {
    for (const loop of cycles(graph, rel)) problems.push(`${rel} cycle: ${loop.join(" → ")}`);
  }
  return problems;
}
