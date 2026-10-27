import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { addWorktree, nextOffset, readWtConfig, removeWorktree, worktreesHome } from "./wt.mjs";

// Git sets GIT_DIR and GIT_INDEX_FILE when it runs a hook, and the pre-commit hook runs these
// tests. Left in place they would point every git call below at the real repo.
for (const name of Object.keys(process.env)) {
  if (name.startsWith("GIT_")) delete process.env[name];
}

let base;
let root;
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
const installs = [];
const install = (dir) => installs.push(dir);
const add = (branch) => addWorktree({ root, branch, install });

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), "dark-tower-wt-"));
  root = join(base, "Repo");
  mkdirSync(root);
  git(root, "init", "--quiet", "--initial-branch=main");
  writeFileSync(join(root, "a.txt"), "a");
  git(root, "add", "a.txt");
  git(root, "commit", "--quiet", "-m", "a");
  installs.length = 0;
});
afterEach(() => rmSync(base, { recursive: true, force: true }));

describe("pnpm wt", () => {
  it("makes ../BloodTower-work/<branch> on a new branch from main, installs there, writes .wt.json", () => {
    const { config, lines } = add("feat/poc-thing");
    const path = join(worktreesHome(root), "feat/poc-thing");
    assert.equal(worktreesHome(root), join(base, "BloodTower-work"));
    assert.equal(git(path, "branch", "--show-current"), "feat/poc-thing");
    assert.equal(git(path, "rev-parse", "HEAD"), git(root, "rev-parse", "main"));
    assert.deepEqual(installs, [path]);
    assert.deepEqual(readWtConfig(path), config);
    assert.deepEqual(config.ports, { dev: 4757, e2e: 4758, workbench: 4907 });
    assert.equal(config.dataDir, join(path, ".wt-data"));
    assert.ok(existsSync(config.dataDir));
    assert.match(lines[1], /dev 4757, e2e 4758/);
  });

  it("gives each live worktree its own offset, ports and SQLite folder, and reuses a freed slot", () => {
    const one = add("feat/a").config;
    const two = add("feat/b").config;
    assert.deepEqual([one.offset, two.offset], [1, 2]);
    assert.notEqual(one.ports.dev, two.ports.dev);
    assert.notEqual(one.dataDir, two.dataDir);
    removeWorktree({ root, branch: "feat/a" });
    assert.equal(add("feat/c").config.offset, 1);
  });

  it("refuses main, an existing branch, a bad name, no name, and running from a worktree", () => {
    assert.throws(() => add(undefined), /Usage/);
    assert.throws(() => add("main"), /stays in the main checkout/);
    git(root, "branch", "taken");
    assert.throws(() => add("taken"), /already exists/);
    assert.throws(() => add("bad..name"), /not a valid branch name/);
    const path = add("feat/a").config.root;
    assert.throws(() => addWorktree({ root: path, branch: "feat/b", install }), /main checkout/);
  });

  it("caps the slots", () => {
    assert.equal(nextOffset([1, 2, 4]), 3);
    assert.throws(() => nextOffset([1, 2, 3, 4, 5, 6, 7, 8, 9]), /slots are in use/);
  });
});

describe("pnpm wt:rm", () => {
  it("removes the worktree and deletes a branch main already holds", () => {
    const path = add("feat/a").config.root;
    const lines = removeWorktree({ root, branch: "feat/a" });
    assert.ok(!existsSync(path));
    assert.equal(git(root, "branch", "--list", "feat/a"), "");
    assert.match(lines[1], /Deleted the branch/);
  });

  it("keeps a branch with work main lacks", () => {
    const path = add("feat/a").config.root;
    writeFileSync(join(path, "b.txt"), "b");
    git(path, "add", "b.txt");
    git(path, "commit", "--quiet", "-m", "b");
    const lines = removeWorktree({ root, branch: "feat/a" });
    assert.ok(!existsSync(path));
    assert.notEqual(git(root, "branch", "--list", "feat/a"), "");
    assert.match(lines[1], /Kept the branch/);
  });

  it("refuses a worktree with uncommitted changes, and one that is not there", () => {
    const path = add("feat/a").config.root;
    writeFileSync(join(path, "a.txt"), "changed");
    assert.throws(() => removeWorktree({ root, branch: "feat/a" }), /uncommitted changes/);
    assert.ok(existsSync(path));
    assert.throws(() => removeWorktree({ root, branch: "feat/none" }), /no worktree/);
  });
});
