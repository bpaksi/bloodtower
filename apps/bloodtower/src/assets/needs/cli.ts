import { resolve } from "node:path";
import { buildJob, defaultPacksDir, type SilentCaption } from "./build.ts";
import { CliError, resolveWorkFolder } from "./deps.ts";
import { formatIssues, NeedsError } from "./issues.ts";
import { computeRows, formatRows, workPathsFor, writeJob } from "./job.ts";
import { errorText } from "./source.ts";

export interface Io {
  env: Readonly<Record<string, string | undefined>>;
  cwd: string;
  out: (text: string) => void;
  err: (text: string) => void;
}

const USAGE =
  "Usage: assets:needs <story> [--json] [--verbose] [--work-folder <dir>] [--packs-dir <dir>]";

interface Args {
  story: string;
  json: boolean;
  verbose: boolean;
  workFolder?: string;
  packsDir?: string;
}

const parseArgs = (argv: readonly string[]): Args | string => {
  let story: string | undefined;
  let json = false;
  let verbose = false;
  let workFolder: string | undefined;
  let packsDir: string | undefined;
  const rest = argv.filter((arg) => arg !== "--");
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i] as string;
    const value = (name: string): string | undefined => {
      if (arg === name) return rest[++i];
      if (arg.startsWith(`${name}=`)) return arg.slice(name.length + 1);
      return undefined;
    };
    if (arg === "--json") json = true;
    else if (arg === "--verbose") verbose = true;
    else if (arg === "--work-folder" || arg.startsWith("--work-folder=")) {
      const v = value("--work-folder");
      if (v === undefined) return "--work-folder needs a path.";
      workFolder = v;
    } else if (arg === "--packs-dir" || arg.startsWith("--packs-dir=")) {
      const v = value("--packs-dir");
      if (v === undefined) return "--packs-dir needs a path.";
      packsDir = v;
    } else if (arg.startsWith("-")) return `Unknown option ${arg}.`;
    else if (story === undefined) story = arg;
    else return `Unexpected argument ${arg}.`;
  }
  if (story === undefined) return "A story is needed.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(story)) {
    return `${story} is not a story id (lowercase kebab-case).`;
  }
  return {
    story,
    json,
    verbose,
    ...(workFolder === undefined ? {} : { workFolder }),
    ...(packsDir === undefined ? {} : { packsDir }),
  };
};

const SILENT_SHOWN = 5;

/** The silent-caption count and reasons, then the first few (all with `--verbose`). */
const summary = (silent: readonly SilentCaption[], verbose: boolean): string => {
  const counts = new Map<string, number>();
  for (const s of silent) counts.set(s.reason, (counts.get(s.reason) ?? 0) + 1);
  const parts = [...counts].sort().map(([reason, n]) => `${reason} ${n}`);
  const head = `silent captions: ${silent.length}${parts.length ? ` (${parts.join(", ")})` : ""}`;
  const shown = verbose ? silent : silent.slice(0, SILENT_SHOWN);
  const rows = shown.map((s) => `  ${s.reason}  ${s.id ?? "-"}  file=${s.file} path=${s.path}`);
  const more = silent.length > shown.length ? ["  … --verbose lists all"] : [];
  return [head, ...rows, ...more].join("\n");
};

/** `assets:needs`: pack to job, written to the work folder, then the needs list. Returns the exit code. */
export const runNeeds = (argv: readonly string[], io: Io): number => {
  const args = parseArgs(argv);
  if (typeof args === "string") {
    io.err(`${args}\n${USAGE}\n`);
    return 2;
  }
  try {
    // The work folder comes first: with none set, nothing is read or written (AS-CONFIG-1).
    const workFolder = resolveWorkFolder(io.env, io.cwd, args.workFolder);
    const packsDir =
      args.packsDir === undefined ? defaultPacksDir(io.env) : resolve(io.cwd, args.packsDir);
    const built = buildJob(args.story, { packsDir });
    const path = writeJob(workFolder, built.job);
    const rows = computeRows(built.job, workPathsFor(workFolder, args.story));
    io.out(args.json ? `${JSON.stringify(rows, null, 2)}\n` : formatRows(rows));
    io.err(`${summary(built.silent, args.verbose)}\n`);
    for (const skipped of built.skipped) {
      io.err(
        `skipped ${skipped.id} (file=${skipped.file} path=${skipped.path}): ${skipped.reason}\n`,
      );
    }
    io.err(`job: ${path}\n`);
    return 0;
  } catch (error) {
    if (error instanceof NeedsError) {
      io.err(`${formatIssues(error.issues).join("\n")}\n`);
      return 1;
    }
    if (error instanceof CliError) {
      io.err(`${[`error ${error.code}: ${error.message}`, ...error.extraLines].join("\n")}\n`);
      return error.exitCode;
    }
    io.err(`assets:needs: ${errorText(error)}\n`);
    return 1;
  }
};
