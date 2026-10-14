import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { land } from "./land.mjs";

// Git sets GIT_DIR and GIT_INDEX_FILE when it runs a hook, and the pre-commit hook runs these
// tests. Left in place they would point every git call below at the real repo.
for (const name of Object.keys(process.env)) {
  if (name.startsWith("GIT_")) delete process.env[name];
}
// land.mjs runs git itself, and its rebase writes commits. A machine with no git identity (CI)
// would refuse them, so give that git an identity and keep the person's config out of it.
Object.assign(process.env, {
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
});

let cwd;
// The -c settings keep the person's global git config (identity, signing, hooks) out of the tests.
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
      "-c",
      "core.hooksPath=/dev/null",
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
const current = () => git("branch", "--show-current");
const passes = () => {};
const run = (options) => land({ cwd, runCheck: passes, env: {}, ...options });

/** Asserts that the call refuses with `message` and leaves main, the branch and HEAD as they were. */
const refuses = (options, message) => {
  const before = { main: head("main"), work: head("work"), on: current() };
  assert.throws(() => run(options), message);
  assert.deepEqual({ main: head("main"), work: head("work"), on: current() }, before);
};

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
    assert.equal(current(), "main");
    assert.equal(git("branch", "--list", "work"), "");
    assert.match(lines[0], /Landed work on main: 2 commits\./);
  });

  it("lands from another branch too", () => {
    git("checkout", "--quiet", "-b", "other", "main");
    const tip = head("work");
    run({ branch: "work" });
    assert.equal(head("main"), tip);
    assert.equal(current(), "main");
  });

  it("runs the check on the branch, before main moves", () => {
    git("checkout", "--quiet", "main");
    const before = head("main");
    let seen;
    run({
      branch: "work",
      runCheck: () => {
        seen = { on: current(), main: head("main") };
      },
    });
    assert.deepEqual(seen, { on: "work", main: before });
  });

  it("refuses when the check fails, and goes back to the branch it started on", () => {
    git("checkout", "--quiet", "-b", "other", "main");
    const fails = () => {
      throw new Error("boom");
    };
    refuses(
      { branch: "work", runCheck: fails },
      /The check failed on work after the rebase\. main was not changed\. You are on other\./,
    );
  });

  it("refuses when the check changes a tracked file, and stays on the branch with the change", () => {
    git("checkout", "--quiet", "main");
    const before = { main: head("main"), work: head("work") };
    const rewrites = () => writeFileSync(join(cwd, "b.txt"), "rewritten by the check");
    assert.throws(
      () => run({ branch: "work", runCheck: rewrites }),
      /changed tracked files on work.* main was not changed\. You are on work\./,
    );
    assert.deepEqual({ main: head("main"), work: head("work") }, before);
    assert.match(git("status", "--porcelain"), /M b\.txt/);
  });

  it("merges the branch, not a tag of the same name", () => {
    const tip = head("work");
    git("tag", "work", "main");
    run({ branch: "work" });
    assert.equal(head("refs/heads/main"), tip);
  });

  it("leaves untracked files where they are", () => {
    writeFileSync(join(cwd, "notes.txt"), "mine");
    run({ branch: "work" });
    assert.match(git("status", "--porcelain"), /\?\? notes\.txt/);
  });

  it("refuses inside a Claude session, even when the variable is empty", () => {
    refuses({ branch: "work", env: { CLAUDECODE: "1" } }, /Bob's to do/);
    refuses({ branch: "work", env: { CLAUDECODE: "" } }, /Bob's to do/);
  });

  it("refuses with no branch, with main, and with a branch that does not exist", () => {
    refuses({ branch: undefined }, /Usage/);
    refuses({ branch: "main" }, /cannot be landed on itself/);
    refuses({ branch: "nope" }, /no local branch named nope/);
  });

  it("refuses when tracked files have uncommitted changes", () => {
    writeFileSync(join(cwd, "b.txt"), "changed");
    refuses({ branch: "work" }, /uncommitted changes/);
  });

  it("refuses when no branch is checked out", () => {
    git("checkout", "--quiet", "--detach");
    refuses({ branch: "work" }, /No branch is checked out/);
  });

  it("rebases a branch that main has moved past, checks the result, then lands it", () => {
    git("checkout", "--quiet", "main");
    commit("d.txt", "d");
    const mainTip = head("main");
    let checkedOn;
    const lines = run({
      branch: "work",
      runCheck: () => {
        checkedOn = { on: current(), base: git("merge-base", "main", "work") };
      },
    });
    assert.deepEqual(checkedOn, { on: "work", base: mainTip });
    assert.equal(git("rev-list", "--count", `${mainTip}..main`), "2");
    assert.match(lines[0], /2 commits, rebased\./);
  });

  it("refuses a branch that does not rebase cleanly, and leaves it as it was", () => {
    git("checkout", "--quiet", "main");
    commit("b.txt", "main wrote b too");
    refuses(
      { branch: "work" },
      /does not rebase cleanly.* main was not changed\. You are on main\./,
    );
    assert.equal(git("status", "--porcelain"), "");
  });

  it("refuses when the check fails after the rebase", () => {
    git("checkout", "--quiet", "main");
    commit("d.txt", "d");
    const fails = () => {
      throw new Error("boom");
    };
    assert.throws(
      () => run({ branch: "work", runCheck: fails }),
      /check failed on work after the rebase/,
    );
    assert.notEqual(git("rev-parse", "main"), git("rev-parse", "work"));
    assert.equal(current(), "main");
  });

  describe("a branch in a step worktree", () => {
    let wt;
    beforeEach(() => {
      git("checkout", "--quiet", "main");
      commit("d.txt", "d");
      wt = `${cwd}-wt`;
      git("worktree", "add", "--quiet", wt, "work");
    });
    afterEach(() => rmSync(wt, { recursive: true, force: true }));

    it("rebases and checks in the worktree, lands, and keeps the worktree for wt:rm", () => {
      let checkedIn;
      const lines = run({
        branch: "work",
        runCheck: (dir) => {
          checkedIn = dir;
        },
      });
      assert.equal(realpathSync(checkedIn), realpathSync(wt));
      assert.equal(head("main"), head("work"));
      assert.equal(current(), "main");
      assert.match(lines.at(-1), /pnpm wt:rm work/);
    });

    it("refuses when the worktree has uncommitted changes", () => {
      writeFileSync(join(wt, "b.txt"), "changed");
      refuses({ branch: "work" }, /worktree .* has uncommitted changes/);
    });
  });

  it("refuses a branch with nothing new", () => {
    git("checkout", "--quiet", "main");
    git("branch", "empty");
    refuses({ branch: "empty" }, /nothing that main lacks/);
  });
});
