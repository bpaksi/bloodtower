// Installs lefthook into `.git/hooks`. `pnpm install` runs this (`prepare`).
// Cursor agent checkouts set `core.hooksPath` to a dispatcher that chains to
// `.git/hooks`. Lefthook refuses to install while that is set, and `--force`
// would replace the dispatcher. Park the local path, install, then put it back.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const localBin = join(repoRoot, "node_modules", ".bin", "lefthook");

const git = (args) => {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  if (result.error) throw result.error;
  return result;
};

const install = () => {
  const lefthook = existsSync(localBin) ? localBin : "lefthook";
  return spawnSync(lefthook, ["install"], { cwd: repoRoot, stdio: "inherit" });
};

const run = () => {
  let parked = "";
  let exitCode = 0;
  try {
    const configured = git(["config", "--local", "--get", "core.hooksPath"]);
    if (configured.status !== 0 && configured.status !== 1) {
      console.error(configured.stderr);
      exitCode = configured.status ?? 1;
    } else {
      parked = configured.status === 0 ? configured.stdout.trim() : "";
      if (parked) {
        const unset = git(["config", "--unset-all", "--local", "core.hooksPath"]);
        if (unset.status !== 0) {
          console.error(unset.stderr);
          exitCode = unset.status ?? 1;
        }
      }
    }

    if (exitCode === 0) {
      const installed = install();
      if (installed.error) {
        console.error(installed.error);
        exitCode = 1;
      } else if (installed.status !== 0) {
        exitCode = installed.status ?? 1;
      }
    }
  } catch (error) {
    console.error(error);
    exitCode = 1;
  } finally {
    if (parked) {
      try {
        const restored = git(["config", "--local", "core.hooksPath", parked]);
        if (restored.status !== 0) {
          console.error(restored.stderr);
          console.error(`core.hooksPath was ${parked} and could not be restored`);
          exitCode = restored.status ?? 1;
        }
      } catch (error) {
        console.error(error);
        console.error(`core.hooksPath was ${parked} and could not be restored`);
        exitCode = 1;
      }
    }
  }
  process.exit(exitCode);
};

run();
