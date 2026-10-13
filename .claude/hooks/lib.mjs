// Shared helpers for the guard hooks. A hook reads the tool call as JSON on stdin and exits 2 to block it.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

export const readInput = () => JSON.parse(readFileSync(0, "utf8") || "{}");

export const block = (message) => {
  process.stderr.write(`Blocked: ${message}\n`);
  process.exit(2);
};

/** Runs a guard. A crash blocks the call: a guard that cannot decide must not wave things through. */
export const runGuard = (name, guard) => {
  try {
    guard(readInput());
  } catch (error) {
    block(`the ${name} hook failed (${error.message}). Tell Bob; do not work around it.`);
  }
};

/** Git's output, or undefined when the call fails. */
const gitTry = (cwd, args) => {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return undefined;
  }
};
const git = (cwd, args) => (gitTry(cwd, args) ?? "").trim();

/** The top folder of the repo that holds `cwd`, or `""` when git cannot say. */
export const repoRoot = (cwd) => git(cwd || ".", ["rev-parse", "--show-toplevel"]);

/** What `currentBranch` returns when git gives no answer, so a guard can refuse instead of guessing. */
export const UNKNOWN_BRANCH = "(unknown)";

/** The branch name, `""` in a repo with no commits yet, or `UNKNOWN_BRANCH` when git cannot say. */
export const currentBranch = (cwd) => {
  const name = git(cwd || ".", ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (name) return name;
  const inRepo = git(cwd || ".", ["rev-parse", "--is-inside-work-tree"]) === "true";
  return inRepo ? "" : UNKNOWN_BRANCH;
};

export const branchExists = (cwd, name) =>
  git(cwd || ".", ["show-ref", "--verify", `refs/heads/${name}`]) !== "";

export const commitsAheadOfMain = (cwd) =>
  Number(git(cwd || ".", ["rev-list", "--count", "main..HEAD"]) || 0);

/**
 * Absolute paths of files with uncommitted work in the repo at `cwd`.
 * `tracked` are changed files git knows; `untracked` are new files it does not.
 * Returns undefined when git cannot say, so a guard can refuse instead of assuming there are none.
 */
export const uncommittedFiles = (cwd) => {
  if (git(cwd || ".", ["rev-parse", "--is-inside-work-tree"]) !== "true") return undefined;
  // The way up to the repo root from `cwd`, so the paths keep the caller's spelling of the folder.
  const root = resolve(cwd || ".", git(cwd || ".", ["rev-parse", "--show-cdup"]));
  const status = gitTry(root, ["status", "--porcelain", "-z", "--untracked-files=all"]);
  if (status === undefined) return undefined;

  const tracked = [];
  const untracked = [];
  const entries = status.split("\0");
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry) continue;
    // An entry is `XY <path>`. A rename or copy is followed by the old name as a bare path.
    const code = entry.slice(0, 2);
    const list = code === "??" ? untracked : tracked;
    list.push(resolve(root, entry.slice(3)));
    if (/[RC]/.test(code)) list.push(resolve(root, entries[++i] ?? ""));
  }
  return { tracked, untracked };
};

/** File paths an Edit, Write, MultiEdit or NotebookEdit call touches. */
export const editedPath = (input) =>
  input.tool_input?.file_path ?? input.tool_input?.notebook_path ?? "";

/** The file's text after the tool call is applied. */
export const textAfter = (input, before) => {
  const { content, old_string, new_string, replace_all, edits } = input.tool_input ?? {};
  if (typeof content === "string") return content;
  const steps = edits ?? [{ old_string, new_string, replace_all }];
  return steps.reduce(
    (text, step) =>
      step.replace_all
        ? text.split(step.old_string ?? "").join(step.new_string ?? "")
        : text.replace(step.old_string ?? "", () => step.new_string ?? ""),
    before,
  );
};

/**
 * Splits a shell command into simple commands at `;`, `&`, `|`, newlines and parentheses.
 * Each has its words (quotes removed), its output redirect targets, the separator that ended it
 * (`end`) and the subshells it sits in (`scope`). Best effort, not a full parser.
 */
