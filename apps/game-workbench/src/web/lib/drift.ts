/**
 * Card drift (IDEA-062): for each plan step, the cards it builds and the rulings they reach, and
 * which of those cards changed in git since the step merged. The parsing and matching are pure
 * functions; `loadDrift` reads the plans and git.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { buildGraph } from "./cards.ts";
import { repoRoot } from "./content.ts";
import type { Graph } from "./graph-types.ts";

export type PlanStep = {
  app: string;
  /** The plan's ID from its file name (`C1` for `C1-engine-core.md`), or null for `plan.md`. */
  plan: string | null;
  /** The plan file, relative to the repo root. */
  file: string;
  step: string;
  title: string;
  /** The IDs on the step's `Builds:` lines, or, when it has none, every ID the step's text cites. */
  ids: string[];
  /** True when the IDs come from `Builds:` lines (DEC-355). */
  builds: boolean;
};

export type Commit = { sha: string; date: string; subject: string };

/** One commit that touched card files; `files` maps a card ID to A (added), M or D. */
export type CardCommit = Commit & { files: Record<string, string> };

export type History = {
  /** Every first-parent commit, newest first. */
  commits: Commit[];
  /** The first-parent commits that touched a card file, newest first. */
  cardCommits: CardCommit[];
};

export type CardChange = {
  id: string;
  /** How the card is tied to the step: `built`, `reached`, or a link into one of them. */
  why: string;
  added: boolean;
  /** Oldest first. */
  commits: Commit[];
};

export type StepDrift = {
  step: PlanStep;
  merge: Commit | null;
  /** The step's IDs that are cards; a `Builds:` ID with no card (deleted) is kept. */
  cards: string[];
  /** The step's cards plus everything they reach by `needs` or `uses`. */
  watched: string[];
  changes: CardChange[];
};

const ID = /\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+\b/g;
const STEP_HEADING = /^###\s+Step\s+([\w.-]+)\s*:\s*(.*)$/;
const BUILDS_LINE = /^\s*(?:[-*]\s+)?\**Builds:?\**:?\s*(.*)$/;
const BUILD_TYPES = /^(feat|fix|refactor|perf|chore|test|build)\b/;
const REACH_RELS = ["needs", "uses"];
/** A changed card linking a watched card by one of these may change what the step built. */
const CHANGE_RELS = ["refines", "affects", "conflicts"];

