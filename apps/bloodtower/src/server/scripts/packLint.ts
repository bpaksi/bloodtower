import { existsSync, readdirSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { lintPackAssets } from "../../assets/lint/index.ts";
import { formatIssues } from "../../assets/needs/issues.ts";
import { loadConfig } from "../config.ts";

/** Repo root from `src/server/scripts` (same layout as `config.ts`). */
const REPO_ROOT = resolve(import.meta.dirname, "../../../../..");

const resolveLintDir = (dir: string, cwd: string): string => {
  if (isAbsolute(dir)) return dir;
  if (dir === "packs" || dir.startsWith("packs/")) return resolve(REPO_ROOT, dir);
  if (dir === "packs-v2" || dir.startsWith("packs-v2/")) return resolve(REPO_ROOT, dir);
  return resolve(cwd, dir);
};

import { formatPackV2Issues, loadPackV2Dir, type PackV2LoadResult } from "../pack/v2/load.ts";

export interface LintReport {
  exitCode: number;
  lines: string[];
}

const formatWarning = (warning: { file: string; path: string; rule: string; message: string }) =>
  `file=${warning.file} path=${warning.path} rule=${warning.rule} message=${warning.message}`;

/** Lints one folder. With no folder, lints the test pack under the configured `packsDir`. */
export const lintPath = (dir: string | undefined, cwd: string): LintReport => {
  const resolved = resolveLintDir(dir ?? join(loadConfig().packsDir, "test"), cwd);
  let packsRoot = resolved;
  while (basename(packsRoot) !== "packs" && basename(packsRoot) !== "packs-v2") {
    const parent = dirname(packsRoot);
    if (parent === packsRoot) break;
    packsRoot = parent;
  }
  const rootName = basename(packsRoot);
  const result: PackV2LoadResult = loadPackV2Dir(
    resolved,
    rootName === "packs" || rootName === "packs-v2" ? packsRoot : undefined,
  );
  if (result.ok) {
    const lines = [
      result.kind === "metadata"
        ? `OK ${result.pack.pack_id} ${result.pack.version} (metadata only)`
        : `OK ${result.pack.pack_id} ${result.pack.version} (format v2)`,
    ];
    for (const warning of result.warnings) lines.push(formatWarning(warning));
    return { exitCode: 0, lines };
  }
  return { exitCode: 1, lines: formatPackV2Issues(result.issues) };
};

/**
 * `lintPath`, then the pack's `assets/index.json` when it has one (A1 step 3). A pack without an
 * index lints exactly as `lintPath` does. `release` also rejects any draft in the index.
 */
export const lintPathWithIndex = async (
  dir: string | undefined,
  cwd: string,
  release = false,
): Promise<LintReport> => {
  const report = lintPath(dir, cwd);
  const resolved = resolveLintDir(dir ?? join(loadConfig().packsDir, "test"), cwd);
  const issues = await lintPackAssets(resolved, release);
  if (issues === undefined) return report;
  if (issues.length === 0) return report;
  return {
    exitCode: 1,
    lines: [...(report.exitCode === 0 ? [] : report.lines), ...formatIssues(issues)],
  };
};

/** Immediate child folders of a packs root. Hidden names are not doors. */
export const listPackDoors = (
  packsDir: string,
): { ok: true; ids: string[] } | { ok: false; message: string } => {
  try {
    const ids = readdirSync(packsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => entry.name)
      .sort();
    return { ok: true, ids };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message };
  }
};

/** Lints every immediate child of one packs root. One failure fails the report. */
export const lintPackRoot = (packsDir: string, cwd: string): LintReport => {
  const doors = listPackDoors(packsDir);
  if (!doors.ok) return { exitCode: 1, lines: [doors.message] };
  if (doors.ids.length === 0) {
    return { exitCode: 1, lines: [`No story pack under ${packsDir}.`] };
  }
  const lines: string[] = [];
  let exitCode = 0;
  for (const id of doors.ids) {
    const report = lintPath(join(packsDir, id), cwd);
    lines.push(...report.lines);
    if (report.exitCode !== 0) exitCode = 1;
  }
  return { exitCode, lines };
};

const sameDir = (left: string, right: string) => {
  try {
    return realpathSync(left) === realpathSync(right);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`pack-lint: ${message}`);
    return false;
  }
};

/**
 * Every door the host can load: the configured `packsDir` (`.wt.json`, then `PACKS_DIR`,
 * default `packs/`). When `packs-v2/` is still a separate tree, it is walked the same way.
 */
export const lintBuildSet = (cwd: string): LintReport => {
  const packsDir = loadConfig().packsDir;
  const roots = [packsDir];
  const legacy = join(REPO_ROOT, "packs-v2");
  if (existsSync(legacy) && !sameDir(legacy, packsDir)) roots.push(legacy);
  const lines: string[] = [];
  let exitCode = 0;
  for (const root of roots) {
    const report = lintPackRoot(root, cwd);
    lines.push(...report.lines);
    if (report.exitCode !== 0) exitCode = 1;
  }
  return { exitCode, lines };
};

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(resolve(entry)).href) {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const all = args.includes("--all");
  const release = args.includes("--release");
  const rest = args.filter((arg) => arg !== "--release");
  if ((all && (rest.length !== 1 || release)) || (!all && rest.length > 1)) {
    console.error("Usage: pack:lint [dir] [--release] | pack:lint --all");
    process.exit(2);
  }
  const report = all
    ? lintBuildSet(process.cwd())
    : await lintPathWithIndex(rest[0], process.cwd(), release);
  const write = report.exitCode === 0 ? console.log : console.error;
  for (const line of report.lines) write(line);
  process.exit(report.exitCode);
}