export const splitCommands = (command) => {
  const segments = [];
  let words = [];
  let redirects = [];
  let word = "";
  let hasWord = false;
  let expectRedirectTarget = false;
  // One id per open parenthesis, so a reader can tell when a subshell has closed.
  let scope = [];
  let scopes = 0;

  const endWord = () => {
    if (!hasWord) return;
    if (expectRedirectTarget) {
      redirects.push(word);
      expectRedirectTarget = false;
    } else {
      words.push(word);
    }
    word = "";
    hasWord = false;
  };
  const endSegment = (end = "") => {
    endWord();
    if (words.length > 0 || redirects.length > 0) segments.push({ words, redirects, end, scope });
    words = [];
    redirects = [];
    expectRedirectTarget = false;
  };

  for (let i = 0; i < command.length; i++) {
    const char = command[i];
    if (char === "\\" && i + 1 < command.length) {
      word += command[++i];
      hasWord = true;
    } else if (char === "'" || char === '"') {
      const close = command.indexOf(char, i + 1);
      const end = close === -1 ? command.length : close;
      word += command.slice(i + 1, end);
      hasWord = true;
      i = end;
    } else if (char === ">" || (char === "&" && command[i + 1] === ">")) {
      // Drop a file-descriptor number glued to the operator, as in `2>`.
      if (hasWord && /^\d+$/.test(word)) {
        word = "";
        hasWord = false;
      }
      endWord();
      if (char === "&") i++;
      if (command[i + 1] === ">") i++;
      if (command[i + 1] === "&") {
        // `>&1` duplicates a descriptor. It names no file.
        i++;
        while (/[\d-]/.test(command[i + 1] ?? "")) i++;
      } else {
        expectRedirectTarget = true;
      }
    } else if (";&|\n()".includes(char)) {
      const doubled = (char === "&" || char === "|") && command[i + 1] === char;
      endSegment(doubled ? char + char : char);
      if (doubled) i++;
      if (char === "(") scope = [...scope, ++scopes];
      if (char === ")") scope = scope.slice(0, -1);
    } else if (/\s/.test(char)) {
      endWord();
    } else {
      word += char;
      hasWord = true;
    }
  }
  endSegment();
  return segments;
};

const WRAPPERS = new Set(["sudo", "env", "command", "time", "nohup", "exec", "builtin"]);

/** The command name and its arguments, past env assignments like `FOO=1` and wrappers like `sudo`. */
export const commandOf = (words) => {
  let i = 0;
  while (i < words.length && (/^[A-Za-z_]\w*=/.test(words[i]) || WRAPPERS.has(words[i]))) i++;
  const name = (words[i] ?? "").split("/").pop();
  return { name, args: words.slice(i + 1) };
};

/** Where a `cd` leads when the command does not say: a folder that cannot exist, so git fails there. */
export const UNKNOWN_FOLDER = "/dev/null/unknown-folder";