/** The `### Step <id>: <title>` sections of one plan, each up to the next `##`/`###` heading. */
export function planSteps(file: string, text: string, app: string): PlanStep[] {
  const plan = /^([A-Z]+\d+[a-z]?)-/.exec(path.basename(file))?.[1] ?? null;
  const steps: PlanStep[] = [];
  let current: { step: string; title: string; lines: string[] } | null = null;
  const close = () => {
    if (!current) return;
    const buildLines = current.lines.flatMap((l) => BUILDS_LINE.exec(l)?.[1] ?? []);
    const source = buildLines.length > 0 ? buildLines : current.lines;
    const ids = [...new Set(source.join("\n").match(ID) ?? [])];
    steps.push({
      app,
      plan,
      file,
      step: current.step,
      title: current.title,
      ids,
      builds: buildLines.length > 0,
    });
    current = null;
  };
  for (const line of text.split("\n")) {
    const heading = STEP_HEADING.exec(line);
    if (heading || /^#{1,3}\s/.test(line)) close();
    if (heading)
      current = { step: heading[1] as string, title: (heading[2] as string).trim(), lines: [] };
    else current?.lines.push(line);
  }
  close();
  return steps;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The commit that merged the step: the oldest build commit (not `docs`) whose subject names the
 * plan and step (`C1 step 6`, `W7-step-2`) or, for an app's `plan.md`, the app scope and step.
 */
export function mergeCommit(step: PlanStep, commits: Commit[]): Commit | null {
  const id = `${escapeRe(step.step)}(?![\\w.])`;
  const named = step.plan
    ? new RegExp(`\\b${escapeRe(step.plan)}[- ]step[- ]${id}`, "i")
    : new RegExp(`^\\w+\\(${escapeRe(step.app)}\\).*\\bstep ${id}`, "i");
  let found: Commit | null = null;
  for (const c of commits) if (BUILD_TYPES.test(c.subject) && named.test(c.subject)) found = c;
  return found;
}

/** The given IDs plus every node they reach by `needs` or `uses`, over any number of hops. */
export function watchedCards(graph: Graph, ids: string[]): Set<string> {
  const out = new Map<string, string[]>();
  for (const e of graph.edges) {
    if (REACH_RELS.includes(e.rel)) out.set(e.from, [...(out.get(e.from) ?? []), e.to]);
  }
  const seen = new Set(ids);
  const stack = [...ids];
  while (stack.length > 0) {
    for (const to of out.get(stack.pop() as string) ?? []) {
      if (seen.has(to)) continue;
      seen.add(to);
      stack.push(to);
    }
  }
  return seen;
}

/**
 * The cards changed since the step merged: the ones it builds, the ones they reach, and the ones
 * that refine, affect or conflict with either.
 */
export function stepDrift(graph: Graph, step: PlanStep, history: History): StepDrift {
  const cards = step.builds ? step.ids : step.ids.filter((id) => graph.nodes[id]?.kind === "card");
  const built = new Set(cards);
  const watched = watchedCards(graph, cards);
  const merge = mergeCommit(step, history.commits);
  const changes = new Map<string, CardChange>();
  if (merge) {
    const order = new Map(history.commits.map((c, i) => [c.sha, i]));
    const mergedAt = order.get(merge.sha) as number;
    // Newest first, so walk backwards to list each card's commits oldest first.
    for (const c of [...history.cardCommits].reverse()) {
      const at = order.get(c.sha);
      if (at === undefined || at >= mergedAt) continue;
      for (const [id, status] of Object.entries(c.files)) {
        const why = reason(graph, id, built, watched);
        if (!why) continue;
        const change = changes.get(id) ?? { id, why, added: false, commits: [] };
        if (status === "A") change.added = true;
        change.commits.push({ sha: c.sha, date: c.date, subject: c.subject });
        changes.set(id, change);
      }
    }
  }
  const byId = (a: string, b: string) => a.localeCompare(b, "en", { numeric: true });
  return {
    step,
    merge,
    cards,
    watched: [...watched].sort(byId),
    changes: [...changes.values()].sort((a, b) => byId(a.id, b.id)),
  };
}

function reason(graph: Graph, id: string, built: Set<string>, watched: Set<string>) {
  if (built.has(id)) return "built";
  if (watched.has(id)) return "reached";
  const node = graph.nodes[id];
  if (node?.kind !== "card") return null;
  const link = node.links.find((l) => CHANGE_RELS.includes(l.rel) && watched.has(l.to));
  return link ? `${link.rel} ${link.to}` : null;
}

/**
 * The environment for git with every `GIT_*` variable dropped. Inside a git hook (the pre-commit
 * `pnpm check`) GIT_DIR and GIT_INDEX_FILE are set and would override `-C`.
 */
export function gitEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith("GIT_")) delete env[k];
  return { ...env, ...extra };
}

