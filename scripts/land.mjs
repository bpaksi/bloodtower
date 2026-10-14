// `pnpm land <branch>`: an optional local recheck for Bob. The merge path is a GitHub PR
// (docs/sdlc.md); this is for checking a branch against the current main on the Mac. It rebases the
// branch on the current main, reruns the checks on the rebased result, then fast-forwards main to
// it. Landing is serial: one branch per run, in the order the plan's batch lists.
// A branch checked out in a step worktree (`pnpm wt`) is rebased and checked there, and the
// worktree is left for `pnpm wt:rm`. Any other branch is rebased and checked in this checkout and
// deleted after landing. On a conflict or a failed check nothing on main moves.
// Bob owns merges (docs/sdlc.md), so it refuses when it can tell it is inside a Claude session.
// That refusal is a courtesy, not a lock: it reads one environment variable.
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const MAIN = "main";

/** The worktree path that has `branch` checked out, other than `cwd`, or undefined. */
export const worktreeOf = (cwd, branch) => {
  const out = execFileSync("git", ["worktree", "list", "--porcelain"], {
    cwd,
    encoding: "utf8",
  });
  const here = realpathSync(cwd);
  for (const block of out.split("\n\n")) {
    const path = block.match(/^worktree (.+)$/m)?.[1];
    const ref = block.match(/^branch (.+)$/m)?.[1];
    if (path && ref === `refs/heads/${branch}` && realpathSync(path) !== here) return path;
  }
  return undefined;
};

/**
 * Lands `branch` on main in the repo at `cwd`. `runCheck(dir)` runs the repo's checks in `dir`
 * and throws when they fail. Returns the lines to print. Throws an Error with the reason when it
 * refuses; main has not moved in that case.
 */
export const land = ({ cwd, branch, runCheck, env = process.env }) => {
  const gitIn = (dir, ...args) =>
    execFileSync("git", args, {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  const git = (...args) => gitIn(cwd, ...args);
  const succeeds = (dir, ...args) => {
    try {
      gitIn(dir, ...args);
      return true;
    } catch {
      return false;
    }
  };
  const dirtyIn = (dir) => gitIn(dir, "status", "--porcelain", "--untracked-files=no") !== "";

  if ("CLAUDECODE" in env) {
    throw new Error(
      "Merging to main is Bob's to do. Run this in your own terminal, not in Claude.",
    );
  }
  if (!branch) throw new Error("Usage: pnpm land <branch>");
  if (branch === MAIN) throw new Error(`${MAIN} cannot be landed on itself.`);
  // The full ref, so that a tag with the same name is never what gets checked or merged.
  const ref = `refs/heads/${branch}`;
  if (!succeeds(cwd, "rev-parse", "--verify", "--quiet", ref)) {
    throw new Error(`There is no local branch named ${branch}.`);
  }
  const start = git("branch", "--show-current");
  if (start === "") throw new Error("No branch is checked out. Check one out first.");
  // Untracked files are not counted. Git refuses a switch that would overwrite one, unless the
  // file is ignored.
  if (dirtyIn(cwd)) {
    throw new Error("There are uncommitted changes. Commit them or put them aside first.");
  }
  const worktree = worktreeOf(cwd, branch);
  if (worktree && dirtyIn(worktree)) {
    throw new Error(`The worktree ${worktree} has uncommitted changes on ${branch}.`);
  }
  if (!worktree && worktreeOf(cwd, MAIN)) {
    throw new Error(`${MAIN} is checked out in another worktree. Land from that checkout.`);
  }
  const commits = Number(git("rev-list", "--count", `${MAIN}..${ref}`));
  if (commits === 0) throw new Error(`${branch} has nothing that ${MAIN} lacks.`);
  const before = git("rev-parse", ref);

  // Where the branch is rebased and checked: its own worktree, or this checkout.
  const dir = worktree ?? cwd;
  const restore = () => {
    if (!worktree && !dirtyIn(cwd) && git("branch", "--show-current") !== start) {
      git("switch", "--quiet", start);
    }
  };
  if (!worktree) git("switch", "--quiet", branch);
  try {
    try {
      gitIn(dir, "-c", "core.editor=true", "rebase", "--quiet", MAIN);
    } catch {
      succeeds(dir, "rebase", "--abort");
      throw new Error(
        `${branch} does not rebase cleanly on ${MAIN}. It was left as it was; send it back to its developer.`,
      );
    }
    try {
      runCheck(dir);
    } catch {
      throw new Error(`The check failed on ${branch} after the rebase.`);
    }
    if (dirtyIn(dir)) {
      throw new Error(
        `The check changed tracked files on ${branch}. Look at them with git status, then commit or discard them.`,
      );
    }
  } catch (error) {
    restore();
    const where = worktree ? `in ${worktree}` : `You are on ${git("branch", "--show-current")}`;
    throw new Error(`${error.message} ${MAIN} was not changed. ${where}.`);
  }

  const tip = git("rev-parse", ref);
  if (git("branch", "--show-current") !== MAIN) git("switch", "--quiet", MAIN);
  git("merge", "--ff-only", "--quiet", tip);
  const lines = [
    `Landed ${branch} on ${MAIN}: ${commits} commit${commits === 1 ? "" : "s"}${tip === before ? "" : ", rebased"}.`,
    `${MAIN} is now at ${git("log", "--oneline", "-1")}`,
  ];
  if (worktree) {
    lines.push(`The worktree is still at ${worktree}. Remove it with pnpm wt:rm ${branch}.`);
  } else {
    git("branch", "--delete", "--quiet", branch);
    lines.push(`Deleted the branch ${branch}. You are on ${MAIN}.`);
  }
  return lines;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cwd = fileURLToPath(new URL("..", import.meta.url));
  try {
    const lines = land({
      cwd,
      branch: process.argv[2],
      runCheck: (dir) => execFileSync("pnpm", ["check"], { cwd: dir, stdio: "inherit" }),
    });
    console.log(`\n${lines.join("\n")}`);
  } catch (error) {
    console.error(`\nNot landed. ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
