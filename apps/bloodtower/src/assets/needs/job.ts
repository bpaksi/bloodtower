import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  type AssetKey,
  assetKeys,
  type Job,
  readIndex,
  type WorkPaths,
  workPaths,
} from "./deps.ts";
import { errorText } from "./source.ts";

export const JOB_FILE = "asset-job.json";

/** The work folder's paths for one story: `<wf>/<story>/{asset-job.json,index.json,…}`. */
export const workPathsFor = (workFolder: string, story: string): WorkPaths =>
  workPaths(workFolder, story);

export const jobPath = (workFolder: string, story: string): string =>
  join(workPathsFor(workFolder, story).root, JOB_FILE);

/** The job as written: stable key order, two-space indent, trailing newline. */
export const serializeJob = (job: Job): string => `${JSON.stringify(job, null, 2)}\n`;

export interface WriteIo {
  writeFile: (path: string, data: string) => void;
  rename: (from: string, to: string) => void;
  remove: (path: string) => void;
  log: (message: string) => void;
}

const realIo: WriteIo = {
  writeFile: (path, data) => writeFileSync(path, data),
  rename: renameSync,
  remove: (path) => rmSync(path, { force: true }),
  log: (message) => console.error(message),
};

/**
 * Writes the job to a temp file next to the target, then renames it into place (D3).
 * A failed write removes the temp file, leaves the previous job as it was and rethrows.
 */
export const writeJob = (workFolder: string, job: Job, io: WriteIo = realIo): string => {
  const target = jobPath(workFolder, job.story);
  const temp = `${target}.${process.pid}.tmp`;
  try {
    mkdirSync(workPathsFor(workFolder, job.story).root, { recursive: true });
    io.writeFile(temp, serializeJob(job));
    io.rename(temp, target);
  } catch (error) {
    try {
      io.remove(temp);
    } catch (cleanup) {
      io.log(`assets:needs: could not remove ${temp}: ${errorText(cleanup)}`);
    }
    throw error;
  }
  return target;
};

export interface NeedRow {
  id: string;
  kind: string;
  origin: "job" | "built";
  status: string;
}

/** Every index key the job implies with its status from the work folder (`missing` if absent). */
export const computeRows = (job: Job, paths: WorkPaths): NeedRow[] => {
  const index = readIndex(paths);
  return assetKeys(job)
    .map((asset: AssetKey) => ({
      id: asset.key,
      kind: asset.kind,
      origin: asset.origin,
      status: index[asset.key]?.status ?? "missing",
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
};

/** `<key>  <kind>  <status>` padded like the asset-studio CLI. */
export const formatRows = (rows: readonly NeedRow[]): string => {
  if (rows.length === 0) return "";
  const idWidth = Math.max(...rows.map((r) => r.id.length));
  const kindWidth = Math.max(...rows.map((r) => r.kind.length));
  const lines = rows.map(
    (r) => `${r.id.padEnd(idWidth)}  ${r.kind.padEnd(kindWidth)}  ${r.status}`,
  );
  return `${lines.join("\n")}\n`;
};
