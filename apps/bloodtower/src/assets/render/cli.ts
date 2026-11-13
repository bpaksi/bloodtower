import { resolve } from "node:path";
import { readIndex } from "@asset-studio/cli";
import { buildJob, defaultPacksDir } from "../needs/build.ts";
import { CliError, resolveWorkFolder } from "../needs/deps.ts";
import { formatIssues, NeedsError } from "../needs/issues.ts";
import { computeRows, workPathsFor, writeJob } from "../needs/job.ts";
import { errorText } from "../needs/source.ts";
import { assetStudioBin, realSpawn, type SpawnFn } from "./spawn.ts";

export interface RenderIo {
  env: Readonly<Record<string, string | undefined>>;
  cwd: string;
  out: (text: string) => void;
  err: (text: string) => void;
  /** Defaults to a real child process. */
  spawn?: SpawnFn;
}

const USAGE =
  "Usage: assets:render <story> [--ai] [--only voice|picture] [--work-folder <dir>] [--packs-dir <dir>]";

interface Args {
  story: string;
  ai: boolean;
  only?: "voice" | "picture";
  workFolder?: string;
  packsDir?: string;
}

const parseArgs = (argv: readonly string[]): Args | string => {
  let story: string | undefined;
  let ai = false;
  let only: string | undefined;
  let workFolder: string | undefined;
  let packsDir: string | undefined;
  const rest = argv.filter((arg) => arg !== "--");
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i] as string;
    const value = (name: string): string | undefined => {
      if (arg === name) return rest[++i];
      return arg.slice(name.length + 1);
    };
    const named = (name: string) => arg === name || arg.startsWith(`${name}=`);
    if (arg === "--ai") ai = true;
    else if (named("--only")) {
      only = value("--only");
      if (only === undefined) return "--only needs voice or picture.";
    } else if (named("--work-folder")) {
      workFolder = value("--work-folder");
      if (workFolder === undefined) return "--work-folder needs a path.";
    } else if (named("--packs-dir")) {
      packsDir = value("--packs-dir");
      if (packsDir === undefined) return "--packs-dir needs a path.";
    } else if (arg.startsWith("-")) return `Unknown option ${arg}.`;
    else if (story === undefined) story = arg;
    else return `Unexpected argument ${arg}.`;
  }
  if (story === undefined) return "A story is needed.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(story)) {
    return `${story} is not a story id (lowercase kebab-case).`;
  }
  if (only === "avatar") {
    return "--only avatar is not available: avatar mode is not in asset-studio 0.2.";
  }
  if (only !== undefined && only !== "voice" && only !== "picture") {
    return `--only must be voice or picture, not "${only}".`;
  }
  return {
    story,
    ai,
    ...(only === undefined ? {} : { only }),
    ...(workFolder === undefined ? {} : { workFolder }),
    ...(packsDir === undefined ? {} : { packsDir }),
  };
};

const CODE_LINE = /^(AS-[A-Z]+-\d+): (.*)$/;
/** Lines the bin prints that are not a failed asset. */
const NOT_AN_ASSET = new Set(["AS-RENDER-2", "AS-FAKE-1", "AS-FAKE-4"]);

/** The failed assets found on the bin's stderr: the code and the job key the message starts with. */
export const failedAssets = (
  stderr: string,
  keys: readonly string[],
): { code: string; id: string }[] => {
  const byLength = [...keys].sort((a, b) => b.length - a.length);
  const found: { code: string; id: string }[] = [];
  for (const line of stderr.split("\n")) {
    const match = CODE_LINE.exec(line);
    if (match === null || NOT_AN_ASSET.has(match[1] as string)) continue;
    const message = match[2] as string;
    const id = byLength.find((key) => message.startsWith(`${key}:`));
    found.push({ code: match[1] as string, id: id ?? "-" });
  }
  return found;
};

/**
 * `assets:render`: `needs` (pack to job), then the `asset-studio` bin's `render` on the job.
 * Prints what was made, what failed (each with its code) and what is still missing.
 * Returns the exit code: non-zero when anything failed.
 */
export const runRender = async (argv: readonly string[], io: RenderIo): Promise<number> => {
  const args = parseArgs(argv);
  if (typeof args === "string") {
    io.err(`${args}\n${USAGE}\n`);
    return 2;
  }
  try {
    // The work folder comes first: with none set, nothing is read, written or spawned (AS-CONFIG-1).
    const workFolder = resolveWorkFolder(io.env, io.cwd, args.workFolder);
    const packsDir =
      args.packsDir === undefined ? defaultPacksDir(io.env) : resolve(io.cwd, args.packsDir);
    const built = buildJob(args.story, { packsDir });
    const jobFile = writeJob(workFolder, built.job);
    const paths = workPathsFor(workFolder, args.story);
    const before = readIndex(paths);

    const binArgs = [assetStudioBin(), "render", jobFile];
    if (args.only !== undefined) binArgs.push("--only", args.only);
    if (args.ai) binArgs.push("--ai");
    binArgs.push("--work-folder", workFolder);
    // The child's output goes to the person as it is written; it is also kept for the summary.
    let streamed = false;
    const result = await (io.spawn ?? realSpawn)(process.execPath, binArgs, {
      env: io.env,
      cwd: io.cwd,
      onStdout: (text) => {
        streamed = true;
        io.out(text);
      },
      onStderr: (text) => {
        streamed = true;
        io.err(text);
      },
    });
    if (!streamed) {
      // A spawn function that does not stream: pass the collected output through once.
      if (result.stderr !== "") io.err(result.stderr);
      if (result.stdout !== "") io.out(result.stdout);
    }

    const after = readIndex(paths);
    const made = Object.keys(after).filter(
      (key) => JSON.stringify(after[key]) !== JSON.stringify(before[key]),
    ).length;
    const rows = computeRows(built.job, paths);
    const missing = rows.filter((row) => row.status === "missing").length;
    const reported = /^rendered \d+, failed (\d+)$/m.exec(result.stdout);
    const failures = failedAssets(
      result.stderr,
      rows.map((row) => row.id),
    );
    const exit = result.signal === undefined ? `exit ${result.code}` : `killed by ${result.signal}`;
    if (reported === null || (result.code !== 0 && failures.length === 0)) {
      // The bin stopped without naming a failed asset (a crash, a kill, AS-FAKE-2…): say why.
      const tail = result.stderr.trim().split("\n").slice(-5).join("\n");
      io.err(
        `assets:render: render did not finish (${result.signal === undefined ? exit : `render was ${exit}`})${tail === "" ? "" : `; last stderr:\n${tail}`}\n`,
      );
      if (reported !== null) io.out(`made ${made}, failed 0, missing ${missing}\n`);
      return result.code === 0 ? 1 : result.code;
    }
    const failed = Number(reported[1]);
    io.out(`made ${made}, failed ${failed}, missing ${missing}\n`);
    for (const failure of failures) io.out(`failed ${failure.id} ${failure.code}\n`);
    for (const row of rows.filter((r) => r.status === "missing")) {
      io.out(`missing ${row.id} ${row.kind}\n`);
    }
    return failed > 0 && result.code === 0 ? 1 : result.code;
  } catch (error) {
    if (error instanceof NeedsError) {
      io.err(`${formatIssues(error.issues).join("\n")}\n`);
      return 1;
    }
    if (error instanceof CliError) {
      io.err(`${[`error ${error.code}: ${error.message}`, ...error.extraLines].join("\n")}\n`);
      return error.exitCode;
    }
    io.err(`assets:render: ${errorText(error)}\n`);
    return 1;
  }
};
