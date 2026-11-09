import { existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadJob, readIndex, reject } from "@asset-studio/cli";
import { defaultPacksDir } from "../needs/build.ts";
import { CliError, resolveWorkFolder } from "../needs/deps.ts";
import { jobPath, workPathsFor } from "../needs/job.ts";
import { errorText } from "../needs/source.ts";

export interface RedoIo {
  env: Readonly<Record<string, string | undefined>>;
  cwd: string;
  out: (text: string) => void;
  err: (text: string) => void;
}

/** Rules `assets:redo` raises (`assets:needs` A1-1..A1-8, `pack:lint` A1-9..A1-20, `assets:pack` A1-21..A1-25). */
export const REDO_RULE = {
  /** No story folder of that name in the packs folder. */
  unknownStory: "A1-26",
  /** The story has no asset job in the work folder yet. */
  noJob: "A1-27",
  /** The asset is final; redoing it needs `--final`. */
  isFinal: "A1-28",
} as const;

const USAGE =
  "Usage: assets:redo <story> <id> <note> [--final] [--work-folder <dir>] [--packs-dir <dir>]";

interface Args {
  story: string;
  id: string;
  note: string;
  /** The person accepts redoing an asset that is final. */
  final: boolean;
  workFolder?: string;
  packsDir?: string;
}

const parseArgs = (argv: readonly string[]): Args | string => {
  const positional: string[] = [];
  let workFolder: string | undefined;
  let packsDir: string | undefined;
  let final = false;
  const rest = argv.filter((arg) => arg !== "--");
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i] as string;
    const value = (name: string): string | undefined => {
      if (arg === name) return rest[++i];
      return arg.slice(name.length + 1);
    };
    const named = (name: string) => arg === name || arg.startsWith(`${name}=`);
    if (arg === "--final") final = true;
    else if (named("--work-folder")) {
      workFolder = value("--work-folder");
      if (workFolder === undefined) return "--work-folder needs a path.";
    } else if (named("--packs-dir")) {
      packsDir = value("--packs-dir");
      if (packsDir === undefined) return "--packs-dir needs a path.";
    } else if (arg.startsWith("-")) return `Unknown option ${arg}.`;
    else positional.push(arg);
  }
  const [story, id, ...noteWords] = positional;
  if (story === undefined) return "A story is needed.";
  if (id === undefined) return "An asset id is needed.";
  const note = noteWords.join(" ").trim();
  if (note === "") return "A note is needed.";
  return {
    story,
    id,
    note,
    final,
    ...(workFolder === undefined ? {} : { workFolder }),
    ...(packsDir === undefined ? {} : { packsDir }),
  };
};

const fail = (code: string, message: string): CliError => new CliError(code, message, 1);

/**
 * `assets:redo <story> <id> <note>`: hands the exact id and note to asset-studio's `reject` for
 * that story. asset-studio sets the status (`rejected`) and keeps the note in `notes[]` (D47).
 * Nothing here approves anything (DEC-384). No nearest-name guess: an unknown story or id fails.
 */
export const runRedo = async (argv: readonly string[], io: RedoIo): Promise<number> => {
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
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(args.story)) {
      throw fail(REDO_RULE.unknownStory, `${args.story} is not a story id (lowercase kebab-case).`);
    }
    const storyDir = join(packsDir, args.story);
    if (!existsSync(storyDir) || !statSync(storyDir).isDirectory()) {
      throw fail(REDO_RULE.unknownStory, `there is no story "${args.story}" in ${packsDir}.`);
    }
    const file = jobPath(workFolder, args.story);
    if (!existsSync(file)) {
      throw fail(
        REDO_RULE.noJob,
        `there is no asset job for ${args.story} in the work folder. Run \`pnpm assets:render ${args.story}\` first.`,
      );
    }
    const paths = workPathsFor(workFolder, args.story);
    const job = loadJob(file);
    // A final asset is the person's decision: redoing it needs --final, and says what it costs.
    const entry = readIndex(paths)[args.id];
    const warning = `${args.id} is final. Redoing it drops it from the next pack and the next render pays for it again.`;
    if (entry?.status === "final") {
      if (!args.final) {
        throw fail(
          REDO_RULE.isFinal,
          `${warning} To redo it anyway: pnpm assets:redo ${args.story} ${args.id} "<note>" --final`,
        );
      }
      io.err(`warning ${REDO_RULE.isFinal}: ${warning}\n`);
    }
    // AS-ID-1 (not an id of this job), AS-ID-2 (no file yet) and AS-USAGE-1 come from reject.
    reject(job, paths, args.id, args.note);
    io.out(
      `redo ${args.story} ${args.id}: note kept; run \`pnpm assets:render ${args.story}\` to make a new draft.\n`,
    );
    return 0;
  } catch (error) {
    if (error instanceof CliError) {
      io.err(`${[`error ${error.code}: ${error.message}`, ...error.extraLines].join("\n")}\n`);
      return error.exitCode;
    }
    io.err(`assets:redo: ${errorText(error)}\n`);
    return 1;
  }
};
