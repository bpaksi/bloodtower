// `pnpm land <branch>`: Bob's command for merging a reviewed branch into main. It fast-forwards
// main to the branch and deletes the branch, and refuses anything that is not a plain fast-forward.
// Bob owns merges (docs/sdlc.md), so it refuses to run inside a Claude session.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MAIN = "main";

/**
 * Lands `branch` on main in the repo at `cwd`. `runCheck` runs the repo's checks and throws when
 * they fail. Returns the lines to print. Throws an Error with the reason when it refuses; nothing
 * has been merged in that case.
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

  if (env.CLAUDECODE) {
    throw new Error(
      "Merging to main is Bob's to do. Run this in your own terminal, not in Claude.",
    );
  }
  if (!branch) throw new Error("Usage: pnpm land <branch>");
  if (branch === MAIN) throw new Error(`${MAIN} cannot be landed on itself.`);
  if (!succeeds("rev-parse", "--verify", "--quiet", `refs/heads/${branch}`)) {
    throw new Error(`There is no local branch named ${branch}.`);
  }
  // Untracked files are left alone; they survive a checkout.
  if (git("status", "--porcelain", "--untracked-files=no") !== "") {
    throw new Error("There are uncommitted changes. Commit them or put them aside first.");
  }
  if (!succeeds("merge-base", "--is-ancestor", MAIN, branch)) {
    throw new Error(
      `${branch} does not sit on top of ${MAIN}, so it cannot be fast-forwarded. Rebase it or merge it by hand.`,
    );
  }
  const commits = Number(git("rev-list", "--count", `${MAIN}..${branch}`));
  if (commits === 0) throw new Error(`${branch} has nothing that ${MAIN} lacks.`);

  // A fast-forward leaves main with exactly the branch's files, so checking the branch checks
  // what main will hold. A failure here stops before main is touched.
  git("checkout", "--quiet", branch);
  runCheck();

  git("checkout", "--quiet", MAIN);
  git("merge", "--ff-only", "--quiet", branch);
  git("branch", "--delete", "--quiet", branch);

  return [
    `Landed ${branch} on ${MAIN}: ${commits} commit${commits === 1 ? "" : "s"}.`,
    `${MAIN} is now at ${git("log", "--oneline", "-1")}`,
    `Deleted the branch ${branch}.`,
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
