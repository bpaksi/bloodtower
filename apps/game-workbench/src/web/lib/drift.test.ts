import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  type Commit,
  driftText,
  gitEnv,
  type History,
  loadDrift,
  mergeCommit,
  type PlanStep,
  planSteps,
  readHistory,
  stepDrift,
  watchedCards,
} from "./drift.ts";
import type { Card, Graph } from "./graph-types.ts";
import { RELS } from "./graph-types.ts";

const here = path.dirname(fileURLToPath(import.meta.url));

function graphOf(specs: Record<string, { type: string; links?: [string, string][] }>): Graph {
  const nodes: Graph["nodes"] = {};
  const edges: Graph["edges"] = [];
  for (const [id, s] of Object.entries(specs)) {
    const c: Card = {
      id,
      type: s.type as Card["type"],
      title: `${id} title`,
      status: "decided",
      layer: null,
      by: null,
      links: (s.links ?? []).map(([rel, to]) => ({ rel, to })),
      sources: [],
      body: "",
      bodyHtml: "",
      file: `${id}.md`,
      data: {},
    };
    nodes[id] = { kind: "card", ...c };
    for (const l of c.links) edges.push({ from: id, to: l.to, rel: l.rel });
  }
  return { nodes, edges, rels: RELS };
}

const PLAN = `# C1 plan

## Steps

### Step 5: Protocol v2
- Uses R-SES-4 and DEC-100.

### Step 6: Session setup
- The session loop (MEC-039) pauses on a lost tower (DEC-155, R-SES-11).

### Step 6.2: Later part
- Builds: SCR-021, UI-001
- Mentions DEC-999, which Builds: overrides.

## Results
- Step 6 (2026-10-23): DEC-200.
`;

describe("planSteps", () => {
  const steps = planSteps("apps/bloodtower/plans/C1-engine-core.md", PLAN, "bloodtower");

  it("reads each step, its plan ID and the IDs it cites, up to the next heading", () => {
    expect(steps.map((s) => [s.plan, s.step, s.title, s.builds])).toEqual([
      ["C1", "5", "Protocol v2", false],
      ["C1", "6", "Session setup", false],
      ["C1", "6.2", "Later part", true],
    ]);
    expect(steps[1]?.ids).toEqual(["MEC-039", "DEC-155", "R-SES-11"]);
  });

  it("takes only the Builds: line's IDs when a step has one", () => {
    expect(steps[2]?.ids).toEqual(["SCR-021", "UI-001"]);
  });

  it("has no plan ID for an app's plan.md", () => {
    expect(planSteps("apps/x/plans/plan.md", PLAN, "x")[0]?.plan).toBeNull();
  });
});

const commit = (sha: string, subject: string, date = "2026-10-23"): Commit => ({
  sha,
  date,
  subject,
});

describe("mergeCommit", () => {
  const [, six, sixTwo] = planSteps("apps/bloodtower/plans/C1-engine-core.md", PLAN, "bloodtower");
  const commits = [
    commit("e", "fix(bloodtower): C1 step 6 review fix (#210)"),
    commit("d", "feat(bloodtower): C1 step 6.2 later part (#209)"),
    commit("c", "docs(bloodtower): approve C1 step 6 (#208)"),
    commit("b", "feat(bloodtower-engine): C1 step 6 session setup (#203)"),
    commit("a", "feat(bloodtower): C1 step 60 something (#201)"),
  ];

  it("finds the oldest build commit naming the plan and step, never a docs commit", () => {
    expect(mergeCommit(six as PlanStep, commits)?.sha).toBe("b");
  });

  it("tells step 6 from 6.2 and 60", () => {
    expect(mergeCommit(sixTwo as PlanStep, commits)?.sha).toBe("d");
    expect(mergeCommit(six as PlanStep, commits.slice(0, 2))?.sha).toBe("e");
  });

  it("matches W7-step-2, and the app scope for a plan.md step", () => {
    const w7 = { ...(six as PlanStep), plan: "W7", step: "2" };
    expect(mergeCommit(w7, [commit("x", "feat(bloodtower): W7-step-2: map (#248)")])?.sha).toBe(
      "x",
    );
    const wb = { ...(six as PlanStep), plan: null, app: "game-workbench", step: "7b" };
    expect(
      mergeCommit(wb, [commit("y", "feat(game-workbench): sounds (step 7b) (#145)")])?.sha,
    ).toBe("y");
    expect(mergeCommit(wb, [commit("z", "feat(tower-poc): sounds (step 7b) (#1)")])).toBeNull();
  });
});

// The motivating case (IDEA-062): step 6 built on DEC-155; DEC-275 later refined it.
const graph = graphOf({
  "MEC-039": { type: "mechanic", links: [["needs", "DEC-155"]] },
  "DEC-155": { type: "decision", links: [["uses", "DEC-154"]] },
  "DEC-154": { type: "decision" },
  "DEC-275": { type: "decision", links: [["refines", "DEC-155"]] },
  "DEC-305": { type: "decision", links: [["uses", "DEC-155"]] },
  "DEC-400": { type: "decision" },
});
const step: PlanStep = {
  app: "bloodtower",
  plan: "C1",
  file: "apps/bloodtower/plans/C1-engine-core.md",
  step: "6",
  title: "Session setup",
  ids: ["MEC-039", "R-SES-11"],
  builds: false,
};
const history: History = {
  commits: [
    commit("c3", "docs(game-design): park DEC-155 (#281)", "2026-10-27"),
    commit("c2", "docs(game-design): reopen DEC-155 (#259)", "2026-10-26"),
    commit("m", "feat(bloodtower-engine): C1 step 6 session setup (#203)"),
    commit("c1", "docs(game-design): rule DEC-155 (#181)", "2026-10-22"),
  ],
  cardCommits: [],
};
history.cardCommits = [
  { ...(history.commits[0] as Commit), files: { "DEC-155": "M", "DEC-400": "M" } },
  { ...(history.commits[1] as Commit), files: { "DEC-275": "A", "DEC-305": "A", "DEC-154": "M" } },
  { ...(history.commits[3] as Commit), files: { "DEC-155": "A", "MEC-039": "A" } },
];

