import {
  copyFileSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, sep } from "node:path";
import { packIndexSchema } from "../lint/indexSchema.ts";
import { INDEX_FILE } from "../lint/rules.ts";
import { errorText } from "../needs/source.ts";
import { HASH_NAME, sha256 } from "./exportIndex.ts";
import { PACK_RULE, PackError, packIssue } from "./issues.ts";

/** The file operations of the commit, so a test can fail one of them (D3). */
export interface CommitIo {
  copyFile: (from: string, to: string) => void;
  writeFile: (path: string, data: string) => void;
  rename: (from: string, to: string) => void;
  remove: (path: string) => void;
}

export const realCommitIo: CommitIo = {
  copyFile: copyFileSync,
  writeFile: (path, data) => writeFileSync(path, data),
  rename: renameSync,
  remove: (path) => rmSync(path, { force: true }),
};

export interface CommitInput {
  /** `packs/<story>`. */
  packDir: string;
  /** The folder the export wrote (already checked). */
  exportDir: string;
  /** New `assets/index.json` text. */
  indexText: string;
  /** File names the new index names, with the asset id of the first entry using each. */
  files: ReadonlyMap<string, string>;
  io?: CommitIo;
}

export interface CommitResult {
  /** Files copied into `assets/` (not counting ones already there). */
  copied: string[];
  /** Stale files deleted: `removed <file> (was <id>)`. */
  removed: { file: string; id: string }[];
  /** Things worth saying that do not fail the run. */
  warnings: string[];
  /** Stale files that could not be deleted. The new index is already in place. */
  errors: string[];
}

const lstatOrUndefined = (path: string) => {
  try {
    return lstatSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
};

const fail = (file: string, message: string): never => {
  throw new PackError([packIssue(file, "(file)", PACK_RULE.exportIndex, message)]);
};

/** The files an old `index.json` names, with their asset ids, or a warning when it cannot be read. */
const readOldIndex = (
  indexFile: string,
): { named: Map<string, string> } | { warning: string } | { missing: true } => {
  const stat = lstatOrUndefined(indexFile);
  if (stat === undefined) return { missing: true };
  if (!stat.isFile()) {
    return { warning: `the old ${INDEX_FILE} is not a regular file; no stale file was deleted.` };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(indexFile, "utf8"));
  } catch (error) {
    return {
      warning: `the old ${INDEX_FILE} could not be parsed (${errorText(error)}); no stale file was deleted.`,
    };
  }
  const parsed = packIndexSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      warning: `the old ${INDEX_FILE} does not match the index schema; no stale file was deleted.`,
    };
  }
  const named = new Map<string, string>();
  for (const [id, entry] of Object.entries(parsed.data.assets)) {
    if (!named.has(entry.file)) named.set(entry.file, id);
  }
  return { named };
};

/**
 * Writes the export's files and the new index into `packs/<story>/assets/` (D3, C-05, D10):
 * new files first (temp name, then rename), the index last (temp name, then rename), stale files
 * after the index. A failure before the index rename removes what this run created and leaves the
 * old index and files as they were. Files the index never named are never touched.
 */
export const commitPack = (input: CommitInput): CommitResult => {
  const io = input.io ?? realCommitIo;
  const result: CommitResult = { copied: [], removed: [], warnings: [], errors: [] };

  let packReal: string;
  try {
    packReal = realpathSync(input.packDir);
  } catch (error) {
    return fail(input.packDir, `cannot read the pack folder: ${errorText(error)}`);
  }
  const assetsDir = join(packReal, "assets");
  const assetsStat = lstatOrUndefined(assetsDir);
  let madeAssetsDir = false;
  if (assetsStat === undefined) {
    // No assets folder yet: make it, and take it away again if this run fails.
    mkdirSync(assetsDir);
    madeAssetsDir = true;
  } else if (!assetsStat.isDirectory()) {
    return fail("assets", "the pack's assets entry is a link or not a folder; it is not followed.");
  }
  const assetsReal = realpathSync(assetsDir);
  if (assetsReal !== assetsDir || !assetsReal.startsWith(`${packReal}${sep}`)) {
    return fail("assets", "the pack's assets folder resolves outside the pack folder.");
  }

  const indexFile = join(assetsReal, "index.json");
  const old = readOldIndex(indexFile);
  if ("warning" in old) result.warnings.push(old.warning);
  const oldNamed = "named" in old ? old.named : new Map<string, string>();

  // Before any write: a file already there under a new name must be what its name says.
  const toCopy: string[] = [];
  for (const name of input.files.keys()) {
    const existing = lstatOrUndefined(join(assetsReal, name));
    if (existing === undefined) {
      toCopy.push(name);
      continue;
    }
    if (!existing.isFile()) {
      return fail(
        `assets/${name}`,
        `${name} already exists in the pack and is not a regular file.`,
      );
    }
    const hash = sha256(readFileSync(join(assetsReal, name)));
    if (hash !== name.slice(0, 64)) {
      return fail(
        `assets/${name}`,
        `${name} already exists in the pack but its bytes hash to ${hash}; delete it and run again.`,
      );
    }
  }

  const created: string[] = [];
  const temps: string[] = [];
  let committed = false;
  try {
    for (const name of toCopy) {
      const temp = join(assetsReal, `${name}.tmp-${process.pid}`);
      temps.push(temp);
      io.copyFile(join(input.exportDir, name), temp);
      if (sha256(readFileSync(temp)) !== name.slice(0, 64)) {
        throw new PackError([
          packIssue(
            `assets/${name}`,
            "(file)",
            PACK_RULE.exportIndex,
            `${name} changed while it was copied.`,
          ),
        ]);
      }
      io.rename(temp, join(assetsReal, name));
      created.push(name);
    }
    const indexTemp = `${indexFile}.tmp-${process.pid}`;
    temps.push(indexTemp);
    io.writeFile(indexTemp, input.indexText);
    io.rename(indexTemp, indexFile);
    committed = true;
  } finally {
    if (!committed) {
      const problems: string[] = [];
      for (const temp of temps) {
        try {
          io.remove(temp);
        } catch (error) {
          problems.push(`could not remove ${temp}: ${errorText(error)}`);
        }
      }
      for (const name of created) {
        if (oldNamed.has(name)) continue;
        try {
          io.remove(join(assetsReal, name));
        } catch (error) {
          problems.push(`could not remove ${name}: ${errorText(error)}`);
        }
      }
      if (madeAssetsDir) {
        try {
          rmdirSync(assetsReal);
        } catch (error) {
          problems.push(`could not remove the new assets folder: ${errorText(error)}`);
        }
      }
      // A failed rollback must not hide the failure that caused it: say so on stderr.
      for (const problem of problems) process.stderr.write(`assets:pack: ${problem}\n`);
    }
  }
  result.copied = created;

  // The new index is in place. Now delete the files only the old index named.
  for (const [name, id] of oldNamed) {
    if (input.files.has(name) || !HASH_NAME.test(name)) continue;
    const path = join(assetsReal, name);
    try {
      const stat = lstatOrUndefined(path);
      if (stat === undefined) continue;
      if (!stat.isFile()) {
        result.warnings.push(`${name} (was ${id}) is not a regular file; it was left alone.`);
        continue;
      }
      io.remove(path);
      result.removed.push({ file: name, id });
    } catch (error) {
      result.errors.push(`could not remove ${name} (was ${id}): ${errorText(error)}`);
    }
  }
  return result;
};
