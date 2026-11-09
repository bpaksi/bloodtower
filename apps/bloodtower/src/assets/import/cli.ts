import type { Io } from "../needs/cli.ts";
import { CliError } from "../needs/deps.ts";
import { formatIssues, NeedsError } from "../needs/issues.ts";
import { errorText } from "../needs/source.ts";
import { ImportError, type ImportResult, runImport, SOURCES, type SourceName } from "./run.ts";

const USAGE =
  "Usage: assets:import <funeral|test> [--work-folder <dir>] [--packs-dir <dir>] [--poc-dir <dir>] [--model <name>]";

interface Args {
  source: SourceName;
  workFolder?: string;
  packsDir?: string;
  pocDir?: string;
  model?: string;
}

const VALUE_FLAGS = ["--work-folder", "--packs-dir", "--poc-dir", "--model"] as const;

const parseArgs = (argv: readonly string[]): Args | string => {
  let source: string | undefined;
  const values: Record<string, string> = {};
  const rest = argv.filter((arg) => arg !== "--");
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i] as string;
    const flag = VALUE_FLAGS.find((name) => arg === name || arg.startsWith(`${name}=`));
    if (flag !== undefined) {
      const value = arg === flag ? rest[++i] : arg.slice(flag.length + 1);
      if (value === undefined || value === "") return `${flag} needs a value.`;
      values[flag] = value;
    } else if (arg.startsWith("-")) return `Unknown option ${arg}.`;
    else if (source === undefined) source = arg;
    else return `Unexpected argument ${arg}.`;
  }
  if (source === undefined) return "A source is needed.";
  if (!Object.hasOwn(SOURCES, source)) return `${source} is not a source (funeral or test).`;
  return {
    source: source as SourceName,
    ...(values["--work-folder"] === undefined ? {} : { workFolder: values["--work-folder"] }),
    ...(values["--packs-dir"] === undefined ? {} : { packsDir: values["--packs-dir"] }),
    ...(values["--poc-dir"] === undefined ? {} : { pocDir: values["--poc-dir"] }),
    ...(values["--model"] === undefined ? {} : { model: values["--model"] }),
  };
};

const paid = (r: ImportResult) => (r.voice?.voiced ?? 0) - (r.voice?.reused ?? 0);

const format = (result: ImportResult): string => {
  const head =
    `assets:import ${result.source} -> ${result.story}` +
    (result.model === undefined ? "" : ` (voice model ${result.model})`);
  const lines = [
    head,
    `matched ${result.matched.length}, skipped ${result.skipped.length}, failed ${result.failed.length}`,
    ...result.skipped.map((s) => `  skipped ${s.id}: ${s.reason}`),
    ...result.failed.map((f) => `  failed ${f.id}: ${f.reason}`),
    ...result.notes,
    result.source === "funeral"
      ? `next: render --only voice would call gemini for ${paid(result)} of ${result.voice?.voiced ?? 0} voiced lines (${result.voice?.reused ?? 0} reuse the import). Run pnpm assets:needs ${result.story} first; the render needs GEMINI_API_KEY and spends on the paid lines.`
      : `next: render --only picture stores the ${result.matched.length} place paintings as drafts.`,
  ];
  return `${lines.join("\n")}\n`;
};

/** `assets:import`: the one-time import. Returns the exit code (1 when any file failed). */
export const runImportCli = (argv: readonly string[], io: Io): number => {
  const args = parseArgs(argv);
  if (typeof args === "string") {
    io.err(`BT-IMPORT-1: ${args}\n${USAGE}\n`);
    return 2;
  }
  try {
    const result = runImport(args.source, { ...args, env: io.env, cwd: io.cwd });
    io.out(format(result));
    for (const failed of result.failed) io.err(`BT-IMPORT-5: ${failed.id}: ${failed.reason}\n`);
    return result.failed.length > 0 ? 1 : 0;
  } catch (error) {
    if (error instanceof ImportError) {
      io.err(`${error.code}: ${error.message}\n`);
      return error.exitCode;
    }
    if (error instanceof NeedsError) {
      io.err(`${formatIssues(error.issues).join("\n")}\n`);
      return 1;
    }
    if (error instanceof CliError) {
      io.err(`${[`error ${error.code}: ${error.message}`, ...error.extraLines].join("\n")}\n`);
      return error.exitCode;
    }
    io.err(`assets:import: ${errorText(error)}\n`);
    return 1;
  }
};
