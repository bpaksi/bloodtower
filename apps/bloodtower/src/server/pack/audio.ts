import { existsSync, readdirSync, realpathSync, statSync } from "node:fs";
import { extname, join, sep } from "node:path";
import type { PackLoadIssue } from "./load.ts";

export const PACK_AUDIO_DIR = "audio";
export const PACK_AUDIO_EXTENSION = ".m4a";

const isInside = (root: string, file: string) => file === root || file.startsWith(`${root}${sep}`);

const issueFor = (file: string, message: string): PackLoadIssue => ({
  rule: "V-1",
  file,
  path: "(file)",
  message: `V-1: ${message}`,
});

/** `audio/` may hold only flat `.m4a` files. The loader serves them at `/packs/<id>/audio/<file>`. */
export const validateAudioFolder = (
  packRoot: string,
  push: (issue: PackLoadIssue) => void,
): void => {
  const audioDir = join(packRoot, PACK_AUDIO_DIR);
  if (!existsSync(audioDir)) return;
  let realDir = audioDir;
  try {
    realDir = realpathSync(audioDir);
  } catch (error) {
    push(issueFor(PACK_AUDIO_DIR, error instanceof Error ? error.message : String(error)));
    return;
  }
  if (!isInside(packRoot, realDir)) {
    push(issueFor(PACK_AUDIO_DIR, "The audio folder stays inside the pack folder."));
    return;
  }
  if (!statSync(realDir).isDirectory()) {
    push(issueFor(PACK_AUDIO_DIR, "The audio entry must be a folder."));
    return;
  }
  for (const name of readdirSync(realDir)) {
    const label = `${PACK_AUDIO_DIR}/${name}`;
    let real = join(realDir, name);
    try {
      real = realpathSync(real);
    } catch (error) {
      push(issueFor(label, error instanceof Error ? error.message : String(error)));
      continue;
    }
    if (!isInside(realDir, real)) {
      push(issueFor(label, "An audio file stays inside the audio folder."));
      continue;
    }
    if (statSync(real).isDirectory()) {
      push(issueFor(label, "The audio folder has no subfolders."));
      continue;
    }
    if (extname(name).toLowerCase() !== PACK_AUDIO_EXTENSION) {
      push(issueFor(label, "An audio file must be an .m4a file."));
    }
  }
};

export interface PackAudioIndex {
  /** File name (`night1-ambient.m4a`) → absolute path. Only flat `.m4a` files inside the folder. */
  byFile: ReadonlyMap<string, string>;
}

export const indexPackAudio = (packRoot: string): PackAudioIndex => {
  const byFile = new Map<string, string>();
  const audioDir = join(packRoot, PACK_AUDIO_DIR);
  if (!existsSync(audioDir)) return { byFile };
  let realDir: string;
  try {
    realDir = realpathSync(audioDir);
  } catch {
    return { byFile };
  }
  if (!isInside(packRoot, realDir) || !statSync(realDir).isDirectory()) return { byFile };
  for (const name of readdirSync(realDir)) {
    if (extname(name).toLowerCase() !== PACK_AUDIO_EXTENSION) continue;
    let real: string;
    try {
      real = realpathSync(join(realDir, name));
    } catch {
      continue;
    }
    if (!isInside(realDir, real) || !statSync(real).isFile()) continue;
    byFile.set(name, real);
  }
  return { byFile };
};
