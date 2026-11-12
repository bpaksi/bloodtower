import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  applyCleanup,
  classify,
  formatTable,
  parseWorktrees,
  survey,
} from "./cleanup-worktrees.mjs";

// Git sets GIT_DIR and GIT_INDEX_FILE when it runs a hook, and the pre-commit hook runs these
// tests. Left in place they would point every git call below at the real repo.
for (const name of Object.keys(process.env)) {
  if (name.startsWith("GIT_")) delete process.env[name];
}

const git = (dir, ...args) =>
  execFileSync(
    "git",
    [
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.com",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "core.hooksPath=/dev/null",
      ...args,
    ],
    { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();

const base = { current: false, dirtyCount: 0, ahead: 2, openPr: null, merged: [] };

describe("classify", () => {
  it("keeps the worktree it runs in, dirty work, and open PRs, whatever else is true", () => {
    const landed = [{ number: 1, relation: "head" }];
    assert.match(classify({ ...base, current: true, merged: landed }).reason, /runs in/);
    assert.match(classify({ ...base, dirtyCount: 3, merged: landed }).reason, /3 uncommitted/);
    assert.match(classify({ ...base, openPr: 7, merged: landed }).reason, /PR #7 is open/);
    for (const input of [{ current: true }, { dirtyCount: 1 }, { openPr: 7 }]) {
      assert.equal(classify({ ...base, ...input, merged: landed }).action, "KEEP");
    }
  });

  it("is safe when the tip is a merged PR's head or inside it", () => {
    assert.equal(classify({ ...base, merged: [{ number: 5, relation: "head" }] }).action, "SAFE");
    assert.match(
      classify({ ...base, merged: [{ number: 5, relation: "inside" }] }).reason,
      /inside/,
    );
  });

  it("is safe when the branch holds nothing beyond origin/main", () => {
    assert.equal(classify({ ...base, ahead: 0 }).action, "SAFE");
  });

  it("keeps commits the merged PR never held, and commits with no PR", () => {
    const outside = classify({ ...base, merged: [{ number: 9, relation: "outside" }] });
    assert.equal(outside.action, "KEEP");
    assert.match(outside.reason, /never merged/);
    assert.match(classify(base).reason, /no merged PR/);
  });

  it("keeps a branch it could not compare, and says why", () => {
    const row = classify({
      ...base,
      merged: [{ number: 9, relation: "unknown", error: "network down" }],
    });
    assert.equal(row.action, "KEEP");
    assert.match(row.reason, /network down/);
  });
});

describe("parseWorktrees", () => {
  it("reads branch and detached worktrees", () => {
    const text = [
      "worktree /r/Main\nHEAD aaa\nbranch refs/heads/main",
      "worktree /r/feat\nHEAD bbb\nbranch refs/heads/feat/x",
      "worktree /r/rev\nHEAD ccc\ndetached",
    ].join("\n\n");
    assert.deepEqual(parseWorktrees(text), [
      { path: "/r/Main", head: "aaa", branch: "main" },
      { path: "/r/feat", head: "bbb", branch: "feat/x" },
      { path: "/r/rev", head: "ccc", branch: null },
    ]);
  });
});

describe("survey and applyCleanup", () => {
  let dir;
  let root;
  const commit = (cwd, file) => {
    writeFileSync(join(cwd, file), file);
    git(cwd, "add", file);
    git(cwd, "commit", "--quiet", "-m", file);
  };
  const noPrs = { merged: [], open: [] };
  const never = () => ({ ok: false, error: "no network in tests" });

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "dark-tower-cleanup-"));
    root = join(dir, "Repo");
    mkdirSync(root);
    git(root, "init", "--quiet", "--initial-branch=main");
    commit(root, "a.txt");
    git(dir, "clone", "--quiet", "--bare", root, join(dir, "origin.git"));
    git(root, "remote", "add", "origin", join(dir, "origin.git"));
    git(root, "fetch", "--quiet", "origin");
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const makeWorktree = (branch, { file } = {}) => {
    const path = join(dir, "wt", branch);
    git(root, "worktree", "add", "--quiet", "-b", branch, path, "origin/main");
    if (file) commit(path, file);
    return path;
  };
  const rowOf = (rows, name) => rows.find((r) => r.name === name);

  it("marks an empty branch SAFE, and unmerged and dirty work KEEP", () => {
    makeWorktree("claude/empty");
    makeWorktree("feat/unmerged", { file: "b.txt" });
    const dirty = makeWorktree("claude/dirty");
    writeFileSync(join(dirty, "scratch.txt"), "x");
    const rows = survey({ root, prs: noPrs, fetchPrHead: never });
    assert.equal(rowOf(rows, "claude/empty").action, "SAFE");
    assert.equal(rowOf(rows, "feat/unmerged").action, "KEEP");
    assert.equal(rowOf(rows, "claude/dirty").action, "KEEP");
    assert.match(rowOf(rows, "claude/dirty").reason, /untracked/);
    assert.equal(rowOf(rows, "main"), undefined);
  });

  it("marks a branch SAFE when its tip is a merged PR's head, and KEEP when the PR is open", () => {
    makeWorktree("feat/done", { file: "b.txt" });
    makeWorktree("feat/open", { file: "c.txt" });
    const tip = (b) => git(root, "rev-parse", b);
    const prs = {
      merged: [{ number: 11, headRefName: "feat/done", headRefOid: tip("feat/done") }],
      open: [{ number: 12, headRefName: "feat/open", headRefOid: tip("feat/open") }],
    };
    const rows = survey({ root, prs, fetchPrHead: never });
    assert.equal(rowOf(rows, "feat/done").action, "SAFE");
    assert.equal(rowOf(rows, "feat/open").action, "KEEP");
  });

  it("marks a branch with a merged PR whose head cannot be fetched KEEP, with the error", () => {
    makeWorktree("feat/moved", { file: "b.txt" });
    const prs = {
      merged: [{ number: 13, headRefName: "feat/moved", headRefOid: "0".repeat(40) }],
      open: [],
    };
    const row = rowOf(survey({ root, prs, fetchPrHead: never }), "feat/moved");
    assert.equal(row.action, "KEEP");
    assert.match(row.reason, /no network in tests/);
  });

  it("covers a branch with no worktree and a detached worktree", () => {
    git(root, "branch", "claude/no-worktree", "origin/main");
    const detached = join(dir, "wt", "review");
    git(root, "worktree", "add", "--quiet", "--detach", detached, "origin/main");
    const rows = survey({ root, prs: noPrs, fetchPrHead: never });
    assert.equal(rowOf(rows, "claude/no-worktree").path, null);
    assert.equal(rowOf(rows, "claude/no-worktree").action, "SAFE");
    const row = rows.find((r) => r.kind === "detached");
    assert.equal(row.action, "SAFE");
    assert.equal(realpathSync(row.path), realpathSync(detached));
  });

  it("removes SAFE rows only, and never forces a worktree off", () => {
    const empty = makeWorktree("claude/empty");
    const keep = makeWorktree("feat/unmerged", { file: "b.txt" });
    git(root, "branch", "claude/no-worktree", "origin/main");
    const rows = survey({ root, prs: noPrs, fetchPrHead: never });
    const results = applyCleanup({ root, rows });
    assert.ok(results.every((r) => r.ok));
    assert.ok(!existsSync(empty));
    assert.equal(git(root, "branch", "--list", "claude/empty"), "");
    assert.equal(git(root, "branch", "--list", "claude/no-worktree"), "");
    assert.ok(existsSync(keep));
    assert.notEqual(git(root, "branch", "--list", "feat/unmerged"), "");
  });

  it("reports a worktree git will not remove and keeps its branch", () => {
    const path = makeWorktree("claude/locked");
    git(root, "worktree", "lock", path);
    const rows = survey({ root, prs: noPrs, fetchPrHead: never });
    const [result] = applyCleanup({ root, rows });
    assert.equal(result.ok, false);
    assert.match(result.message, /worktree remove failed/);
    assert.notEqual(git(root, "branch", "--list", "claude/locked"), "");
    git(root, "worktree", "unlock", path);
  });

  it("prints SAFE rows first with a count", () => {
    const text = formatTable([
      { action: "KEEP", name: "b", path: null, reason: "r" },
      { action: "SAFE", name: "a", path: "/p", reason: "r" },
    ]);
    assert.ok(text.indexOf("SAFE | a") < text.indexOf("KEEP | b"));
    assert.match(text, /1 SAFE, 1 KEEP\./);
  });
});
