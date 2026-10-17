import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadConfig } from "../config.ts";
import { formatLoadIssues, loadPackDir, loadR1Pack, type PackLoadResult } from "../pack/load.ts";

export interface LintReport {
  exitCode: number;
  lines: string[];
}

/** Lints one folder, or the configured test pack when `dir` is omitted. */
export const lintPath = (dir: string | undefined, cwd: string): LintReport => {
  const result: PackLoadResult = dir
    ? loadPackDir(resolve(cwd, dir))
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
