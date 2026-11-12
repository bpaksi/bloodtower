import { lstatSync, mkdirSync, readdirSync, rmdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { errorText } from "../needs/source.ts";
import { PACK_RULE, PackError, packIssue } from "./issues.ts";

export const LOCK_NAME = ".pack-lock";

/** Temp names a killed `assets:pack` leaves in `assets/`. */
export const LEFTOVER = /^(?:[0-9a-f]{64}\.(?:webp|m4a)|index\.json)\.tmp-\d+$/;

/**
 * Takes the per-story lock `<work>/<story>/.pack-lock` (an atomic `mkdir`). It lives in the work
 * folder, so a lock left behind never trips the pack's V-1 check. Returns the release function.
 */
export const takeLock = (storyWorkDir: string): (() => void) => {
  const lock = join(storyWorkDir, LOCK_NAME);
  try {
    mkdirSync(lock);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new PackError([
        packIssue(
          lock,
          "(file)",
          PACK_RULE.locked,
          `another assets:pack is running for this story, or one was killed. Lock: ${lock}. Wait for the other run, or delete that folder if none is running.`,
        ),
      ]);
    }
    throw error;
  }
  return () => rmdirSync(lock);
};

/**
 * Removes leftover temp files from an interrupted copy (exact names only) and returns their names.
 * Call with the lock held.
 */
export const removeLeftovers = (packDir: string): string[] => {
  const assets = join(packDir, "assets");
  let names: string[];
  try {
    names = readdirSync(assets);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const removed: string[] = [];
  for (const name of names.filter((n) => LEFTOVER.test(n)).sort()) {
    const path = join(assets, name);
    try {
      if (!lstatSync(path).isFile()) continue;
      rmSync(path);
      removed.push(name);
    } catch (error) {
      throw new PackError([
        packIssue(
          `assets/${name}`,
          "(file)",
          PACK_RULE.exportIndex,
          `cannot remove leftover ${name}: ${errorText(error)}`,
        ),
      ]);
    }
  }
  return removed;
};
