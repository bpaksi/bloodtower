// Shared helpers for the guard hooks. A hook reads the tool call as JSON on stdin and exits 2 to block it.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
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

const git = (cwd, args) => {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
};

export const currentBranch = (cwd) => git(cwd || ".", ["rev-parse", "--abbrev-ref", "HEAD"]);

export const branchExists = (cwd, name) =>
  git(cwd || ".", ["show-ref", "--verify", `refs/heads/${name}`]) !== "";

export const commitsAheadOfMain = (cwd) =>
  Number(git(cwd || ".", ["rev-list", "--count", "main..HEAD"]) || 0);

/** File paths an Edit, Write, MultiEdit or NotebookEdit call touches. */
export const editedPath = (input) =>
  input.tool_input?.file_path ?? input.tool_input?.notebook_path ?? "";

/**
 * Splits a shell command into simple commands at `;`, `&`, `|`, newlines and parentheses.
 * Each has its words (quotes removed) and its output redirect targets. Best effort, not a full parser.
 */
export const splitCommands = (command) => {
  const segments = [];
  let words = [];
  let redirects = [];
  let word = "";
  let hasWord = false;
  let expectRedirectTarget = false;

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
  const endSegment = () => {
    endWord();
    if (words.length > 0 || redirects.length > 0) segments.push({ words, redirects });
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
      endSegment();
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
 * Returns a short reason, or undefined. Best effort: it reads the command, it does not run it.
 */
export const findShellWrite = (command, cwd, isProtected) => {
  // Follows `cd` through the command, so relative paths resolve from the right folder.
  let dir = cwd || ".";
  const at = (word) => resolve(dir, word);
  const names = (word, moves = false) => !word.startsWith("-") && isProtected(at(word), { moves });

  for (const { words, redirects } of splitCommands(command)) {
    const target = redirects.find((word) => names(word));
    if (target) return `it redirects output into ${target}`;

    const { name, args } = commandOf(words);
    const git = gitCommand(words);

    if (name === "cd" && args[0]) {
      dir = at(args[0]);
      continue;
    }

    if (git) {
      if (GIT_WRITE_SUBCOMMANDS.has(git.sub)) {
        const moves = git.sub === "mv" || git.sub === "rm";
        const hit = git.args.find((word) => names(word, moves));
        if (hit) return `git ${git.sub} would change ${hit}`;
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
        const reason = findShellWrite(script, dir, isProtected);
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
