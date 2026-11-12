// `pnpm cleanup:worktrees [--apply] [--json]`: finds the local worktrees and branches whose work is
// safely on `origin/main` and, with `--apply`, removes them (docs/sdlc.md, "Cleaning up").
//
// It covers what `pnpm wt:rm` cannot: Desktop-app session worktrees (`.claude/worktrees/*`),
// branches with no worktree, detached review worktrees, and squash-merged PRs whose branch tip
// is not an ancestor of main. Without `--apply` it only reports.
//
// A row is SAFE only when nothing would be lost: clean, no open PR, and either the tip is a merged
// PR's head (or inside it) or the branch holds no commit beyond `origin/main`. Everything else is KEEP
// with the reason. It never touches `main`, the main checkout, the worktree it runs in, or the remote.
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const MAIN = "main";
const ORIGIN_MAIN = `origin/${MAIN}`;

const run = (cmd, cwd, ...args) =>
  execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const git = (cwd, ...args) => run("git", cwd, ...args);

/** Parses `git worktree list --porcelain` into `{path, head, branch}`; `branch` is null when detached. */
export const parseWorktrees = (porcelain) =>
  porcelain
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const entry = { path: "", head: "", branch: null };
      for (const line of block.split("\n")) {
        if (line.startsWith("worktree ")) entry.path = line.slice("worktree ".length);
        else if (line.startsWith("HEAD ")) entry.head = line.slice("HEAD ".length);
        else if (line.startsWith("branch ")) {
          entry.branch = line.slice("branch ".length).replace(/^refs\/heads\//, "");
        }
      }
      return entry;
    });

/**
 * Decides one row from its evidence. Pure, so the rules can be tested without git.
 * `merged` lists the merged PRs for the branch, each with how the tip relates to the PR head:
 * `head` (the same commit), `inside`, `outside`, or `unknown` (the check itself failed).
 */
export const classify = ({ current, dirtyCount, ahead, openPr, merged }) => {
  if (current) return { action: "KEEP", reason: "the worktree this command runs in" };
  if (dirtyCount > 0) {
    return { action: "KEEP", reason: `${dirtyCount} uncommitted or untracked file(s)` };
  }
  if (openPr) return { action: "KEEP", reason: `PR #${openPr} is open` };
  const landed = merged.find((pr) => pr.relation === "head" || pr.relation === "inside");
  if (landed) {
    const where = landed.relation === "head" ? "is its head" : "is inside its head";
    return { action: "SAFE", reason: `PR #${landed.number} merged; the tip ${where}` };
  }
  if (ahead === 0) return { action: "SAFE", reason: `no commit beyond ${ORIGIN_MAIN}` };
  const pr = merged[0];
  if (pr?.relation === "unknown") {
    return {
      action: "KEEP",
      reason: `could not compare the tip with PR #${pr.number}: ${pr.error}`,
    };
  }
  if (pr) {
    return {
      action: "KEEP",
      reason: `${ahead} commit(s) are not in PR #${pr.number}'s head, so they never merged`,
    };
  }
  return { action: "KEEP", reason: `${ahead} commit(s) beyond ${ORIGIN_MAIN} and no merged PR` };
};

/** `head`, `inside` or `outside` for a branch tip against one merged PR; `unknown` carries the error. */
const relateToPr = (root, tip, pr, fetchPrHead) => {
  if (tip === pr.headRefOid) return { number: pr.number, relation: "head" };
  const fetched = fetchPrHead(pr.number);
  if (!fetched.ok) return { number: pr.number, relation: "unknown", error: fetched.error };
  try {
    git(root, "merge-base", "--is-ancestor", tip, fetched.sha);
    return { number: pr.number, relation: "inside" };
  } catch (error) {
    if (error.status === 1) return { number: pr.number, relation: "outside" };
    return {
      number: pr.number,
      relation: "unknown",
      error: String(error.stderr || error.message).trim(),
    };
  }
};

/** Fetches `refs/pull/<n>/head` and returns its commit. */
const fetchPrHeadFromOrigin = (root) => (number) => {
  try {
    git(root, "fetch", "--quiet", "origin", `pull/${number}/head`);
    return { ok: true, sha: git(root, "rev-parse", "FETCH_HEAD") };
  } catch (error) {
    return { ok: false, error: String(error.stderr || error.message).trim() };
  }
};

/** Reads the merged and open PRs from GitHub. Throws when `gh` fails: no PR data, no verdicts. */
export const readPrs = (root) => {
  const list = (state, limit) =>
    JSON.parse(
      run(
        "gh",
        root,
        "pr",
        "list",
        "--state",
        state,
        "--limit",
        String(limit),
        "--json",
        "number,headRefName,headRefOid",
      ),
    );
  return { merged: list("merged", 1000), open: list("open", 200) };
};

