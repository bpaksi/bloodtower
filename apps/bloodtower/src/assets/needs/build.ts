import { basename, extname, join, resolve } from "node:path";
import {
  CAST_FILE,
  type CastEntry,
  readCast,
  readScript,
  SCRIPT_FILE,
  type ScriptLine,
} from "./authoring.ts";
import {
  assetKeys,
  cameraSchema,
  isAssetId,
  type Job,
  type JobCastMember,
  type JobLine,
  type JobMoment,
  type JobPicture,
  type JobSound,
  jobSchema,
} from "./deps.ts";
import { type Issue, issue, NeedsError, RULE } from "./issues.ts";
import {
  type PackEffect,
  packMetadataSchema,
  packV2Issues,
  type StoryPack,
  storyPackSchema,
} from "./protocols.ts";
import { errorText, isRecord, PackFiles } from "./source.ts";

/** The profile Story board art is rendered for (D1: it is the only target story art has). */
export const DASHBOARD = "dashboard";
export const DEFAULT_PROFILES: Readonly<Record<string, { width: number; height: number }>> = {
  [DASHBOARD]: { width: 3840, height: 2160 },
};

/** DEC-344: the five moods of a cast member's stills, neutral first. */
export const MOODS = ["neutral", "friendly", "scared", "angry", "sly"] as const;
/** Speakers that are the Loremaster: audio and captions only, no portrait (D8). */
export const LOREMASTER_IDS: readonly string[] = ["narrator", "loremaster"];

export type SilentReason =
  | "fill-in"
  | "repeated"
  | "private"
  | "invalid-id"
  | "no-voice"
  | "legacy-inline";

/** A caption that is shown but never voiced, with the reason (DEC-349, D2). */
export interface SilentCaption {
  id?: string;
  speaker: string;
  text: string;
  reason: SilentReason;
  file: string;
  path: string;
}

/** A pack entry the job leaves out, with why. */
export interface Skipped {
  id: string;
  file: string;
  path: string;
  reason: string;
}

export interface BuildResult {
  job: Job;
  silent: SilentCaption[];
  skipped: Skipped[];
}

export interface BuildOptions {
  /** Profiles every Story board picture is rendered for. Default: `dashboard`. */
  profiles?: Readonly<Record<string, { width: number; height: number }>>;
}

type Pos = { speaker: string; text: string; path: string };

const FILL_IN = /[{}]/;
const kindOf = (id: string) => id.slice(0, id.indexOf("."));

/** Every `narrate` line in the manifest's chapters and game effects, with where it is. */
const inlineLines = (pack: StoryPack): Pos[] => {
  const out: Pos[] = [];
  const scan = (entry: { effects: PackEffect[] } | undefined, at: string) => {
    entry?.effects.forEach((effect, e) => {
      if (effect.kind !== "narrate") return;
      effect.lines.forEach((line, l) => {
        out.push({ speaker: line.speaker, text: line.text, path: `${at}.effects.${e}.lines.${l}` });
      });
    });
  };
  scan(pack.game.start, "game.start");
  scan(pack.game.end, "game.end");
  pack.chapters.forEach((chapter, c) => {
    scan(chapter.start, `chapters.${c}.start`);
    scan(chapter.end, `chapters.${c}.end`);
    chapter.timed_beats.forEach((beat, b) => {
      scan(beat, `chapters.${c}.timed_beats.${b}`);
    });
  });
  return out;
};

interface Manifest {
  packId: string;
  cover?: string;
  assets: StoryPack["assets"];
  inline: Pos[];
}

const readManifest = (files: PackFiles): Manifest | undefined => {
  const raw = files.data("pack.yaml");
  if (raw === undefined) return undefined;
  const story = isRecord(raw) && raw.format === 2;
  const parsed = story ? storyPackSchema.safeParse(raw) : packMetadataSchema.safeParse(raw);
  if (!parsed.success) {
    for (const found of packV2Issues(parsed.error)) {
      files.issues.push(issue("pack.yaml", found.path || "(file)", found.rule, found.message));
    }
    return undefined;
  }
  if (story) {
    const pack = parsed.data as StoryPack;
    return {
      packId: pack.pack_id,
      ...(pack.cover === undefined ? {} : { cover: pack.cover }),
      assets: pack.assets,
      inline: inlineLines(pack),
    };
  }
  const meta = parsed.data as { pack_id: string; cover?: string };
  return {
    packId: meta.pack_id,
    ...(meta.cover === undefined ? {} : { cover: meta.cover }),
    assets: [],
    inline: [],
  };
};

