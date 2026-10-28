// `pnpm wt <branch>` and `pnpm wt:rm <branch>`: one git worktree per plan step (docs/sdlc.md,
// "Parallel work"). `wt` makes `../BloodTower-work/<branch>` on a new branch from origin/main (or main), installs from
// the lockfile there and writes `.wt.json` with the step's own ports and SQLite folder, so that
// parallel steps never share a port or a database. `wt:rm` removes a clean worktree and deletes
// its branch once main holds it (a squash-merged PR counts).
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const MAIN = "main";
export const WT_FILE = ".wt.json";
/**
 * The ports a step uses: the base plus 10 × its offset. dev and e2e start at the main checkout's
 * port. The game workbench runs on 4797 in the main checkout; its worktree ports start 100 higher
 * (4907 and up) so they never meet the dev and e2e ranges.
 */
export const BASE_PORTS = { dev: 4747, e2e: 4748, workbench: 4897 };
export const PORT_STEP = 10;
/** The most steps that can run at once; a hard cap so ports stay in a known range. */
export const MAX_OFFSET = 9;

const gitIn = (cwd, ...args) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

/** The folder, next to the main checkout, that holds every step worktree. */
export const WORKTREES_FOLDER = "BloodTower-work";

/** The folder that holds every worktree of the repo at `root`: `<parent>/BloodTower-work`. */
export const worktreesHome = (root) => join(dirname(root), WORKTREES_FOLDER);

/** Reads `.wt.json` in `dir`, or undefined when `dir` is not a step worktree. */
export const readWtConfig = (dir) => {
  const file = join(dir, WT_FILE);
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : undefined;
};

/** The `.wt.json` files under `home`, at any depth (branch names can hold slashes). */
const configsUnder = (home) => {
  if (!existsSync(home)) return [];
  const found = [];
  const walk = (dir) => {
    const config = readWtConfig(dir);
    if (config) return found.push(config);
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (name !== "node_modules" && statSync(path).isDirectory()) walk(path);
    }
  };
  walk(home);
  return found;
};

/** The smallest offset from 1 that no live worktree uses. */
export const nextOffset = (used) => {
  for (let n = 1; n <= MAX_OFFSET; n++) if (!used.includes(n)) return n;
  throw new Error(`All ${MAX_OFFSET} worktree slots are in use. Remove one with pnpm wt:rm first.`);
};

const branchExists = (root, branch) => {
  try {
    gitIn(root, "rev-parse", "--verify", "--quiet", `refs/heads/${branch}`);
    return true;
  } catch {
    return false;
  }
};

const checkBranchName = (root, branch) => {
  if (readWtConfig(root)) throw new Error("Run pnpm wt from the main checkout, not a worktree.");
  if (!branch) throw new Error("Usage: pnpm wt <branch>");
  if (branch === MAIN) throw new Error(`${MAIN} stays in the main checkout.`);
  try {
    gitIn(root, "check-ref-format", "--branch", branch);
  } catch {
    throw new Error(`${branch} is not a valid branch name.`);
  }
};

/**
 * Makes the worktree for `branch`. `install(dir)` installs dependencies there and throws on
 * failure. Returns the lines to print and the config written.
 */
export const addWorktree = ({ root, branch, install }) => {
  checkBranchName(root, branch);
  const home = worktreesHome(root);
  const path = join(home, branch);
  if (existsSync(path)) throw new Error(`${path} already exists.`);
  if (branchExists(root, branch)) {
    throw new Error(`The branch ${branch} already exists. Pick a new name or remove it first.`);
  }
  const offset = nextOffset(configsUnder(home).map((config) => config.offset));
  mkdirSync(dirname(path), { recursive: true });
  // PRs merge on GitHub, so the newest main is origin/main when there is a remote.
  let base = MAIN;
  try {
    gitIn(root, "fetch", "--quiet", "origin", MAIN);
    base = `origin/${MAIN}`;
  } catch {
    // No remote, or offline: branch from the local main.
  }
  gitIn(root, "worktree", "add", "--quiet", "--no-track", "-b", branch, path, base);
  const config = {
    branch,
    base,
    offset,
    ports: Object.fromEntries(
      Object.entries(BASE_PORTS).map(([name, port]) => [name, port + PORT_STEP * offset]),
    ),
    // Every SQLite file of the step lives here, inside the worktree and ignored by git.
    dataDir: join(path, ".wt-data"),
    root: path,
  };
  mkdirSync(config.dataDir, { recursive: true });
  writeFileSync(join(path, WT_FILE), `${JSON.stringify(config, null, 2)}\n`);
  install(path);
  return {
    config,
    lines: [
      `Worktree for ${branch} at ${path}.`,
      `Ports: dev ${config.ports.dev}, e2e ${config.ports.e2e}, workbench ${config.ports.workbench}. SQLite folder: ${relative(path, config.dataDir)}/.`,
    ],
  };
};

/** True when main holds the branch: an ancestor of main or origin/main, or a merged PR. */
const landedOn = (root, branch) => {
  for (const target of [MAIN, `origin/${MAIN}`]) {
    try {
      gitIn(root, "merge-base", "--is-ancestor", `refs/heads/${branch}`, target);
      return true;
    } catch {
      // Not there; try the next.
    }
  }
  // A squash merge leaves no ancestor link, so ask GitHub whether the PR for the branch merged.
  try {
    const state = execFileSync("gh", ["pr", "view", branch, "--json", "state", "--jq", ".state"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return state === "MERGED";
  } catch {
    return false;
  }
};

/** Removes the worktree for `branch`. Refuses one with uncommitted or unlanded work. */
export const removeWorktree = ({ root, branch }) => {
  checkBranchName(root, branch);
  const home = worktreesHome(root);
  const path = join(home, branch);
  if (!existsSync(path)) throw new Error(`There is no worktree at ${path}.`);
  if (gitIn(path, "status", "--porcelain", "--untracked-files=no") !== "") {
    throw new Error(`${path} has uncommitted changes. Commit them or put them aside first.`);
  }
  const landed = landedOn(root, branch);
  // --force only covers the ignored and untracked files git would otherwise keep it for:
  // `node_modules`, `.wt.json` and the step's SQLite folder.
  gitIn(root, "worktree", "remove", "--force", path);
  // Branch names can hold slashes; drop the folders they leave empty, but keep the home folder.
  for (let dir = dirname(path); dir !== home && dir.startsWith(home + sep); dir = dirname(dir)) {
    if (readdirSync(dir).length > 0) break;
    rmdirSync(dir);
  }
  const lines = [`Removed the worktree at ${path}.`];
  if (landed) {
    gitIn(root, "branch", "--delete", "--force", "--quiet", branch);
    lines.push(`Deleted the branch ${branch}; ${MAIN} holds it.`);
  } else {
    lines.push(`Kept the branch ${branch}: it is not on ${MAIN} yet.`);
  }
  return lines;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
  const [action, branch] = process.argv.slice(2);
  try {
    const lines =
      action === "rm"
        ? removeWorktree({ root, branch })
        : addWorktree({
            root,
            branch,
            install: (dir) =>
              execFileSync("pnpm", ["install", "--frozen-lockfile"], {
                cwd: dir,
                stdio: "inherit",
              }),
          }).lines;
    console.log(`\n${lines.join("\n")}`);
  } catch (error) {
    console.error(`\n${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