/** Builds one row per local worktree and per local branch, each with a verdict. */
export const survey = ({ root, prs, fetchPrHead = fetchPrHeadFromOrigin(root) }) => {
  const worktrees = parseWorktrees(git(root, "worktree", "list", "--porcelain"));
  const mainCheckout = worktrees[0]?.path;
  const here = realpathSync(git(root, "rev-parse", "--show-toplevel"));
  const byBranch = new Map(worktrees.filter((w) => w.branch).map((w) => [w.branch, w]));
  const branches = git(root, "for-each-ref", "refs/heads", "--format=%(refname:short)")
    .split("\n")
    .filter(Boolean);

  const dirtyIn = (path) => git(path, "status", "--porcelain").split("\n").filter(Boolean).length;
  const aheadOf = (ref) => Number(git(root, "rev-list", "--count", `${ORIGIN_MAIN}..${ref}`));
  const rowFor = ({ name, path, tip, ref }) => {
    const mergedForName = prs.merged.filter((pr) => pr.headRefName === name);
    const merged = mergedForName.map((pr) => relateToPr(root, tip, pr, fetchPrHead));
    const openPr = prs.open.find((pr) => pr.headRefName === name)?.number ?? null;
    const evidence = {
      current: path ? realpathSync(path) === here : false,
      dirtyCount: path ? dirtyIn(path) : 0,
      ahead: aheadOf(ref),
      openPr,
      merged,
    };
    return { name, path: path ?? null, ...classify(evidence) };
  };

  const rows = [];
  for (const branch of branches) {
    if (branch === MAIN) continue;
    const wt = byBranch.get(branch);
    if (wt && wt.path === mainCheckout) continue;
    const tip = git(root, "rev-parse", `refs/heads/${branch}`);
    rows.push({
      kind: "branch",
      ...rowFor({ name: branch, path: wt?.path, tip, ref: `refs/heads/${branch}` }),
    });
  }
  for (const wt of worktrees) {
    if (wt.branch || wt.path === mainCheckout) continue;
    // A detached worktree has no branch name; match merged PRs by the commit it stands on.
    const merged = prs.merged
      .filter((pr) => pr.headRefOid === wt.head)
      .map((pr) => ({ number: pr.number, relation: "head" }));
    const evidence = {
      current: realpathSync(wt.path) === here,
      dirtyCount: dirtyIn(wt.path),
      ahead: aheadOf(wt.head),
      openPr: prs.open.find((pr) => pr.headRefOid === wt.head)?.number ?? null,
      merged,
    };
    rows.push({
      kind: "detached",
      name: `(detached ${wt.head.slice(0, 8)})`,
      path: wt.path,
      ...classify(evidence),
    });
  }
  return rows;
};

/**
 * Removes the SAFE rows: `git worktree remove` (never `--force`), then `git branch -D`, then a
 * prune. A worktree that will not come off is reported and its branch is left alone.
 */
export const applyCleanup = ({ root, rows }) => {
  const results = [];
  for (const row of rows.filter((r) => r.action === "SAFE")) {
    if (row.path) {
      try {
        git(root, "worktree", "remove", row.path);
      } catch (error) {
        results.push({
          name: row.name,
          ok: false,
          message: `worktree remove failed: ${String(error.stderr || error.message).trim()}`,
        });
        continue;
      }
    }
    if (row.kind === "branch") {
      try {
        git(root, "branch", "-D", row.name);
      } catch (error) {
        results.push({
          name: row.name,
          ok: false,
          message: `branch delete failed: ${String(error.stderr || error.message).trim()}`,
        });
        continue;
      }
    }
    results.push({ name: row.name, ok: true, message: "removed" });
  }
  git(root, "worktree", "prune");
  return results;
};

/** The report as a Markdown table, SAFE rows first. */
export const formatTable = (rows) => {
  const order = { SAFE: 0, KEEP: 1 };
  const sorted = [...rows].sort(
    (a, b) => order[a.action] - order[b.action] || a.name.localeCompare(b.name),
  );
  const lines = ["| action | branch | worktree | why |", "|---|---|---|---|"];
  for (const row of sorted) {
    lines.push(`| ${row.action} | ${row.name} | ${row.path ?? "none"} | ${row.reason} |`);
  }
  const safe = rows.filter((r) => r.action === "SAFE").length;
  lines.push("", `${safe} SAFE, ${rows.length - safe} KEEP.`);
  return lines.join("\n");
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
  const args = process.argv.slice(2);
  try {
    git(root, "fetch", "--prune", "--quiet");
    const rows = survey({ root, prs: readPrs(root) });
    if (args.includes("--json")) console.log(JSON.stringify(rows, null, 2));
    else console.log(formatTable(rows));
    if (args.includes("--apply")) {
      const results = applyCleanup({ root, rows });
      for (const r of results) console.log(`${r.ok ? "ok  " : "FAIL"} ${r.name}: ${r.message}`);
      if (results.some((r) => !r.ok)) process.exit(1);
    } else {
      console.log("\nReport only. Re-run with --apply to remove the SAFE rows.");
    }
  } catch (error) {
    console.error(`\n${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