describe("watchedCards and stepDrift", () => {
  it("watches the step's cards and what they reach by needs or uses, over hops", () => {
    expect([...watchedCards(graph, ["MEC-039"])].sort()).toEqual(["DEC-154", "DEC-155", "MEC-039"]);
  });

  it("lists cards changed after the merge: reached, and refining a watched card", () => {
    const d = stepDrift(graph, step, history);
    expect(d.merge?.sha).toBe("m");
    expect(d.cards).toEqual(["MEC-039"]);
    expect(d.changes.map((c) => [c.id, c.why, c.added, c.commits.map((x) => x.sha)])).toEqual([
      ["DEC-154", "reached", false, ["c2"]],
      ["DEC-155", "reached", false, ["c3"]],
      ["DEC-275", "refines DEC-155", true, ["c2"]],
    ]);
  });

  it("lists nothing when the step has no merge commit", () => {
    const d = stepDrift(graph, { ...step, step: "7" }, history);
    expect(d.merge).toBeNull();
    expect(d.changes).toEqual([]);
  });

  it("keeps a Builds: ID with no card, so a deleted card still shows", () => {
    const d = stepDrift(
      graph,
      { ...step, ids: ["DEC-500"], builds: true },
      {
        ...history,
        cardCommits: [{ ...(history.commits[0] as Commit), files: { "DEC-500": "D" } }],
      },
    );
    expect(d.changes.map((c) => [c.id, c.why])).toEqual([["DEC-500", "built"]]);
    expect(driftText([d], graph)).toContain("DEC-500  [deleted] built; 2026-10-27 #281");
  });

  it("prints each changed card with its state, why and commits, then a summary", () => {
    const text = driftText([stepDrift(graph, step, history)], graph);
    expect(text).toContain("bloodtower C1 step 6: Session setup");
    expect(text).toContain("cites 1 (no Builds: line), watches 3; 3 changed since");
    expect(text).toContain("DEC-275  [decided, new] refines DEC-155; 2026-10-26 #259");
    expect(text.split("\n").at(-1)).toBe("1 steps with cards, 1 merged, 1 with 3 changed cards");
  });
});

describe("readHistory on a small git repo", () => {
  it("reads first-parent commits and the card files each one touched", () => {
    const root = mkdtempSync(path.join(tmpdir(), "drift-"));
    try {
      const git = (...args: string[]) =>
        execFileSync("git", ["-C", root, ...args], {
          encoding: "utf8",
          // gitEnv drops the hook's GIT_DIR, so nothing here can reach the real repo.
          env: gitEnv({
            GIT_AUTHOR_NAME: "t",
            GIT_AUTHOR_EMAIL: "t@example.com",
            GIT_AUTHOR_DATE: "2026-10-23T10:00:00",
            GIT_COMMITTER_NAME: "t",
            GIT_COMMITTER_EMAIL: "t@example.com",
            GIT_COMMITTER_DATE: "2026-10-23T10:00:00",
            GIT_CONFIG_GLOBAL: "/dev/null",
          }),
        });
      git("init", "-q", "-b", "main");
      expect(git("rev-parse", "--absolute-git-dir").trim()).toBe(
        path.join(realpathSync(root), ".git"),
      );
      const cards = path.join(root, "cards");
      mkdirSync(cards);
      writeFileSync(path.join(cards, "DEC-001.md"), "a");
      writeFileSync(path.join(cards, "README.md"), "a");
      git("add", ".");
      git("commit", "-q", "-m", "docs: first (#1)");
      writeFileSync(path.join(root, "code.ts"), "x");
      git("add", ".");
      git("commit", "-q", "-m", "feat(app): C1 step 1 (#2)");
      writeFileSync(path.join(cards, "DEC-001.md"), "b");
      writeFileSync(path.join(cards, "DEC-002.md"), "b");
      git("add", ".");
      git("commit", "-q", "-m", "docs: second (#3)");
      const h = readHistory(root, "cards");
      expect(h.commits.map((c) => c.subject)).toEqual([
        "docs: second (#3)",
        "feat(app): C1 step 1 (#2)",
        "docs: first (#1)",
      ]);
      expect(h.commits[0]?.date).toBe("2026-10-23");
      expect(h.cardCommits.map((c) => c.files)).toEqual([
        { "DEC-001": "M", "DEC-002": "A" },
        { "DEC-001": "A" },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("drift on the real plans and cards", () => {
  // Spawns git and node over the whole history, which can pass the 5000 ms default under load.
  it("flags DEC-155 and DEC-275 for C1 step 6, as the CLI prints", { timeout: 60_000 }, () => {
    const { drift } = loadDrift();
    const six = drift.find((d) => d.step.plan === "C1" && d.step.step === "6");
    const ids = six?.changes.map((c) => c.id) ?? [];
    expect(ids).toContain("DEC-155");
    expect(ids).toContain("DEC-275");
    const out = execFileSync("node", [path.join(here, "../cli/graph.ts"), "drift"], {
      encoding: "utf8",
    });
    expect(out).toContain("bloodtower C1 step 6: Session and game setup on the core");
    expect(out).toMatch(/^\d+ steps with cards, \d+ merged/m);
  });
});
