import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { readImageSize } from "../../server/pack/imageSize.ts";
import { buildJob, defaultPacksDir } from "../needs/build.ts";
import { type Job, resolveWorkFolder } from "../needs/deps.ts";
import { jobPath, serializeJob, workPathsFor, writeJob } from "../needs/job.ts";
import { errorText, isRecord } from "../needs/source.ts";
import { cacheFileFor, ttsModel } from "./seed.ts";
import { checkWav } from "./wav.ts";

/** A coded stop. `BT-IMPORT-1` usage (exit 2), `-2` no script, `-3` no or unreadable source. */
export class ImportError extends Error {
  readonly code: string;
  readonly exitCode: number;
  constructor(code: string, message: string, exitCode = 1) {
    super(message);
    this.name = "ImportError";
    this.code = code;
    this.exitCode = exitCode;
  }
}

const FUNERAL_POC = "burgomaster-funeral-poc";

export const SOURCES = {
  funeral: { story: "dracula" },
  test: { story: "test" },
} as const;
export type SourceName = keyof typeof SOURCES;

export interface ImportOptions {
  workFolder?: string;
  packsDir?: string;
  /** The funeral POC app folder (default `<repo>/apps/burgomaster-funeral-poc`). */
  pocDir?: string;
  /** The voice model the seeded cache is keyed with (default: what a render would use). */
  model?: string;
  env: Readonly<Record<string, string | undefined>>;
  cwd: string;
}

export interface Outcome {
  id: string;
  reason: string;
}

export interface ImportResult {
  source: SourceName;
  story: string;
  model: string | undefined;
  matched: string[];
  skipped: Outcome[];
  failed: Outcome[];
  notes: string[];
  /** Voiced job lines, and how many of them a voice render would reuse from the cache. */
  voice: { voiced: number; reused: number } | undefined;
  workRoot: string;
}

const REPO_ROOT = resolve(import.meta.dirname, "../../../../..");
const sha256 = (data: Buffer) => createHash("sha256").update(data).digest("hex");
const isInside = (root: string, file: string) => file === root || file.startsWith(`${root}${sep}`);

interface ManifestLine {
  id: string;
  path: string;
  text: string;
  speaker: string;
}

const isFile = (path: string) => {
  try {
    return statSync(path).isFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw new ImportError("BT-IMPORT-3", `cannot read ${path}: ${errorText(error)}`);
  }
};

/** The voice lines of the POC manifest, in id order. Entries that are not lines are not ours. */
const readManifestLines = (manifestFile: string): ManifestLine[] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(manifestFile, "utf8"));
  } catch (error) {
    throw new ImportError("BT-IMPORT-3", `cannot read ${manifestFile}: ${errorText(error)}`);
  }
  if (!isRecord(parsed)) {
    throw new ImportError("BT-IMPORT-3", `${manifestFile} is not a JSON object of entries.`);
  }
  const lines: ManifestLine[] = [];
  for (const [key, entry] of Object.entries(parsed)) {
    if (!isRecord(entry) || entry.type !== "line") continue;
    const { path, text, speaker } = entry;
    if (typeof path !== "string" || typeof text !== "string" || typeof speaker !== "string") {
      throw new ImportError(
        "BT-IMPORT-3",
        `${manifestFile}: entry ${key} is a line without path, text and speaker.`,
      );
    }
    lines.push({ id: typeof entry.id === "string" ? entry.id : key, path, text, speaker });
  }
  return lines.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
};

const writeAtomic = (path: string, data: Buffer | string) => {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temp, data);
    renameSync(temp, path);
  } catch (error) {
    try {
      rmSync(temp, { force: true });
    } catch (cleanup) {
      console.error(`assets:import: could not remove ${temp}: ${errorText(cleanup)}`);
    }
    throw error;
  }
};

interface Planned {
  id: string;
  file: string;
  bytes: Buffer;
  hash: string;
}

/**
 * Planning reads only. Every check that can stop the whole run happens before the first write,
 * so a missing script, source or work folder leaves the work folder untouched.
 */
const planFuneral = (
  job: Job,
  assetsDir: string,
  storyRoot: string,
  model: string,
  result: ImportResult,
): Planned[] => {
  const lines = new Map(job.lines.map((line) => [line.id, line]));
  const voices = new Map(job.cast.map((member) => [member.id, member.voice]));
  const planned: Planned[] = [];
  const manifest = readManifestLines(join(assetsDir, "manifest.json"));
  const assetsReal = realpathSync(assetsDir);
  for (const entry of manifest) {
    const line = lines.get(entry.id);
    if (line === undefined) {
      result.skipped.push({
        id: entry.id,
        reason: "no id match in script.yaml (a silent caption has no voiced job line)",
      });
      continue;
    }
    if (line.speaker !== entry.speaker) {
      result.skipped.push({
        id: entry.id,
        reason: `speaker ${entry.speaker} in the POC, ${line.speaker} in the script`,
      });
      continue;
    }
    if (line.text !== entry.text) {
      result.skipped.push({ id: entry.id, reason: "text differs from script.yaml" });
      continue;
    }
    const voice = voices.get(line.speaker);
    if (voice === undefined) {
      result.skipped.push({ id: entry.id, reason: `speaker ${line.speaker} has no voice` });
      continue;
    }
    const target = cacheFileFor(storyRoot, line.text, voice, model);
    if ("reason" in target) {
      result.skipped.push({ id: entry.id, reason: target.reason });
      continue;
    }
    let source = resolve(assetsReal, entry.path);
    try {
      source = realpathSync(source);
    } catch (error) {
      result.failed.push({
        id: entry.id,
        reason: `cannot read ${entry.path}: ${errorText(error)}`,
      });
      continue;
    }
    if (isAbsolute(entry.path) || !isInside(assetsReal, source)) {
      result.failed.push({
        id: entry.id,
        reason: `path ${entry.path} leaves the POC assets folder`,
      });
      continue;
    }
    let bytes: Buffer;
    try {
      bytes = readFileSync(source);
    } catch (error) {
      result.failed.push({
        id: entry.id,
        reason: `cannot read ${entry.path}: ${errorText(error)}`,
      });
      continue;
    }
    const wav = checkWav(bytes);
    if (typeof wav === "string") {
      result.failed.push({ id: entry.id, reason: `corrupt WAV ${entry.path}: ${wav}` });
      continue;
    }
    const item: Planned = { id: entry.id, file: target.file, bytes, hash: sha256(bytes) };
    if (existsSync(target.file)) {
      if (sha256(readFileSync(target.file)) === item.hash) result.matched.push(entry.id);
      else {
        result.skipped.push({
          id: entry.id,
          reason: "tts-cache already holds different audio for this text and voice; kept",
        });
      }
      continue;
    }
    planned.push(item);
    result.matched.push(entry.id);
  }
  return planned;
};

