import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { land } from "./land.mjs";

// Git sets GIT_DIR and GIT_INDEX_FILE when it runs a hook, and the pre-commit hook runs these
// tests. Left in place they would point every git call below at the real repo.
for (const name of Object.keys(process.env)) {
  if (name.startsWith("GIT_")) delete process.env[name];
}

let cwd;
const git = (...args) =>
  execFileSync(
    "git",
    [
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.com",
      "-c",
      "commit.gpgsign=false",
      ...args,
    ],
    { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
const commit = (file, text) => {
  writeFileSync(join(cwd, file), text);
  git("add", file);
  git("commit", "--quiet", "-m", `add ${file}`);
};
const head = (ref) => git("rev-parse", ref);
const passes = () => {};
const run = (options) => land({ cwd, runCheck: passes, env: {}, ...options });

// A repo with main at one commit and a branch `work` two commits ahead, checked out on `work`.
beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), "dark-tower-land-"));
  git("init", "--quiet", "--initial-branch=main");
  commit("a.txt", "a");
  git("checkout", "--quiet", "-b", "work");
  commit("b.txt", "b");
  commit("c.txt", "c");
});
afterEach(() => rmSync(cwd, { recursive: true, force: true }));

describe("land", () => {
  it("fast-forwards main to the branch, deletes the branch and ends on main", () => {
    const tip = head("work");
    const lines = run({ branch: "work" });
    assert.equal(head("main"), tip);
    assert.equal(git("branch", "--show-current"), "main");
    assert.equal(git("branch", "--list", "work"), "");
    assert.match(lines[0], /Landed work on main: 2 commits\./);
  });

  it("checks the branch before main moves, and leaves main alone when the check fails", () => {
    const before = head("main");
    let checkedOn;
    assert.throws(
      () =>
        run({
          branch: "work",
          runCheck: () => {
            checkedOn = git("branch", "--show-current");
            throw new Error("check failed");
          },
        }),
      /check failed/,
    );
    assert.equal(checkedOn, "work");
    assert.equal(head("main"), before);
    assert.notEqual(git("branch", "--list", "work"), "");
  });

  it("leaves untracked files where they are", () => {
    writeFileSync(join(cwd, "notes.txt"), "mine");
    run({ branch: "work" });
    assert.match(git("status", "--porcelain"), /\?\? notes\.txt/);
  });

  it("refuses inside a Claude session", () => {
    const before = head("main");
    assert.throws(() => run({ branch: "work", env: { CLAUDECODE: "1" } }), /Bob's to do/);
    assert.equal(head("main"), before);
  });

  it("refuses with no branch, with main, and with a branch that does not exist", () => {
    assert.throws(() => run({ branch: undefined }), /Usage/);
    assert.throws(() => run({ branch: "main" }), /cannot be landed on itself/);
    assert.throws(() => run({ branch: "nope" }), /no local branch named nope/);
  });

  it("refuses when tracked files have uncommitted changes", () => {
    writeFileSync(join(cwd, "b.txt"), "changed");
    assert.throws(() => run({ branch: "work" }), /uncommitted changes/);
  });

  it("refuses a branch that main has moved past, without merging", () => {
    git("checkout", "--quiet", "main");
    commit("d.txt", "d");
    const before = head("main");
    assert.throws(() => run({ branch: "work" }), /cannot be fast-forwarded/);
    assert.equal(head("main"), before);
  });

  it("refuses a branch with nothing new", () => {
    git("checkout", "--quiet", "main");
    git("branch", "empty");
    assert.throws(() => run({ branch: "empty" }), /nothing that main lacks/);
  });
});
