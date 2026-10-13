// Shared helpers for the guard hooks. A hook reads the tool call as JSON on stdin and exits 2 to block it.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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
  const inside = gitTry(cwd || ".", ["rev-parse", "--is-inside-work-tree"]);
  // Outside a work tree git cannot say: `--work-tree` or `GIT_DIR` may still point at a repo.
  if (inside?.trim() !== "true") return undefined;
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
    } else if (char === "'") {
      const close = command.indexOf(char, i + 1);
      const end = close === -1 ? command.length : close;
      word += command.slice(i + 1, end);
      hasWord = true;
      i = end;
    } else if (char === '"') {
      // Inside double quotes a backslash still escapes the next character, as in `\"`.
      for (i++; i < command.length && command[i] !== '"'; i++) {
        if (command[i] === "\\" && i + 1 < command.length) i++;
        word += command[i];
      }
      hasWord = true;
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

/**
 * The folder a path written in a command points at, from `dir`. Expands `~`, `$HOME`, `$PWD` and
 * `$CLAUDE_PROJECT_DIR`. Another variable, `~user`, a command substitution or a glob gives
 * `UNKNOWN_FOLDER`: only the shell knows where that goes.
 */
export const folderAt = (dir, word, cwd) => {
  const expanded = word
    .replace(/^~(?=\/|$)/, homedir())
    .replace(/\$\{?HOME\}?(?=\/|$)/, homedir())
    .replace(/\$\{?PWD\}?(?=\/|$)/, dir)
    .replace(/\$\{?CLAUDE_PROJECT_DIR\}?(?=\/|$)/, process.env.CLAUDE_PROJECT_DIR || cwd || ".");
  if (/[$`]/.test(expanded) || expanded.startsWith("~")) return UNKNOWN_FOLDER;
  const folder = resolve(dir, expanded);
  // `[`, `*` and the like are a glob, unless a folder really has that name (`app/[id]`).
  if (/[*?[\]{}]/.test(expanded) && !existsSync(folder)) return UNKNOWN_FOLDER;
  return folder;
};

/** The folders a glob such as `apps/gam?` matches from `dir`. Empty when `word` is not a plain glob. */
export const foldersMatching = (dir, word) => {
  if (!/[*?[]/.test(word) || /[$`~{}]/.test(word)) return [];
  let found = [word.startsWith("/") ? "/" : dir];
  for (const part of word.split("/").filter(Boolean)) {
    let pattern;
    try {
      pattern = new RegExp(
        `^${part
          .replace(/[.+^$()|\\]/g, "\\$&")
          .replace(/\*/g, ".*")
          .replace(/\?/g, ".")}$`,
      );
    } catch {
      // An unbalanced `[` is not a pattern the shell would expand either.
      return [];
    }
    found = found.flatMap((folder) => {
      if (!/[*?[]/.test(part)) return [resolve(folder, part)];
      try {
        return readdirSync(folder, { withFileTypes: true })
          .filter((entry) => entry.isDirectory() && pattern.test(entry.name))
          .map((entry) => resolve(folder, entry.name));
      } catch {
        return [];
      }
    });
    // Enough to be useful; a glob that matches more than this is not followed.
    if (found.length > 64) return [];
  }
  return found.filter((folder) => existsSync(folder));
};

/** The word a `cd` with these arguments names, or undefined when it names none this can read. */
const cdTarget = (args) => {
  const flags = args.filter((word) => /^-./.test(word) && word !== "--");
  if (flags.some((flag) => !/^-[LPe@]+$/.test(flag))) return undefined;
  return args.find((word) => !flags.includes(word) && word !== "--" && word !== "-");
};

/** The folder a `cd` with these arguments leads to, from `dir`. */
const folderAfterCd = (dir, args, cwd) => {
  const flags = args.filter((word) => /^-./.test(word) && word !== "--");
  // A flag this does not know may change what the next word means.
  if (flags.some((flag) => !/^-[LPe@]+$/.test(flag))) return UNKNOWN_FOLDER;
  const target = args.find((word) => !flags.includes(word) && word !== "--");
  if (target === undefined) return homedir();
  if (target === "-") return UNKNOWN_FOLDER;
  return folderAt(dir, target, cwd);
};

/**
 * The simple commands of a shell command, each with the folder it runs in once every `cd` before
 * it is followed. A `cd` inside a subshell does not outlast it.
 *
 * `dir` is the best reading and is `UNKNOWN_FOLDER` when there is none. Reading a shell is a guess,
 * so whenever the folder is not certain, `others` lists every other folder the command might run
 * in: the ones it was in before, and always the folder the call started in. A guard checks them
 * all. `pending` is true when `dir` does not exist yet and was reached by `cd <folder> &&`, as in
 * `git clone x && cd x && …`. `unreadable` is true when a `cd` named a folder only the shell can
 * work out (a variable, a command substitution, `cd -`), so the real folder may be none of these.
 */
export const walkCommands = (command, cwd) => {
  const start = cwd || ".";
  let at = { dir: start, pending: false, unreadable: false, others: [] };
  const real = (folders, dir) => [
    ...new Set(folders.filter((folder) => folder !== UNKNOWN_FOLDER && folder !== dir)),
  ];
  // The folder is no longer certain: keep every folder it might still be.
  const unsure = (from, dir, pending, extra = [], unreadable = from.unreadable) => ({
    dir,
    pending,
    unreadable,
    others: real([...from.others, from.dir, ...extra, start], dir),
  });

  const open = [];
  return splitCommands(command).map((segment) => {
    // Leave the subshells that have closed, restoring the folder each one started in.
    while (open.length > 0 && !segment.scope.includes(open.at(-1).id)) at = open.pop().at;
    for (const id of segment.scope) {
      if (!open.some((entry) => entry.id === id)) open.push({ id, at });
    }

    const here = at;
    const { name, args } = commandOf(segment.words);
    if (name === "cd") {
      const dir = folderAfterCd(at.dir, args, cwd);
      // Where the same `cd` leads from each folder this might be instead.
      // A glob could match any of several folders, so each match is one more it might be.
      const target = cdTarget(args) ?? "";
      const fromOthers = [
        ...at.others.map((other) => folderAfterCd(other, args, cwd)),
        ...[at.dir, ...at.others].flatMap((from) => foldersMatching(from, target)),
      ].filter((folder) => folder !== UNKNOWN_FOLDER && existsSync(folder));
      // Only the shell knows where this `cd` goes, as opposed to a `cd` that may simply fail.
      const unreadable = at.unreadable || (dir === UNKNOWN_FOLDER && at.dir !== UNKNOWN_FOLDER);
      if (segment.end === "|" || segment.end === "&") {
        // Piped or sent to the background: whether the `cd` lasts depends on the shell.
        at = unsure(at, UNKNOWN_FOLDER, false, [dir, ...fromOthers], unreadable);
      } else if (dir !== UNKNOWN_FOLDER && existsSync(dir)) {
        // Certain only when the folder before it was. Otherwise an earlier `cd` may have failed
        // and skipped this one, so the earlier folders stay in play.
        at =
          at.others.length === 0
            ? { dir, pending: false, unreadable: false, others: [] }
            : unsure(at, dir, false, fromOthers);
      } else if (dir !== UNKNOWN_FOLDER && segment.end === "&&") {
        // The folder is not there yet. Either an earlier step makes it, or the chain stops here.
        at = unsure(at, dir, true, fromOthers);
      } else {
        // Only the shell knows, or the `cd` fails and `;` carries on from where the shell was.
        at = unsure(at, UNKNOWN_FOLDER, false, fromOthers, unreadable);
      }
    } else if (here.pending && segment.end !== "&&") {
      // The `&&` chain ends here. If the `cd` failed, what follows runs in an earlier folder.
      at = unsure(at, UNKNOWN_FOLDER, false);
    }
    return { ...segment, ...here };
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
const filesGitWouldDiscard = (sub, args, dir, pending) => {
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
    const force = has("--force", "--discard-changes") || short("f");
    // Making a branch keeps the work, unless it is forced: `git checkout -f -b x` and
    // `git switch -f -c x <start>` both discard it.
    const makesBranch = has("-b", "-B", "-c", "-C", "--orphan", "--create", "--force-create");
    if (makesBranch && !force) return [];
    // `restore --staged` alone only unstages.
    const staged = has("--staged") || short("S");
    if (sub === "restore" && staged && !has("--worktree") && !short("W")) return [];
    kinds = ["tracked"];
    everywhere = force;
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
  // A folder that is yet to be made (`git clone x && cd x && …`) holds no work to lose.
  if (pending) return [];
  // A folder only the shell can work out: a discard that reaches across it cannot be checked.
  // Changing branch (`git checkout <branch>`) keeps the work, so that stays allowed.
  if (dir === UNKNOWN_FOLDER) {
    const reaches = everywhere || sub === "restore" || args.includes("--") || args.includes(".");
    return reaches ? undefined : [];
  }
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
  // When the folder is not certain, a path is checked from every folder it might be.
  for (const { words, redirects, dir, pending, unreadable, others } of walkCommands(command, cwd)) {
    const known = (folders) => [...new Set(folders.filter((folder) => folder !== UNKNOWN_FOLDER))];
    const folders = known([dir, ...others]);
    const protectedFrom = (bases, word, moves) =>
      !word.startsWith("-") && bases.some((base) => isProtected(resolve(base, word), { moves }));
    const names = (word, moves = false) => protectedFrom(folders, word, moves);

    const target = redirects.find((word) => names(word));
    if (target) return `it redirects output into ${target}`;

    const { name, args } = commandOf(words);
    const git = gitCommand(words);

    if (git) {
      // `git -C <folder>` runs there, so its paths resolve from that folder. A `-C` this cannot
      // read, or one that names no folder, falls back to the folders the command runs in.
      const gitDir = git.dir ? folderAt(dir, git.dir, cwd) : dir;
      const viaC = git.dir ? folders.map((base) => folderAt(base, git.dir, cwd)) : [];
      const sureOfC = viaC.every((folder) => folder !== UNKNOWN_FOLDER && existsSync(folder));
      const globbed = git.dir ? folders.flatMap((base) => foldersMatching(base, git.dir)) : [];
      const gitFolders = known(
        git.dir ? [...viaC, ...globbed, ...(sureOfC ? [] : folders)] : folders,
      );

      if (GIT_WRITE_SUBCOMMANDS.has(git.sub)) {
        const moves = git.sub === "mv" || git.sub === "rm";
        const hit = git.args.find((word) => protectedFrom(gitFolders, word, moves));
        if (hit) return `git ${git.sub} would change ${hit}`;
      }
      if (discards) {
        // The target is a folder only the shell can work out, so it may be none of the candidates.
        const blind = git.dir ? /[$`]/.test(git.dir) : unreadable || folders.length === 0;
        if (blind && filesGitWouldDiscard(git.sub, git.args, UNKNOWN_FOLDER, false) === undefined) {
          return `git ${git.sub} can discard uncommitted work, and the folder it runs in cannot be read from the command (run it from the repo folder or with git -C <literal path>)`;
        }
        for (const folder of gitFolders) {
          const yetToBeMade = pending && !git.dir && folder === dir;
          const atRisk = filesGitWouldDiscard(git.sub, git.args, folder, yetToBeMade);
          // Git not answering in a folder that is there is not the same as nothing to lose.
          if (atRisk === undefined && folder === gitDir && existsSync(folder)) {
            return `git ${git.sub} can discard uncommitted work, and git could not list what is at risk there (run it from the repo folder or with git -C <path>)`;
          }
          const lost = atRisk?.find((file) => isProtected(file, { moves: false }));
          if (lost) return `git ${git.sub} would discard uncommitted work in ${lost}`;
        }
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
        for (const folder of unreadable ? [...folders, UNKNOWN_FOLDER] : folders) {
          const reason = findShellWrite(script, folder, isProtected, { discards });
          if (reason) return reason;
        }
      }
    }

    // A script can write anywhere, so an interpreter plus a protected path anywhere in the command
    // is refused. Read the file in a separate command if that is all that is needed.
    if (INTERPRETERS.has(name)) {
      const mentioned = command.split(/[\s'"`=:,;()[\]{}<>]+/).find((word) => word && names(word));
      if (mentioned) return `it runs ${name} in a command that names ${mentioned}`;
    }
  }
  return undefined;
};
