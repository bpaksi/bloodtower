// PreToolUse (Bash): Claude never creates commits on main or moves it. Changes reach main by squash-merged PR.
// On every branch, a commit may not skip the pre-commit check.
import {
  block,
  branchExists,
  commandOf,
  currentBranch,
  folderAt,
  gitCommand,
  repoRoot,
  runGuard,
  UNKNOWN_BRANCH,
  walkCommands,
} from "./lib.mjs";

const WHY =
  "Work on a <type>/<app>-<slug> branch and open a PR; main changes only by merged PR (docs/sdlc.md).";

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
  // Only as a `-c` setting before the subcommand, not as text in a commit message.
  const settings = words.slice(0, words.indexOf(sub));
  if (settings.some((word) => /^core\.hookspath=/i.test(word))) {
    return "core.hooksPath points git away from the pre-commit hook";
  }
  // A word after `-m`, or after a cluster that ends in it such as `-am`, is a value, not a flag.
  const takesValue = (word) =>
    COMMIT_OPTIONS_WITH_VALUE.has(word) || /^-[A-Za-z]*[mFCct]$/.test(word);
  const flags = args.filter((word, i) => word.startsWith("-") && !takesValue(args[i - 1] ?? ""));
  // Git accepts any unambiguous start of a long option, so `--no-verif` counts.
  if (flags.some((flag) => /^--no-v/.test(flag) && "--no-verify".startsWith(flag))) {
    return "--no-verify skips the pre-commit hook";
  }
  // `-n` means --no-verify for `git commit` only; for `git merge` it means --no-stat. In a cluster
  // the letters after `-u` or `-m` are that option's value (`-uno`, `-mrename`), not flags.
  const shortFlags = (flag) =>
    /^-[A-Za-z]+$/.test(flag) ? flag.slice(1).split(/[mFCctu]/)[0] : "";
  if (sub === "commit" && flags.some((flag) => shortFlags(flag).includes("n"))) {
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

  const branchIn = (folder) => {
    const repo = repoRoot(folder) || folder;
    if (!branches.has(repo)) branches.set(repo, currentBranch(folder));
    return branches.get(repo);
  };

  for (const { words, dir: folder, others } of walkCommands(command, input.cwd)) {
    // An assignment in front of a command lasts for that command; `export` lasts for the rest.
    const setsHooksOff = words.some((word) => /^LEFTHOOK=(0|false)$/i.test(word));
    if (setsHooksOff && commandOf(words).name === "export") hooksOff = true;
    const git = gitCommand(words);
    if (!git) continue;
    const { sub, args, dir } = git;
    const skip = skipsPreCommit(words, sub, args, hooksOff || setsHooksOff);
    if (skip) block(`git ${sub}: ${skip}. ${SKIP_WHY}`);
    const cwd = dir ? folderAt(folder, dir, input.cwd) : folder;
    const repo = repoRoot(cwd) || cwd;
    const here = branchIn(cwd);
    // When the folder is not certain, the command may run in one of these instead.
    const mayBeMain = others
      .map((other) => (dir ? folderAt(other, dir, input.cwd) : other))
      .some((other) => branchIn(other) === "main");

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
    if (mayBeMain && here !== "main" && COMMITTING.has(sub)) {
      block(
        `git ${sub}: the folder this runs in is not certain, and one it may run in is on main. Run it from the repo folder or with git -C <path>. ${WHY}`,
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