const readArt = (
  files: PackFiles,
  manifest: Manifest,
  profiles: string[],
  skipped: Skipped[],
): { pictures: JobPicture[]; sounds: JobSound[]; byPath: Map<string, string> } => {
  const pictures: JobPicture[] = [];
  const byPath = new Map<string, string>();
  const sounds: JobSound[] = [];
  const source = (rel: string | undefined, id: string, at: string): string | undefined => {
    if (rel === undefined) {
      files.issues.push(issue("pack.yaml", at, RULE.source, `${id} has no path to a source file.`));
      return undefined;
    }
    if (files.bytes(rel, `${at}.path`, "pack.yaml") === undefined) return undefined;
    return files.absolute(rel);
  };
  const validId = (id: string, at: string): boolean => {
    if (isAssetId(id)) return true;
    files.issues.push(
      issue(
        "pack.yaml",
        `${at}.id`,
        RULE.id,
        `${id} is not a valid asset id: <kind>.<entry>[~<variant>], lowercase kebab-case.`,
      ),
    );
    return false;
  };

  // The cover is the one painting with a glow mask: exactly one `glow.cover`.
  if (manifest.cover !== undefined) {
    const path = source(manifest.cover, "painting.cover", "cover");
    if (path !== undefined) {
      pictures.push({ id: "painting.cover", kind: "painting", profiles, source: path, glow: true });
      byPath.set(manifest.cover, "painting.cover");
    }
  }
  manifest.assets.forEach((asset, a) => {
    const at = `assets.${a}`;
    // Story art plays on the Story board only (C-03, D1): `ipad` and `phone` are rejected.
    if (asset.target !== "storyboard") {
      files.issues.push(
        issue(
          "pack.yaml",
          `${at}.target`,
          RULE.target,
          `${asset.id} targets ${asset.target}. Story pictures and sounds play on the Story board only; remove or retarget it.`,
        ),
      );
      return;
    }
    switch (asset.type) {
      case "still":
      case "portrait": {
        if (!validId(asset.id, at)) return;
        const path = source(asset.path, asset.id, at);
        if (path !== undefined) {
          pictures.push({ id: asset.id, kind: kindOf(asset.id), profiles, source: path });
          if (asset.path !== undefined) byPath.set(asset.path, asset.id);
        }
        return;
      }
      case "music":
      case "ambient":
      case "sfx": {
        if (!validId(asset.id, at)) return;
        const path = source(asset.path, asset.id, at);
        const kind =
          asset.type === "sfx" ? "effect" : asset.type === "ambient" ? "ambience" : "music";
        if (path !== undefined) sounds.push({ id: asset.id, kind, source: path });
        return;
      }
      case "line":
        skipped.push({
          id: asset.id,
          file: "pack.yaml",
          path: at,
          reason: "a recorded line file: lines come from the script, not assets[]",
        });
        return;
      case "clip":
        skipped.push({
          id: asset.id,
          file: "pack.yaml",
          path: at,
          reason: "a clip: clips are parked (DEC-342)",
        });
        return;
    }
  });
  return { pictures, sounds, byPath };
};

/**
 * `camera/<momentId>.json` sidecars: a drawn track (`still` is the picture's file in the pack)
 * or a named move (`move`, `speed`, `focus`, and `picture`: the picture's asset id).
 */
const readMoments = (files: PackFiles, byPath: ReadonlyMap<string, string>): JobMoment[] => {
  const moments: JobMoment[] = [];
  for (const name of files.jsonNames("camera")) {
    const file = `camera/${name}`;
    const stem = basename(name, extname(name));
    const raw = files.data(file);
    if (raw === undefined) continue;
    if (!isRecord(raw) || raw.id !== stem) {
      files.issues.push(
        issue(file, "id", RULE.camera, `The camera id must be the file name, ${stem}.`),
      );
      continue;
    }
    if (!isAssetId(stem)) {
      files.issues.push(
        issue(file, "id", RULE.id, `${stem} is not a valid moment id: <scene>.<moment>.`),
      );
      continue;
    }
    const { id: _id, picture: named, ...rest } = raw;
    const camera: Record<string, unknown> = "cues" in rest ? { track: rest } : rest;
    const checked = cameraSchema.safeParse(camera);
    if (!checked.success) {
      for (const found of checked.error.issues) {
        files.issues.push(
          issue(file, found.path.join(".") || "(file)", RULE.camera, found.message),
        );
      }
      continue;
    }
    const still = checked.data.track?.still;
    const picture =
      still === undefined
        ? typeof named === "string"
          ? named
          : undefined
        : (byPath.get(still) ?? byPath.get(`assets/${still}`));
    if (picture === undefined) {
      files.issues.push(
        issue(
          file,
          still === undefined ? "picture" : "track.still",
          RULE.camera,
          still === undefined
            ? "A named move names its picture asset id in `picture`."
            : `${still} is not the file of a picture in this pack.`,
        ),
      );
      continue;
    }
    moments.push({ id: stem, picture, camera: checked.data });
  }
  return moments;
};

interface Cast {
  members: JobCastMember[];
  lines: JobLine[];
  silent: SilentCaption[];
}

