// PreToolUse (Bash): Claude never creates commits on main or moves it. Bob merges.
import { resolve } from "node:path";
import {
  block,
  branchExists,
  currentBranch,
  gitCommand,
  repoRoot,
  runGuard,
  UNKNOWN_BRANCH,
  walkCommands,
} from "./lib.mjs";

const WHY = "Work on a <type>/<app>-<slug> branch; Bob merges to main (docs/sdlc.md).";

const COMMITTING = new Set(["commit", "merge", "cherry-pick", "revert", "am", "rebase", "pull"]);
const NEW_BRANCH_FLAGS = new Set(["-b", "-B", "-c", "-C", "--orphan"]);
const RESET_MODES = new Set(["--hard", "--soft", "--mixed", "--keep", "--merge"]);

/** The branch HEAD is on after a `git checkout` or `git switch`, or undefined when it does not move. */
const branchAfterSwitch = (sub, args, cwd) => {
  const flag = args.findIndex((word) => NEW_BRANCH_FLAGS.has(word));
  if (flag !== -1) return args[flag + 1];
  if (args.includes("--detach")) return "(detached)";
  // `git checkout <tree> -- <files>` restores files and leaves HEAD where it is.
  if (sub === "checkout" && args.includes("--")) return undefined;
  // `git checkout -` goes to the previous branch, which may be main.
  if (args.includes("-")) return "main";
  // `git checkout <file>` restores a file. Only a real branch name moves HEAD.
  const target = args.find((word) => !word.startsWith("-"));
  return target && branchExists(cwd, target) ? target : undefined;
};

runGuard("no-main-commit", (input) => {
  const command = input.tool_input?.command ?? "";
  // The branch of each repo the command touches, read once and then moved by `git checkout` and
  // `git switch`, so it is right at each step. `dir` already follows `cd`.
  const branches = new Map();

  for (const { words, dir: folder } of walkCommands(command, input.cwd)) {
    const git = gitCommand(words);
    if (!git) continue;
    const { sub, args, dir } = git;
    const cwd = dir ? resolve(folder, dir) : folder;
    const repo = repoRoot(cwd) || cwd;
    if (!branches.has(repo)) branches.set(repo, currentBranch(cwd));
    const here = branches.get(repo);

    if (sub === "checkout" || sub === "switch") {
      const next = branchAfterSwitch(sub, args, cwd);
      if (next !== undefined) branches.set(repo, next);
      continue;
    }

    if (here === UNKNOWN_BRANCH && COMMITTING.has(sub)) {
      block(
        `git ${sub}: git could not say which branch this is, so it may be main. Run it from the repo folder or with git -C <path>. ${WHY}`,
      );
    }
    if (here === "main") {
      if (COMMITTING.has(sub)) block(`git ${sub} would create commits on main. ${WHY}`);
      if (sub === "reset" && args.some((word) => RESET_MODES.has(word))) {
        block(`git reset would move main. ${WHY}`);
      }
    }

    const namesMain = args.includes("main");
    if (
      sub === "branch" &&
      namesMain &&
      args.some((word) => /^(-[fFmMdD]|--force|--move|--delete)$/.test(word))
    ) {
      block(`git branch would move, rename or delete main. ${WHY}`);
    }
    if (sub === "update-ref" && args.includes("refs/heads/main")) {
      block(`git update-ref would move main. ${WHY}`);
    }
    if (
      (sub === "push" || sub === "fetch") &&
      args.some((word) => /:(refs\/heads\/)?main$/.test(word))
    ) {
      block(`git ${sub} with a refspec ending in :main would move main. ${WHY}`);
    }
  }
});