/** `assets:import <funeral|test>`: seeds what a later `render` stores as drafts. Returns the result. */
export const runImport = (source: SourceName, options: ImportOptions): ImportResult => {
  const { story } = SOURCES[source];
  // The work folder first: with none set, nothing is read or written (AS-CONFIG-1).
  const workFolder = resolveWorkFolder(options.env, options.cwd, options.workFolder);
  const packsDir =
    options.packsDir === undefined
      ? defaultPacksDir(options.env)
      : resolve(options.cwd, options.packsDir);
  const paths = workPathsFor(workFolder, story);
  const result: ImportResult = {
    source,
    story,
    model: undefined,
    matched: [],
    skipped: [],
    failed: [],
    notes: [],
    voice: undefined,
    workRoot: paths.root,
  };

  let planned: Planned[] = [];
  if (source === "funeral") {
    const script = join(packsDir, story, "script.yaml");
    if (!isFile(script)) {
      throw new ImportError("BT-IMPORT-2", `No script at ${script}; the funeral import needs it.`);
    }
    const poc =
      options.pocDir === undefined
        ? join(REPO_ROOT, "apps", FUNERAL_POC)
        : resolve(options.cwd, options.pocDir);
    const assetsDir = join(poc, "assets");
    if (!isFile(join(assetsDir, "manifest.json"))) {
      throw new ImportError(
        "BT-IMPORT-3",
        `No funeral POC manifest at ${join(assetsDir, "manifest.json")}.`,
      );
    }
    const built = buildJob(story, { packsDir });
    const model = ttsModel(options.env, options.model);
    result.model = model;
    planned = planFuneral(built.job, assetsDir, paths.root, model, result);
    result.notes.push(
      "stills: not imported. The Dracula pack names no picture yet, and a still reaches the work folder through a job picture or portrait source (A2).",
    );
    commit(planned, result, workFolder, built.job);
    result.voice = countReuse(built.job, paths.root, model);
  } else {
    const built = buildJob(story, { packsDir });
    const places = built.job.pictures.filter((p) => p.kind === "place");
    if (places.length === 0) {
      throw new ImportError("BT-IMPORT-3", `The ${story} pack names no place painting to import.`);
    }
    for (const picture of places) {
      if (picture.source === undefined) {
        result.failed.push({ id: picture.id, reason: "the job names no source file" });
        continue;
      }
      let size: ReturnType<typeof readImageSize>;
      try {
        size = readImageSize(picture.source);
      } catch (error) {
        result.failed.push({
          id: picture.id,
          reason: `cannot read ${picture.source}: ${errorText(error)}`,
        });
        continue;
      }
      if (size === undefined) {
        result.failed.push({
          id: picture.id,
          reason: `${relative(packsDir, picture.source)} is not a readable image`,
        });
      } else result.matched.push(picture.id);
    }
    result.notes.push(
      "nothing is copied: the job's picture source is the pack file. `render --only picture` stores the drafts.",
    );
    commit([], result, workFolder, built.job);
  }
  return result;
};

/** The first and only writes: seeded audio files, then the job when its bytes changed. */
const commit = (planned: Planned[], result: ImportResult, workFolder: string, job: Job) => {
  for (const item of planned) {
    try {
      writeAtomic(item.file, item.bytes);
    } catch (error) {
      result.matched = result.matched.filter((id) => id !== item.id);
      result.failed.push({ id: item.id, reason: `cannot write the cache: ${errorText(error)}` });
    }
  }
  const target = jobPath(workFolder, job.story);
  const current = isFile(target) ? readFileSync(target, "utf8") : undefined;
  if (current !== serializeJob(job)) writeJob(workFolder, job);
};

/**
 * Against the job's voiced lines and the cache as it stands after the import: a line is
 * reused when its one speech segment is cached. Every other line a render sends to the provider.
 */
const countReuse = (job: Job, storyRoot: string, model: string) => {
  const voices = new Map(job.cast.map((member) => [member.id, member.voice]));
  let reused = 0;
  for (const line of job.lines) {
    const voice = voices.get(line.speaker);
    if (voice === undefined) continue;
    const target = cacheFileFor(storyRoot, line.text, voice, model);
    if ("file" in target && existsSync(target.file)) reused += 1;
  }
  return { voiced: job.lines.length, reused };
};
