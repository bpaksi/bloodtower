/**
 * The engine map: the loop cards' railroad blocks (DEC-276) read into a tree, the loop stack they
 * form through their call nodes, and the same nodes read as the event-sourced reducer the
 * bloodtower spec builds (D32 to D38). No Node imports, so the page's client part can use it.
 */
import type { Card } from "./graph-types.ts";

/** The node kinds a railroad uses (DEC-268, DEC-280). */
export const NODE_KINDS = [
  "story",
  "roll",
  "check",
  "change",
  "board",
  "prompt",
  "tower",
  "call",
] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export type RNode = {
  t: "node";
  /** The node number, `.3` in the card, short for <loop>.3. */
  num: number;
  kind: string;
  label: string;
  /** The home card first (DEC-277), then the other IDs it uses. */
  ids: string[];
  /** A `check`'s branches; empty for every other node and for a check that only loops back. */
  tracks: Track[];
};
export type Track = { name: string; items: Item[] };
export type Repeat = { t: "repeat"; items: Item[] };
export type Item = RNode | Repeat;
export type Section = { name: string; items: Item[] };

export type Loop = {
  id: string;
  title: string;
  status: string;
  /** The loop template rows written above the diagram: Owner, Enter, Body… (DEC-143). */
  fields: { name: string; text: string }[];
  sections: Section[];
  /** Every node, top to bottom. */
  nodes: RNode[];
  /** Loop cards this loop calls, in order, once each. */
  children: string[];
};

/** How a node kind reads in the event model: what the reducer does when it reaches one. */
export type Role = "wait" | "effect" | "pure" | "frame";

export const KIND_ROLE: Record<NodeKind, { role: Role; reads: string }> = {
  prompt: {
    role: "wait",
    reads:
      "The reducer stops here and offers actions in the iPad views. The next `press` event (act{promptId, actionId}) resumes it; a later press on the same prompt is logged with winner: false.",
  },
  board: {
    role: "effect",
    reads: "An effect: the host sends the projected Story board view (project(state, board)).",
  },
  story: {
    role: "effect",
    reads:
      "An effect: the host plays the story hook (dialogs, stills, avatars). A trigger hook is also a domain event the story's hooks match on.",
  },
  tower: {
    role: "effect",
    reads:
      "An effect: command{capabilityId, params}. The host runs it and feeds the outcome back as an event (confirmed, indeterminate, failed). Replay never re-sends it.",
  },
  roll: {
    role: "pure",
    reads: "Runs inside step(): a seeded draw from @dark-tower/rng (game seed + event sequence).",
  },
  change: { role: "pure", reads: "Runs inside step(): a state change, no I/O." },
  check: {
    role: "pure",
    reads: "Runs inside step(): a branch read from the state (or from the press that resumed it).",
  },
  call: {
    role: "frame",
    reads: "Pushes the child loop's frame onto the stack; its result is handed up when it pops.",
  },
};

const ID_TOKEN = /^[A-Z]+(?:-[A-Z]+)*-[A-Z]?\d+[a-z]?$/;
const NODE_LINE = /^\.(\d+)\s+(\S+)\s+(.*)$/;
const FIELD_LINE = /^- \*\*([^*]+?):\*\*\s*(.*)$/;

/** Splits a node's text into its label and the trailing card IDs. */
export function splitLabel(rest: string): { label: string; ids: string[] } {
  const tokens = rest.trim().split(/\s+/);
  const ids: string[] = [];
  while (tokens.length > 1 && ID_TOKEN.test(tokens[tokens.length - 1] as string)) {
    ids.unshift(tokens.pop() as string);
  }
  return { label: tokens.join(" "), ids };
}

type Line = { indent: number; text: string; no: number };

/** Reads one `railroad` block (DEC-276). Throws with the line number on a line it cannot read. */
export function parseRailroad(block: string): Section[] {
  const lines: Line[] = block
    .split("\n")
    .map((raw, i) => ({
      indent: raw.length - raw.trimStart().length,
      text: raw.trim(),
      no: i + 1,
    }))
    .filter((l) => l.text !== "");
  const sections: Section[] = [];
  let i = 0;

  // Reads the items at one indent, from line i, until a line sits shallower.
  const items = (): Item[] => {
    const out: Item[] = [];
    const first = lines[i];
    if (!first) return out;
    const at = first.indent;
    while (i < lines.length && (lines[i] as Line).indent === at) {
      const line = lines[i] as Line;
      if (line.text === "repeat") {
        i++;
        out.push({ t: "repeat", items: deeper(at) });
        continue;
      }
      const m = NODE_LINE.exec(line.text);
      if (!m) throw new Error(`railroad line ${line.no}: cannot read "${line.text}"`);
      i++;
      const { label, ids } = splitLabel(m[3] as string);
      const node: RNode = {
        t: "node",
        num: Number(m[1]),
        kind: m[2] as string,
        label,
        ids,
        tracks: [],
      };
      const next = lines[i];
      if (next && next.indent > at && next.text.startsWith("track ")) {
        const trackAt = next.indent;
        while (i < lines.length && (lines[i] as Line).indent === trackAt) {
          const t = lines[i] as Line;
          if (!t.text.startsWith("track ")) {
            throw new Error(`railroad line ${t.no}: expected a track, found "${t.text}"`);
          }
          i++;
          node.tracks.push({ name: t.text.slice(6).trim(), items: deeper(trackAt) });
        }
      }
      out.push(node);
    }
    return out;
  };
  const deeper = (than: number): Item[] => {
    const next = lines[i];
    return next && next.indent > than ? items() : [];
  };

  while (i < lines.length) {
    const line = lines[i] as Line;
    if (line.indent !== 0 || NODE_LINE.test(line.text)) {
      throw new Error(`railroad line ${line.no}: expected a section, found "${line.text}"`);
    }
    i++;
    sections.push({ name: line.text, items: deeper(0) });
  }
  return sections;
}