/** DEC-349, D2 and the manager defaults: which lines are voiced, and the cast they make. */
const buildCast = (files: PackFiles, manifest: Manifest): Cast => {
  const castFile = files.has(CAST_FILE) ? readCast(files) : [];
  const script: ScriptLine[] = files.has(SCRIPT_FILE) ? readScript(files) : [];
  const byId = new Map<string, CastEntry>(castFile.map((c) => [c.id, c]));
  const seen = new Map<string, number>();
  for (const line of script) seen.set(line.text, (seen.get(line.text) ?? 0) + 1);

  const silent: SilentCaption[] = [];
  const lines: JobLine[] = [];
  for (const line of script) {
    const speaker = byId.get(line.speaker);
    if (speaker === undefined) {
      files.issues.push(
        issue(
          SCRIPT_FILE,
          `${line.path}.speaker`,
          RULE.speaker,
          `Speaker ${line.speaker} is not in cast.yaml.`,
        ),
      );
      continue;
    }
    // Once-only and fixed text, a valid stable id and a voiced speaker: else silent.
    const reason: SilentReason | undefined =
      line.target !== undefined
        ? "private"
        : !isAssetId(line.id)
          ? "invalid-id"
          : FILL_IN.test(line.text)
            ? "fill-in"
            : (seen.get(line.text) ?? 0) > 1
              ? "repeated"
              : speaker.voice === undefined
                ? "no-voice"
                : undefined;
    if (reason === undefined) {
      lines.push({ id: line.id, speaker: line.speaker, text: line.text });
    } else {
      silent.push({
        id: line.id,
        speaker: line.speaker,
        text: line.text,
        reason,
        file: SCRIPT_FILE,
        path: line.path,
      });
    }
  }
  // Legacy inline narrator captions: no id and no approved voice copy. Always silent.
  for (const legacy of manifest.inline) {
    silent.push({ ...legacy, reason: "legacy-inline", file: "pack.yaml" });
  }

  const voiced = new Set(lines.map((l) => l.speaker));
  const members: JobCastMember[] = castFile.map((entry) => {
    const speaks = voiced.has(entry.id) && entry.voice !== undefined;
    return {
      id: entry.id,
      name: entry.name,
      ...(speaks && entry.voice ? { voice: entry.voice } : {}),
      // Loremaster: audio only, no portraits (D8). A cast member with no voiced line: stills only.
      moods: speaks && LOREMASTER_IDS.includes(entry.id) ? [] : [...MOODS],
    };
  });
  return { members, lines, silent };
};

/** asset-studio's own rules for the job, as file/path/rule issues placed in the pack. */
const jobIssues = (job: Job): Issue[] => {
  const checked = jobSchema.safeParse(job);
  if (checked.success) return [];
  return checked.error.issues.map((found) => {
    const [head, index] = found.path;
    const moment = head === "moments" && typeof index === "number" ? job.moments[index] : undefined;
    const file = moment ? `camera/${moment.id}.json` : "asset-job.json";
    return issue(file, found.path.join(".") || "(job)", RULE.job, found.message);
  });
};

/**
 * Reads a pack folder and builds its asset job (no status, no tower cue, nothing physical).
 * Throws `NeedsError` with every issue found; it never returns a half-valid job.
 */
export const buildJobFromDir = (
  story: string,
  packDir: string,
  options: BuildOptions = {},
): BuildResult => {
  const files = new PackFiles(packDir);
  const profiles = options.profiles ?? DEFAULT_PROFILES;
  const skipped: Skipped[] = [];
  const manifest = files.issues.length === 0 ? readManifest(files) : undefined;
  if (files.issues.length > 0 || manifest === undefined) throw new NeedsError(files.issues);
  if (manifest.packId !== story) {
    files.issues.push(
      issue(
        "pack.yaml",
        "pack_id",
        RULE.shape,
        `pack_id ${manifest.packId} is not the folder name ${story}.`,
      ),
    );
  }
  const art = readArt(files, manifest, Object.keys(profiles), skipped);
  const cast = buildCast(files, manifest);
  const moments = readMoments(files, art.byPath);
  if (files.issues.length > 0) throw new NeedsError(files.issues);

  const job: Job = {
    schema: 1,
    story,
    source: files.sourceHash(),
    profiles: Object.fromEntries(
      Object.entries(profiles).map(([name, size]) => [
        name,
        { width: size.width, height: size.height },
      ]),
    ),
    cast: cast.members,
    lines: cast.lines,
    pictures: art.pictures,
    moments,
    sounds: art.sounds,
  };
  const problems = jobIssues(job);
  if (problems.length === 0) {
    try {
      assetKeys(job);
    } catch (error) {
      problems.push(issue("pack.yaml", "assets", RULE.id, errorText(error)));
    }
  }
  if (problems.length > 0) throw new NeedsError(problems);
  return { job, silent: cast.silent, skipped };
};

/** Repo root from `src/assets/needs`. */
const REPO_ROOT = resolve(import.meta.dirname, "../../../../..");

/** The packs folder: `PACKS_DIR` when set, else `<repo>/packs`. */
export const defaultPacksDir = (env: Readonly<Record<string, string | undefined>> = process.env) =>
  resolve(env.PACKS_DIR ?? join(REPO_ROOT, "packs"));

/** Builds the job for `<packsDir>/<story>` (default packs folder: `defaultPacksDir()`). */
export const buildJob = (
  story: string,
  options: BuildOptions & { packsDir?: string } = {},
): BuildResult =>
  buildJobFromDir(story, join(options.packsDir ?? defaultPacksDir(), story), options);