/** The folder a `cd` with these arguments leads to, from `dir`. */
const folderAfterCd = (dir, args, cwd) => {
  const target = args.find((word) => !/^-[LPe@]+$/.test(word));
  if (target === undefined) return homedir();
  const expanded = target
    .replace(/^~(?=\/|$)/, homedir())
    .replace(/\$\{?HOME\}?(?=\/|$)/, homedir())
    .replace(/\$\{?PWD\}?(?=\/|$)/, dir)
    .replace(/\$\{?CLAUDE_PROJECT_DIR\}?(?=\/|$)/, process.env.CLAUDE_PROJECT_DIR || cwd);
  // `cd -`, another variable or a command substitution: only the shell knows where that goes.
  if (expanded === "-" || /[$`]/.test(expanded)) return UNKNOWN_FOLDER;
  return resolve(dir, expanded);
};

/**
 * The simple commands of a shell command, each with `dir`: the folder it runs in once every `cd`
 * before it is followed. A `cd` inside a subshell or a pipeline does not outlast it.
 */
export const walkCommands = (command, cwd) => {
  let dir = cwd || ".";
  const open = [];
  let piped = false;
  return splitCommands(command).map((segment) => {
    // Leave the subshells that have closed, restoring the folder each one started in.
    while (open.length > 0 && !segment.scope.includes(open.at(-1).id)) dir = open.pop().dir;
    for (const id of segment.scope) {
      if (!open.some((entry) => entry.id === id)) open.push({ id, dir });
    }

    const here = dir;
    const { name, args } = commandOf(segment.words);
    const inPipeline = piped || segment.end === "|" || segment.end === "&";
    if (name === "cd" && !inPipeline) dir = folderAfterCd(dir, args, cwd || ".");
    piped = segment.end === "|";
    return { ...segment, dir: here };
  });
};

const GIT_OPTIONS_WITH_VALUE = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace"]);

/** For a `git` command: its subcommand, the subcommand's arguments, and any `-C <dir>`. */
export const gitCommand = (words) => {
  const { name, args } = commandOf(words);
  if (name !== "git") return undefined;
  let dir;
  let i = 0;
  while (i < args.length && args[i].startsWith("-")) {
    if (args[i] === "-C") dir = args[i + 1];
    i += GIT_OPTIONS_WITH_VALUE.has(args[i]) ? 2 : 1;
  }
  return { sub: args[i] ?? "", args: args.slice(i + 1), dir };
};

const WRITE_COMMANDS = new Set([
  "rm",
  "mv",
  "cp",
  "tee",
  "touch",
  "truncate",
  "dd",
  "ln",
  "chmod",
  "chown",
  "patch",
  "rsync",
  "install",
  "unlink",
  "rmdir",
  "ed",
  "ex",
  "vi",
  "vim",
  "nano",
]);
const GIT_WRITE_SUBCOMMANDS = new Set([
  "mv",
  "rm",
  "checkout",
  "restore",
  "apply",
  "stash",
  "clean",
]);
// `git stash <one of these>` leaves the working files' uncommitted changes in place.
const STASH_KEEPS_WORK = new Set([
  "list",
  "show",
  "pop",
  "apply",
  "drop",
  "branch",
  "clear",
  "create",
]);

/**
 * For a git command that throws away uncommitted work across a folder or the whole repo
 * (`clean`, `stash`, `checkout -- .`, `restore <dir>`, `switch -f`, `reset --hard`): the files it
 * would hit. Returns undefined when git cannot list the uncommitted files.
 */
const filesGitWouldDiscard = (sub, args, dir) => {
  const flags = args.filter((word) => word.startsWith("-"));
  const has = (...names) => flags.some((flag) => names.includes(flag));
  const short = (letter) =>
    flags.some((flag) => /^-[A-Za-z]+$/.test(flag) && flag.includes(letter));

  let kinds;
  let everywhere = false;
  if (sub === "clean") {
    if (has("--dry-run") || short("n")) return [];
    kinds = ["untracked"];
    everywhere = true;
  } else if (sub === "stash") {
    if (STASH_KEEPS_WORK.has(args[0])) return [];
    const all = has("--include-untracked", "--all") || short("u") || short("a");
    kinds = all ? ["tracked", "untracked"] : ["tracked"];
    everywhere = true;
  } else if (sub === "reset") {
    if (!has("--hard", "--merge")) return [];
    kinds = ["tracked"];
    everywhere = true;
  } else if (sub === "checkout" || sub === "restore" || sub === "switch") {
    // Making a branch keeps the work, and `restore --staged` alone only unstages.
    if (has("-b", "-B", "-c", "-C", "--orphan", "--create", "--force-create")) return [];
    if (sub === "restore" && has("--staged") && !has("--worktree") && !short("W")) return [];
    kinds = ["tracked"];
    everywhere = has("--force", "--discard-changes") || short("f");
    if (sub === "switch" && !everywhere) return [];
  } else {
    return [];
  }

  // Words that are not flags may be paths. A branch name resolves to a path that holds nothing.
  // `git stash` takes a message and a subcommand as words, so only what follows `--` counts there.
  // The value of `git clean -e <pattern>` is not a path.
  const words = (sub === "stash" ? args.slice(args.indexOf("--") + 1 || args.length) : args).filter(
    (word, i, list) => !word.startsWith("-") && !/^(-e|--exclude)$/.test(list[i - 1] ?? ""),
  );
  // A glob or a `:(magic)` pathspec can reach anything, so it does not narrow the command.
  const wide = words.some((word) => /[*?[]/.test(word) || word.startsWith(":"));
  const scopes = words.map((word) => resolve(dir, word));
  const narrowed = (sub === "clean" || sub === "stash") && scopes.length > 0;
  // A folder that does not exist yet (`git clone x && cd x && …`) holds no work to lose.
  if (!dir.startsWith(UNKNOWN_FOLDER) && !existsSync(dir)) return [];
  const files = uncommittedFiles(dir);
  if (files === undefined) return undefined;
  return kinds
    .flatMap((kind) => files[kind])
    .filter(
      (file) =>
        wide ||
        (everywhere && !narrowed) ||
        scopes.some((scope) => file === scope || file.startsWith(`${scope}/`)),
    );
};

const INTERPRETERS = new Set([
  "python",
  "python3",
  "node",
  "ruby",
  "perl",
  "php",
  "deno",
  "bun",
  "tsx",
  "osascript",
  "awk",
]);
const SHELLS = new Set(["bash", "sh", "zsh", "eval"]);

/**
 * Looks for a shell command that would change a protected path.
 * `isProtected(absolutePath, { moves })` decides; `moves` is true for commands that remove or move
 * whole trees, so a guard can also protect the folders above its files.
 * `discards: false` leaves out git commands that throw away uncommitted work.
 * Returns a short reason, or undefined. Best effort: it reads the command, it does not run it.
 */
export const findShellWrite = (command, cwd, isProtected, { discards = true } = {}) => {
  // `dir` follows `cd` through the command, so relative paths resolve from the right folder.
  for (const { words, redirects, dir } of walkCommands(command, cwd)) {
    const at = (word) => resolve(dir, word);
    const names = (word, moves = false) =>
      !word.startsWith("-") && isProtected(at(word), { moves });

    const target = redirects.find((word) => names(word));
    if (target) return `it redirects output into ${target}`;

    const { name, args } = commandOf(words);
    const git = gitCommand(words);

    if (git) {
      if (GIT_WRITE_SUBCOMMANDS.has(git.sub)) {
        const moves = git.sub === "mv" || git.sub === "rm";
        const hit = git.args.find((word) => names(word, moves));
        if (hit) return `git ${git.sub} would change ${hit}`;
      }
      if (discards) {
        const atRisk = filesGitWouldDiscard(git.sub, git.args, git.dir ? at(git.dir) : dir);
        if (atRisk === undefined) {
          return `git ${git.sub} can discard uncommitted work, and git could not list what is at risk there (run it from the repo folder or with git -C <path>)`;
        }
        const lost = atRisk.find((file) => isProtected(file, { moves: false }));
        if (lost) return `git ${git.sub} would discard uncommitted work in ${lost}`;
      }
    } else if (WRITE_COMMANDS.has(name)) {
      const moves = name === "rm" || name === "mv" || name === "rsync";
      const hit = args.find((word) => names(word, moves));
      if (hit) return `${name} would change ${hit}`;
    } else if (name === "sed" || name === "perl") {
      const inPlace = args.some((word) => /^-[A-Za-z]*i/.test(word) || word === "--in-place");
      const hit = inPlace && args.find((word) => names(word));
      if (hit) return `${name} would edit ${hit} in place`;
    } else if (name === "find") {
      const acts = args.some((word) => word === "-delete" || word.startsWith("-exec"));
      const hit = acts && args.find((word) => names(word, true));
      if (hit) return `find would change files under ${hit}`;
    } else if (SHELLS.has(name)) {
      for (const script of args.filter((word) => !word.startsWith("-"))) {
        const reason = findShellWrite(script, dir, isProtected, { discards });
        if (reason) return reason;
      }
    }

    // A script can write anywhere, so an interpreter plus a protected path anywhere in the command
    // is refused. Read the file in a separate command if that is all that is needed.
    if (INTERPRETERS.has(name)) {
      const mentioned = command
        .split(/[\s'"`=:,;()[\]{}<>]+/)
        .find((word) => word && !word.startsWith("-") && isProtected(at(word), { moves: false }));
      if (mentioned) return `it runs ${name} in a command that names ${mentioned}`;
    }
  }
  return undefined;
};