/** Every node in the items, top to bottom, tracks included. */
export function flatNodes(items: Item[]): RNode[] {
  const out: RNode[] = [];
  for (const it of items) {
    if (it.t === "repeat") out.push(...flatNodes(it.items));
    else {
      out.push(it);
      for (const tr of it.tracks) out.push(...flatNodes(tr.items));
    }
  }
  return out;
}

export function railroadBlock(body: string): string | null {
  const m = /```railroad\n([\s\S]*?)```/.exec(body);
  return m ? (m[1] as string) : null;
}

function fields(body: string): Loop["fields"] {
  const out: Loop["fields"] = [];
  for (const line of body.split("\n")) {
    const m = FIELD_LINE.exec(line.trim());
    if (m) out.push({ name: m[1] as string, text: m[2] as string });
  }
  return out;
}

/** Every card with a railroad block, read as a loop, plus one message per block that does not read. */
export function loadLoops(cards: Card[]): { loops: Loop[]; errors: string[] } {
  const withBlock = cards
    .map((c) => ({ c, block: railroadBlock(c.body) }))
    .filter((x): x is { c: Card; block: string } => x.block !== null);
  const loopIds = new Set(withBlock.map((x) => x.c.id));
  const loops: Loop[] = [];
  const errors: string[] = [];
  for (const { c, block } of withBlock) {
    let sections: Section[];
    try {
      sections = parseRailroad(block);
    } catch (e) {
      errors.push(`${c.id}: ${(e as Error).message}`);
      continue;
    }
    const nodes = sections.flatMap((s) => flatNodes(s.items));
    const children: string[] = [];
    for (const n of nodes) {
      const target = n.kind === "call" ? n.ids.find((id) => loopIds.has(id)) : undefined;
      if (target && target !== c.id && !children.includes(target)) children.push(target);
    }
    loops.push({
      id: c.id,
      title: c.title,
      status: c.status,
      fields: fields(c.body),
      sections,
      nodes,
      children,
    });
  }
  return { loops, errors };
}

/** The loop a call node enters: its first ID that is a loop card, if any. */
export function callTarget(node: RNode, loopIds: ReadonlySet<string>): string | null {
  return node.ids.find((id) => loopIds.has(id)) ?? null;
}

/** `key` is the chain of loops down to this row, unique even when a loop shows twice. */
export type StackRow = { id: string; depth: number; via: string | null; key: string };

/**
 * The loop stack as a tree, depth first from each root (a loop no other loop calls). A loop
 * called from several places shows under each caller; `via` names the calling node.
 */
export function loopTree(loops: Loop[]): StackRow[] {
  const byId = new Map(loops.map((l) => [l.id, l]));
  const called = new Set(loops.flatMap((l) => l.children));
  const roots = loops
    .filter((l) => !called.has(l.id))
    .sort((a, b) => b.children.length - a.children.length || a.id.localeCompare(b.id));
  const rows: StackRow[] = [];
  const walk = (id: string, depth: number, via: string | null, path: string[]) => {
    rows.push({ id, depth, via, key: [...path, id].join(">") });
    const loop = byId.get(id);
    if (!loop || path.includes(id)) return;
    for (const n of loop.nodes) {
      const t = n.kind === "call" ? n.ids.find((x) => byId.has(x)) : undefined;
      if (t && t !== id) walk(t, depth + 1, `${id}.${n.num}`, [...path, id]);
    }
  };
  for (const r of roots) walk(r.id, 0, null, []);
  return rows;
}

export type Trigger = { loop: string; num: number; name: string; event: string };

/**
 * The story trigger nodes (DEC-288, DEC-290): story nodes that cite DEC-290, plus the set piece's
 * end hook that serves the "set piece ends" trigger (DEC-297). In the event model each one is a
 * domain event the active chapter's hooks match on, once per game unless marked every time (DEC-291).
 */
