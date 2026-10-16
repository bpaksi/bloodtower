// PreToolUse (Edit|Write|MultiEdit|NotebookEdit|Bash): a developer agent in a step worktree
// (`pnpm wt`, marked by `.wt.json` at its root) writes only inside that worktree. The main
// checkout and the other worktrees belong to Bob, the coordinator and the other developers.
// Outside a step worktree this hook does nothing. Temp folders stay writable for scratch files.

import { execFileSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { block, editedPath, findShellWrite, repoRoot, runGuard } from "./lib.mjs";

const real = (path) => {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
};
const inside = (path, folder) => path === folder || path.startsWith(folder + sep);
const SCRATCH = [
  ...new Set([tmpdir(), "/tmp", "/private/tmp", "/var/folders", "/private/var/folders"].map(real)),
];
// Every step worktree lives in this folder next to the main checkout (scripts/wt.mjs).
const WORKTREES_FOLDER = "BloodTower-work";
const DEVICES = new Set(["/dev/null", "/dev/stdout", "/dev/stderr", "/dev/tty"]);

const WHY =
  "A developer agent writes only inside its own worktree (docs/sdlc.md, Parallel work). Report what you need changed elsewhere instead.";

runGuard("worktree-guard", (input) => {
  const root = repoRoot(input.cwd);
  if (!root || !existsSync(resolve(root, ".wt.json"))) return;
  const own = real(root);
  // The main checkout and the folder of all step worktrees stay off limits even when they sit
  // in a temp folder; other temp paths are scratch space.
  const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const mainCheckout = real(dirname(common));
  const team = [mainCheckout, real(join(dirname(mainCheckout), WORKTREES_FOLDER))];
  // The nearest existing folder decides, so a path that is not made yet still resolves for real.
  const outside = (path) => {
    if (DEVICES.has(path)) return false;
    let probe = path;
    while (!existsSync(probe) && probe !== resolve(probe, "..")) probe = resolve(probe, "..");
    const full = resolve(real(probe), path.slice(probe.length).replace(/^\//, ""));
    if (inside(full, own)) return false;
    if (team.some((folder) => inside(full, folder))) return true;
    return !SCRATCH.some((folder) => inside(full, folder));
  };

  if (input.tool_name === "Bash") {
    const reason = findShellWrite(input.tool_input?.command ?? "", input.cwd, (path) =>
      outside(path),
    );
    if (reason) block(`${reason}, which is outside this worktree (${root}). ${WHY}`);
    return;
  }

  const file = editedPath(input);
  if (file && outside(resolve(input.cwd || ".", file))) {
    block(`${file} is outside this worktree (${root}). ${WHY}`);
  }
});
