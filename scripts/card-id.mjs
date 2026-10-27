// `pnpm card-id <PREFIX> [count]`: reserves the next free card IDs (research/game-design/cards)
// so that design sessions running at the same time, each in its own worktree, never pick the same
// one. A reservation is a git ref, `refs/card-ids/<ID>`, made with a create-only `update-ref`:
// git makes it atomically and every worktree of the repo shares it. The next ID is one above the
// highest of: every card any branch has ever added, every card file sitting uncommitted in any
// worktree, and every reservation. Reservations for cards that `origin/main` (or `main`) holds are
// pruned on each run.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const CARDS_DIR = "research/game-design/cards";
export const RESERVED = "refs/card-ids";

const gitIn = (cwd, ...args) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const lines = (text) => text.split("\n").filter(Boolean);

/** The number in `<PREFIX>-<n>.md` (or a bare `<PREFIX>-<n>`), or undefined. */
export const idNumber = (prefix, name) => {
  const match = new RegExp(`^${prefix}-(\\d+)(\\.md)?$`).exec(name.split("/").pop());
  return match ? Number(match[1]) : undefined;
};

export const formatId = (prefix, n) => `${prefix}-${String(n).padStart(3, "0")}`;

/** Card file names added on any branch, remote branch or reservation, in all of history. */
const committedNames = (root) =>
  lines(
    gitIn(root, "log", "--all", "--diff-filter=A", "--name-only", "--format=", "--", CARDS_DIR),
  );

/** Card file names in the working folder of every worktree, committed or not. */
const workingNames = (root) =>
  lines(gitIn(root, "worktree", "list", "--porcelain"))
    .filter((line) => line.startsWith("worktree "))
    .map((line) => join(line.slice("worktree ".length), CARDS_DIR))
    .flatMap((dir) => (existsSync(dir) ? readdirSync(dir) : []));

const reservedNames = (root) =>
  lines(gitIn(root, "for-each-ref", "--format=%(refname:lstrip=2)", RESERVED));

/** Drops the reservations whose card `origin/main`, or else `main`, already holds. */
export const pruneReservations = (root) => {
  let landed = [];
  for (const target of ["origin/main", "main"]) {
    try {
      landed = lines(gitIn(root, "ls-tree", "--name-only", target, `${CARDS_DIR}/`)).map((path) =>
        path.split("/").pop().replace(/\.md$/, ""),
      );
      break;
    } catch {
      // That ref does not exist here; try the next.
    }
  }
  const held = new Set(landed);
  const pruned = reservedNames(root).filter((id) => held.has(id));
  for (const id of pruned) gitIn(root, "update-ref", "-d", `${RESERVED}/${id}`);
  return pruned;
};

/** Reserves `count` new IDs of `prefix` and returns them in order. */
export const reserveIds = ({ root, prefix, count = 1 }) => {
  if (!/^[A-Z]+$/.test(prefix ?? "")) throw new Error("Usage: pnpm card-id <PREFIX> [count]");
  if (!Number.isInteger(count) || count < 1) throw new Error(`${count} is not a count of IDs.`);
  pruneReservations(root);
  const taken = [...committedNames(root), ...workingNames(root), ...reservedNames(root)]
    .map((name) => idNumber(prefix, name))
    .filter((n) => n !== undefined);
  let next = Math.max(0, ...taken) + 1;
  const head = gitIn(root, "rev-parse", "HEAD");
  const ids = [];
  while (ids.length < count) {
    const id = formatId(prefix, next++);
    try {
      // The empty old value makes this create-only: it fails when another session holds the ID.
      gitIn(root, "update-ref", `${RESERVED}/${id}`, head, "");
      ids.push(id);
    } catch (error) {
      // Another session reserved this one a moment ago: take the next. Any other failure stops.
      if (!reservedNames(root).includes(id)) throw error;
    }
  }
  return ids;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
  const [prefix, count] = process.argv.slice(2);
  try {
    // Cards other sessions have pushed count too. Offline, the local refs are all there is.
    try {
      gitIn(root, "fetch", "--quiet", "origin");
    } catch {
      console.error("card-id: could not fetch origin; using local refs only.");
    }
    console.log(reserveIds({ root, prefix, count: count ? Number(count) : 1 }).join("\n"));
  } catch (error) {
    console.error(`card-id: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
