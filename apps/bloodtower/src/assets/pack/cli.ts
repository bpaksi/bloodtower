import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { lintIndexTextReport } from "../lint/lint.ts";
import { buildJob, defaultPacksDir } from "../needs/build.ts";
import { assetKeys, CliError, resolveWorkFolder } from "../needs/deps.ts";
import { formatIssues, type Issue, NeedsError } from "../needs/issues.ts";
import { jobPath } from "../needs/job.ts";
import { errorText } from "../needs/source.ts";
import { assetStudioBin, realSpawn, type SpawnFn } from "../render/spawn.ts";
import { type CommitIo, commitPack } from "./commit.ts";
import { readExportIndex } from "./exportIndex.ts";
import { PACK_RULE, PackError, packIssue } from "./issues.ts";
import { mapExport, serializeIndex } from "./map.ts";

export interface PackIo {
  env: Readonly<Record<string, string | undefined>>;
  cwd: string;
  out: (text: string) => void;
  err: (text: string) => void;
  /** Defaults to a real child process. */
  spawn?: SpawnFn;
  /** Defaults to the real file operations. A test fails one of them. */
  commitIo?: CommitIo;
}

const USAGE = "Usage: assets:pack <story> [--drafts] [--work-folder <dir>] [--packs-dir <dir>]";

interface Args {
  story: string;
  drafts: boolean;
  workFolder?: string;
  packsDir?: string;
}

const parseArgs = (argv: readonly string[]): Args | string => {
  let story: string | undefined;
  let drafts = false;
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
    if (arg === "--drafts") drafts = true;
    else if (named("--work-folder")) {
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
  return {
    story,
    drafts,
    ...(workFolder === undefined ? {} : { workFolder }),
    ...(packsDir === undefined ? {} : { packsDir }),
  };
};

const AS_CODE = /\b(AS-[A-Z]+-\d+)\b/;

/**
 * `assets:pack`: asset-studio `export` into a temp folder, checks, lint, then the atomic copy into
 * `packs/<story>/assets/` and a new `index.json`. Returns the exit code: non-zero on any error.
 * Nothing is written to the pack until every check has passed.
 */
export const runPack = async (argv: readonly string[], io: PackIo): Promise<number> => {
  const args = parseArgs(argv);
  if (typeof args === "string") {
    io.err(`${args}\n${USAGE}\n`);
    return 2;
  }
  let temp: string | undefined;
  try {
    // The work folder comes first: with none set, nothing is read, written or spawned (AS-CONFIG-1).
    const workFolder = resolveWorkFolder(io.env, io.cwd, args.workFolder);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(args.story)) {
      io.err(`${args.story} is not a story id (lowercase kebab-case).\n${USAGE}\n`);
      return 2;
    }
    const packsDir =
      args.packsDir === undefined ? defaultPacksDir(io.env) : resolve(io.cwd, args.packsDir);
    const packDir = join(packsDir, args.story);

    const job = jobPath(workFolder, args.story);
    if (!existsSync(job)) {
      throw new PackError([
        packIssue(
          job,
          "(file)",
          PACK_RULE.noJob,
          `there is no asset job for ${args.story} in the work folder. Run \`pnpm assets:render ${args.story}\` first.`,
        ),
      ]);
    }
    const built = buildJob(args.story, { packsDir });

    // Real folder of our own, outside the work folder (export refuses an out folder inside it).
    temp = realpathSync(mkdtempSync(join(tmpdir(), "bt-pack-")));
    const staging = join(temp, "pack");
    const exportDir = join(staging, "assets");
    mkdirSync(staging);
    const binArgs = [assetStudioBin(), "export", job, "--out", exportDir];
    if (args.drafts) binArgs.push("--drafts");
    binArgs.push("--work-folder", workFolder);
    const result = await (io.spawn ?? realSpawn)(process.execPath, binArgs, {
      env: io.env,
      cwd: io.cwd,
      onStderr: (text) => io.err(text),
    });
    if (result.code !== 0) {
      const code = AS_CODE.exec(result.stderr)?.[1];
      const tail = result.stderr.trim().split("\n").slice(-3).join(" | ");
      const how =
        result.signal === undefined ? `exit ${result.code}` : `killed by ${result.signal}`;
      throw new PackError([
        packIssue(
          "export",
          "(file)",
          PACK_RULE.exportBin,
          `the asset-studio export failed (${code ?? how})${tail === "" ? "" : `: ${tail}`}`,
        ),
      ]);
    }

    const exported = readExportIndex(exportDir, args.story);
    const warnings: string[] = [];
    if (exported.source !== built.job.source) {
      warnings.push(
        `warning: the export for ${args.story} was rendered from a different pack source than the pack has now (${exported.source} against ${built.job.source}). Packing it anyway; run \`pnpm assets:render ${args.story}\` to refresh.`,
      );
    }

    const mapped = mapExport(exported);
    const indexText = serializeIndex(mapped);
    writeFileSync(join(exportDir, "index.json"), indexText);
    // A partial pack is allowed (D45): lint as a non-release, so a missing id is a warning.
    const referenced = [...new Set(assetKeys(built.job).map((k) => k.assetId))];
    const lint = await lintIndexTextReport({
      text: indexText,
      options: { root: staging, referenced, release: false },
    });
    if (lint.errors.length > 0) throw new PackError(lint.errors);
    for (const w of lint.warnings) warnings.push(formatIssues([w])[0] as string);

    const files = new Map<string, string>();
    for (const [id, entry] of Object.entries(mapped)) {
      if (!files.has(entry.file)) files.set(entry.file, id);
    }
    const committed = commitPack({
      packDir,
      exportDir,
      indexText,
      files,
      ...(io.commitIo === undefined ? {} : { io: io.commitIo }),
    });

    const entries = Object.values(mapped);
    const final = entries.filter((e) => e.status === "final").length;
    io.out(`packed ${entries.length} (final ${final}, draft ${entries.length - final})\n`);
    for (const r of committed.removed) io.out(`removed ${r.file} (was ${r.id})\n`);
    for (const w of [...warnings, ...committed.warnings.map((m) => `warning: ${m}`)]) {
      io.err(`${w}\n`);
    }
    for (const e of committed.errors) io.err(`error: ${e}\n`);
    return committed.errors.length > 0 ? 1 : 0;
  } catch (error) {
    if (error instanceof PackError || error instanceof NeedsError) {
      io.err(`${formatIssues(error.issues as readonly Issue[]).join("\n")}\n`);
      return 1;
    }
    if (error instanceof CliError) {
      io.err(`${[`error ${error.code}: ${error.message}`, ...error.extraLines].join("\n")}\n`);
      return error.exitCode;
    }
    io.err(`assets:pack: ${errorText(error)}\n`);
    return 1;
  } finally {
    if (temp !== undefined) {
      try {
        rmSync(temp, { recursive: true, force: true });
      } catch (error) {
        io.err(`assets:pack: could not remove ${temp}: ${errorText(error)}\n`);
      }
    }
  }
};