export function triggers(loops: Loop[]): Trigger[] {
  const out: Trigger[] = [];
  for (const l of loops) {
    for (const n of l.nodes) {
      if (n.kind !== "story") continue;
      let name: string | null = null;
      if (n.ids.includes("DEC-297")) name = "set piece ends";
      else if (n.ids.includes("DEC-290")) name = n.label.replace(/^Trigger hook:\s*/i, "");
      if (name) {
        const event = name
          .toLowerCase()
          .replace(/[^a-z]+/g, "-")
          .replace(/^-|-$/g, "");
        out.push({ loop: l.id, num: n.num, name, event });
      }
    }
  }
  return out;
}

/** One instruction of a loop compiled for the walkthrough. */
export type Op =
  | { op: "section"; name: string }
  | { op: "node"; node: RNode }
  | { op: "branch"; node: RNode; targets: { name: string; pc: number }[] }
  /** A repeat's last check: round again from `start`, or go on. */
  | { op: "again"; node: RNode | null; start: number }
  | { op: "jump"; to: number };

/** Compiles a loop's sections into a flat program with jumps, so a walkthrough can keep one pc per frame. */
export function compile(sections: Section[]): Op[] {
  const ops: Op[] = [];
  const emit = (items: Item[]) => {
    for (const it of items) {
      if (it.t === "repeat") {
        const start = ops.length;
        const last = it.items[it.items.length - 1];
        const loopsBack =
          last && last.t === "node" && last.kind === "check" && last.tracks.length === 0;
        emit(loopsBack ? it.items.slice(0, -1) : it.items);
        ops.push({ op: "again", node: loopsBack ? (last as RNode) : null, start });
      } else if (it.kind === "check" && it.tracks.length > 0) {
        const branch: Op = { op: "branch", node: it, targets: [] };
        ops.push(branch);
        const jumps: { op: "jump"; to: number }[] = [];
        for (const tr of it.tracks) {
          branch.targets.push({ name: tr.name, pc: ops.length });
          emit(tr.items);
          const j = { op: "jump" as const, to: -1 };
          ops.push(j);
          jumps.push(j);
        }
        for (const j of jumps) j.to = ops.length;
      } else {
        ops.push({ op: "node", node: it });
      }
    }
  };
  for (const s of sections) {
    ops.push({ op: "section", name: s.name });
    emit(s.items);
  }
  return ops;
}

/** Per loop: how many nodes of each role, the wait points being where the reducer stops. */
export function roleCounts(loop: Loop): Record<Role | "other", number> {
  const out = { wait: 0, effect: 0, pure: 0, frame: 0, other: 0 };
  for (const n of loop.nodes) {
    const r = KIND_ROLE[n.kind as NodeKind]?.role;
    out[r ?? "other"]++;
  }
  return out;
}

/** The trimmed card the page sends to the browser for its card panel. */
export type CardLite = {
  id: string;
  type: string;
  title: string;
  status: string;
  layer: string | null;
  html: string;
  links: { rel: string; to: string; note?: string }[];
};

export function liteCards(cards: Card[]): CardLite[] {
  return cards.map((c) => ({
    id: c.id,
    type: c.type,
    title: c.title,
    status: c.status,
    layer: c.layer,
    html: c.bodyHtml,
    links: c.links.map((l) =>
      l.note ? { rel: l.rel, to: l.to, note: l.note } : { rel: l.rel, to: l.to },
    ),
  }));
}

/**
 * Which loop nodes each card is cited on, from the node IDs and the loop cards' own links. A card
 * with no direct citation is placed by its links: an idea that links a cited card, or that a cited
 * card links, gets that card's nodes as "near".
 */
export function citations(
  loops: Loop[],
  cards: Card[],
): Map<string, { direct: string[]; near: string[] }> {
  const direct = new Map<string, Set<string>>();
  const add = (id: string, where: string) => {
    const s = direct.get(id) ?? new Set<string>();
    s.add(where);
    direct.set(id, s);
  };
  for (const l of loops) {
    for (const n of l.nodes) for (const id of n.ids) add(id, `${l.id}.${n.num}`);
  }
  const out = new Map<string, { direct: string[]; near: string[] }>();
  for (const [id, s] of direct) out.set(id, { direct: [...s], near: [] });
  const linkedFrom = new Map<string, string[]>();
  for (const c of cards) {
    for (const l of c.links) linkedFrom.set(l.to, [...(linkedFrom.get(l.to) ?? []), c.id]);
  }
  for (const c of cards) {
    const near = new Set<string>();
    const neighbours = [...c.links.map((l) => l.to), ...(linkedFrom.get(c.id) ?? [])];
    for (const nb of neighbours) for (const w of direct.get(nb) ?? []) near.add(w);
    const entry = out.get(c.id) ?? { direct: [], near: [] };
    entry.near = [...near].filter((w) => !entry.direct.includes(w));
    if (entry.direct.length || entry.near.length) out.set(c.id, entry);
  }
  return out;
}
