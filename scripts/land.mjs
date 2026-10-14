// `pnpm land <branch>`: Bob's command for merging a reviewed branch into main. It fast-forwards
// main to the branch and deletes the branch, and refuses anything that is not a plain fast-forward.
// It switches branches while it works and ends on main.
// Bob owns merges (docs/sdlc.md), so it refuses when it can tell it is inside a Claude session.
// That refusal is a courtesy, not a lock: it reads one environment variable.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MAIN = "main";

/**
 * Lands `branch` on main in the repo at `cwd`. `runCheck` runs the repo's checks and throws when
 * they fail. Returns the lines to print. Throws an Error with the reason when it refuses; main
 * has not moved in that case.
 */
export const land = ({ cwd, branch, runCheck, env = process.env }) => {
  const git = (...args) =>
    execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const succeeds = (...args) => {
    try {
      git(...args);
      return true;
    } catch {
      return false;
    }
  };
  const dirty = () => git("status", "--porcelain", "--untracked-files=no") !== "";

  if ("CLAUDECODE" in env) {
    throw new Error(
      "Merging to main is Bob's to do. Run this in your own terminal, not in Claude.",
    );
  }
  if (!branch) throw new Error("Usage: pnpm land <branch>");
  if (branch === MAIN) throw new Error(`${MAIN} cannot be landed on itself.`);
  // The full ref, so that a tag with the same name is never what gets checked or merged.
  const ref = `refs/heads/${branch}`;
  if (!succeeds("rev-parse", "--verify", "--quiet", ref)) {
    throw new Error(`There is no local branch named ${branch}.`);
  }
  const start = git("branch", "--show-current");
  if (start === "") throw new Error("No branch is checked out. Check one out first.");
  // Untracked files are not counted. Git refuses a switch that would overwrite one, unless the
  // file is ignored.
  if (dirty()) {
    throw new Error("There are uncommitted changes. Commit them or put them aside first.");
  }
  if (!succeeds("merge-base", "--is-ancestor", MAIN, ref)) {
    throw new Error(
      `${branch} does not sit on top of ${MAIN}, so it cannot be fast-forwarded. Rebase it or merge it by hand.`,
    );
  }
  const commits = Number(git("rev-list", "--count", `${MAIN}..${ref}`));
  if (commits === 0) throw new Error(`${branch} has nothing that ${MAIN} lacks.`);
  const tip = git("rev-parse", ref);

  // A fast-forward leaves main with exactly the branch's files, so checking the branch checks
  // what main will hold. A failure here stops before main is touched.
  git("switch", "--quiet", branch);
  try {
    try {
      runCheck();
    } catch {
      throw new Error(`The check failed on ${branch}.`);
    }
    if (dirty()) {
      throw new Error(
        `The check changed tracked files on ${branch}. Look at them with git status, then commit or discard them.`,
      );
    }
  } catch (error) {
    // Go back to where Bob started, unless the check left changes that a switch would carry along.
    if (!dirty() && start !== branch) git("switch", "--quiet", start);
    throw new Error(
      `${error.message} ${MAIN} was not changed. You are on ${git("branch", "--show-current")}.`,
    );
  }

  git("switch", "--quiet", MAIN);
  git("merge", "--ff-only", "--quiet", tip);
  git("branch", "--delete", "--quiet", branch);

  return [
    `Landed ${branch} on ${MAIN}: ${commits} commit${commits === 1 ? "" : "s"}.`,
    `${MAIN} is now at ${git("log", "--oneline", "-1")}`,
    `Deleted the branch ${branch}. You are on ${MAIN}.`,
  ];
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cwd = fileURLToPath(new URL("..", import.meta.url));
  try {
    const lines = land({
      cwd,
      branch: process.argv[2],
      runCheck: () => execFileSync("pnpm", ["check"], { cwd, stdio: "inherit" }),
    });
    console.log(`\n${lines.join("\n")}`);
  } catch (error) {
    console.error(`\nNot landed. ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
