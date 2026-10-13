// PreToolUse (Bash): Claude never creates commits on main or moves it. Bob merges.
// On every branch, a commit may not skip the pre-commit check.
import {
  block,
  branchExists,
  currentBranch,
  folderAt,
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

const SKIP_WHY =
  "The pre-commit hook runs pnpm check, which gates every code commit (docs/sdlc.md). Fix what it reports, or ask Bob.";
// `git commit` options that take the next word as their value, so a message is not read as a flag.
const COMMIT_OPTIONS_WITH_VALUE = new Set([
  "-m",
  "-F",
  "-C",
  "-c",
  "-t",
  "--message",
  "--file",
  "--reuse-message",
  "--reedit-message",
  "--template",
  "--author",
  "--date",
  "--fixup",
  "--squash",
]);

/** How a committing git command would skip the pre-commit hook, or undefined when it would not. */
const skipsPreCommit = (words, sub, args, hooksOff) => {
  if (!COMMITTING.has(sub)) return undefined;
  if (hooksOff) return "LEFTHOOK=0 turns the pre-commit hook off";
  if (words.some((word) => /^core\.hookspath=/i.test(word))) {
    return "core.hooksPath points git away from the pre-commit hook";
  }
  const flags = args.filter(
    (word, i) => word.startsWith("-") && !COMMIT_OPTIONS_WITH_VALUE.has(args[i - 1] ?? ""),
  );
  if (flags.includes("--no-verify")) return "--no-verify skips the pre-commit hook";
  // `-n` means --no-verify for `git commit` only; for `git merge` it means --no-stat.
  if (sub === "commit" && flags.some((flag) => /^-[A-Za-z]*n[A-Za-z]*$/.test(flag))) {
    return "-n skips the pre-commit hook";
  }
  return undefined;
};

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
  // `LEFTHOOK=0`, set on the command or exported before it, turns lefthook off.
  let hooksOff = false;

  for (const { words, dir: folder } of walkCommands(command, input.cwd)) {
    hooksOff ||= words.some((word) => /^LEFTHOOK=(0|false)$/i.test(word));
    const git = gitCommand(words);
    if (!git) continue;
    const { sub, args, dir } = git;
    const skip = skipsPreCommit(words, sub, args, hooksOff);
    if (skip) block(`git ${sub}: ${skip}. ${SKIP_WHY}`);
    const cwd = dir ? folderAt(folder, dir, input.cwd) : folder;
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
