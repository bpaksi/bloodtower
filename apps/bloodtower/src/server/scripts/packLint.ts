import { basename, dirname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadConfig } from "../config.ts";

/** Repo root from `src/server/scripts` (same layout as `config.ts`). */
const REPO_ROOT = resolve(import.meta.dirname, "../../../../..");

const resolveLintDir = (dir: string, cwd: string): string => {
  if (isAbsolute(dir)) return dir;
  if (dir === "packs-v2" || dir.startsWith("packs-v2/")) return resolve(REPO_ROOT, dir);
  return resolve(cwd, dir);
};

import { formatLoadIssues, loadPackDir, loadR1Pack, type PackLoadResult } from "../pack/load.ts";
import {
  formatPackV2Issues,
  isPackV2Manifest,
  loadPackV2Dir,
  type PackV2LoadResult,
} from "../pack/v2/load.ts";

export interface LintReport {
  exitCode: number;
  lines: string[];
}

/** Lints one folder, or the configured test pack when `dir` is omitted. */
export const lintPath = (dir: string | undefined, cwd: string): LintReport => {
  if (dir) {
    const resolved = resolveLintDir(dir, cwd);
    if (isPackV2Manifest(resolved)) {
      let packsV2Root = resolved;
      while (basename(packsV2Root) !== "packs-v2") {
        const parent = dirname(packsV2Root);
        if (parent === packsV2Root) break;
        packsV2Root = parent;
      }
      const v2: PackV2LoadResult = loadPackV2Dir(
        resolved,
        basename(packsV2Root) === "packs-v2" ? packsV2Root : undefined,
      );
      if (v2.ok) {
        const pack = v2.kind === "story" ? v2.pack : v2.pack;
        const lines = [`OK ${pack.pack_id} ${pack.version} (format v2)`];
        return { exitCode: 0, lines };
      }
      return { exitCode: 1, lines: formatPackV2Issues(v2.issues) };
    }
  }
  const result: PackLoadResult = dir
    ? loadPackDir(resolveLintDir(dir, cwd))
    : loadR1Pack(loadConfig().packsDir);
  if (result.ok) {
    const lines = [`OK ${result.pack.pack_id} ${result.pack.version}`];
    for (const warning of result.assets.warnings) {
      lines.push(
        `file=${warning.file} path=${warning.path} rule=${warning.rule} message=${warning.message}`,
      );
    }
    return { exitCode: 0, lines };
  }
  return { exitCode: 1, lines: formatLoadIssues(result.issues) };
};

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(resolve(entry)).href) {
  const arg = process.argv[2];
  if (process.argv.length > 3) {
    console.error("Usage: pack:lint [dir]");
    process.exit(2);
  }
  const report = lintPath(arg, process.cwd());
  const write = report.exitCode === 0 ? console.log : console.error;
  for (const line of report.lines) write(line);
  process.exit(report.exitCode);
}