/** Reads every first-parent commit, and the card files each one touched, newest first. */
export function readHistory(root: string, cardsRel: string): History {
  const git = (args: string[]) =>
    execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      env: gitEnv(),
      maxBuffer: 256 * 1024 * 1024,
    });
  const commits = git(["log", "--first-parent", "--date=short", "--format=%H%x09%ad%x09%s"])
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha = "", date = "", ...subject] = line.split("\t");
      return { sha, date, subject: subject.join("\t") };
    });
  const bySha = new Map(commits.map((c) => [c.sha, c]));
  const cardCommits: CardCommit[] = [];
  const log = git([
    "log",
    "--first-parent",
    "--no-renames",
    "--format=%x01%H",
    "--name-status",
    "--",
    cardsRel,
  ]);
  for (const block of log.split("\x01").filter((b) => b.trim())) {
    const [sha = "", ...lines] = block.trim().split("\n");
    const commit = bySha.get(sha);
    if (!commit) throw new Error(`graph drift: card commit ${sha} is not in the first-parent log`);
    const files: Record<string, string> = {};
    for (const line of lines) {
      const [status = "", file = ""] = line.split("\t");
      if (path.posix.dirname(file) !== cardsRel || !file.endsWith(".md")) continue;
      const id = path.posix.basename(file, ".md");
      if (id !== "README") files[id] = status.charAt(0);
    }
    cardCommits.push({ ...commit, files });
  }
  return { commits, cardCommits };
}

/** Every step of every `apps/<app>/plans/*.md`. */
export function loadPlanSteps(root = repoRoot()): PlanStep[] {
  const apps = path.join(root, "apps");
  return readdirSync(apps, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => {
      const dir = path.join(apps, d.name, "plans");
      let files: string[];
      try {
        files = readdirSync(dir).filter((f) => f.endsWith(".md"));
      } catch (e) {
        // An app with no plans folder has no steps; any other read error is real.
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw e;
      }
      return files
        .sort()
        .flatMap((f) =>
          planSteps(
            path.posix.join("apps", d.name, "plans", f),
            readFileSync(path.join(dir, f), "utf8"),
            d.name,
          ),
        );
    });
}

export function loadDrift(root = repoRoot()): { drift: StepDrift[]; graph: Graph } {
  const { graph } = buildGraph();
  const history = readHistory(root, "research/game-design/cards");
  const drift = loadPlanSteps(root)
    .filter((s) => s.ids.some((id) => graph.nodes[id]?.kind === "card"))
    .map((s) => stepDrift(graph, s, history));
  return { drift, graph };
}

const commitLabel = (c: Commit) =>
  `${c.date} ${/\(#(\d+)\)$/.exec(c.subject)?.[0].slice(1, -1) ?? c.sha.slice(0, 8)}`;

/** The text `pnpm graph drift` prints: each merged step with changed cards, then a summary. */
export function driftText(drift: StepDrift[], graph: Graph): string {
  const lines: string[] = [];
  const unmerged = drift.filter((d) => !d.merge);
  const changed = drift.filter((d) => d.changes.length > 0);
  for (const d of changed) {
    const s = d.step;
    const merge = d.merge as Commit;
    const what = s.builds
      ? `builds ${d.cards.length}`
      : `cites ${d.cards.length} (no Builds: line)`;
    lines.push(
      `${s.app} ${s.plan ? `${s.plan} ` : ""}step ${s.step}: ${s.title}`,
      `  merged ${commitLabel(merge)} ${merge.sha.slice(0, 8)}; ${what}, watches ${d.watched.length}; ${d.changes.length} changed since`,
    );
    for (const c of d.changes) {
      const node = graph.nodes[c.id];
      const state = node?.kind === "card" ? node.status : "deleted";
      const title = node?.kind === "card" ? node.title : "";
      lines.push(
        `    ${c.id}  [${state}${c.added ? ", new" : ""}] ${c.why}; ${c.commits.map(commitLabel).join(", ")}`,
        ...(title ? [`      ${title}`] : []),
      );
    }
    lines.push("");
  }
  if (unmerged.length > 0) {
    lines.push(`Steps with cards and no merge commit (${unmerged.length}):`);
    for (const d of unmerged) lines.push(`  ${d.step.file}  step ${d.step.step}: ${d.step.title}`);
    lines.push("");
  }
  const cards = changed.reduce((n, d) => n + d.changes.length, 0);
  lines.push(
    `${drift.length} steps with cards, ${drift.length - unmerged.length} merged, ${changed.length} with ${cards} changed cards`,
  );
  return lines.join("\n");
}
