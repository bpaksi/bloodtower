import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, extname, join, sep } from "node:path";
import type { PackLoadIssue } from "./load.ts";

export const PACK_CAMERA_DIR = "camera";

const isInside = (root: string, file: string) => file === root || file.startsWith(`${root}${sep}`);

const warn = (file: string, path: string, message: string): PackLoadIssue => ({
  rule: "W-camera",
  file,
  path,
  message: message.startsWith("W-camera:") ? message : `W-camera: ${message}`,
});

/** `camera/` may hold only flat JSON sidecars; one track per moment id. */
export const validateCameraFolder = (
  packRoot: string,
  push: (issue: PackLoadIssue) => void,
): void => {
  const cameraDir = join(packRoot, PACK_CAMERA_DIR);
  if (!existsSync(cameraDir)) return;
  let realDir = cameraDir;
  try {
    realDir = realpathSync(cameraDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    push({
      rule: "V-1",
      file: PACK_CAMERA_DIR,
      path: "(file)",
      message: `V-1: ${message}`,
    });
    return;
  }
  if (!isInside(packRoot, realDir)) {
    push({
      rule: "V-1",
      file: PACK_CAMERA_DIR,
      path: "(file)",
      message: "V-1: The camera folder stays inside the pack folder.",
    });
    return;
  }
  if (!statSync(realDir).isDirectory()) {
    push({
      rule: "V-1",
      file: PACK_CAMERA_DIR,
      path: "(file)",
      message: "V-1: The camera entry must be a folder.",
    });
    return;
  }
  for (const name of readdirSync(realDir)) {
    const label = `${PACK_CAMERA_DIR}/${name}`;
    const full = join(realDir, name);
    let real = full;
    try {
      real = realpathSync(full);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      push({ rule: "V-1", file: label, path: "(file)", message: `V-1: ${message}` });
      continue;
    }
    if (!isInside(realDir, real)) {
      push({
        rule: "V-1",
        file: label,
        path: "(file)",
        message: "V-1: A camera file stays inside the camera folder.",
      });
      continue;
    }
    const stat = statSync(real);
    if (stat.isDirectory()) {
      push({
        rule: "V-1",
        file: label,
        path: "(file)",
        message: "V-1: The camera folder has no subfolders.",
      });
      continue;
    }
    if (extname(name).toLowerCase() !== ".json") {
      push({
        rule: "V-1",
        file: label,
        path: "(file)",
        message: "V-1: A camera file must be JSON.",
      });
    }
  }
};

export interface PackCameraIndex {
  /** Moment id (file stem) → absolute path to the sidecar JSON. */
  byMomentId: ReadonlyMap<string, string>;
  warnings: readonly PackLoadIssue[];
}

const readTrackId = (absolute: string): string | undefined => {
  try {
    const parsed = JSON.parse(readFileSync(absolute, "utf8")) as { id?: unknown };
    return typeof parsed.id === "string" && parsed.id.length > 0 ? parsed.id : undefined;
  } catch {
    return undefined;
  }
};

export const indexPackCamera = (packRoot: string): PackCameraIndex => {
  const cameraDir = join(packRoot, PACK_CAMERA_DIR);
  const warnings: PackLoadIssue[] = [];
  const byMomentId = new Map<string, string>();
  if (!existsSync(cameraDir)) return { byMomentId, warnings };

  let realDir = cameraDir;
  try {
    realDir = realpathSync(cameraDir);
  } catch {
    return { byMomentId, warnings };
  }
  if (!isInside(packRoot, realDir) || !statSync(realDir).isDirectory()) {
    return { byMomentId, warnings };
  }

  for (const name of readdirSync(realDir)) {
    if (extname(name).toLowerCase() !== ".json") continue;
    const label = `${PACK_CAMERA_DIR}/${name}`;
    const absolute = join(realDir, name);
    let real = absolute;
    try {
      real = realpathSync(absolute);
    } catch {
      warnings.push(warn(label, "(file)", "Could not read the camera file."));
      continue;
    }
    if (!isInside(realDir, real) || !statSync(real).isFile()) continue;
    const stem = basename(name, ".json");
    const id = readTrackId(real);
    if (!id) {
      warnings.push(warn(label, "id", "Camera JSON is missing a string id."));
      continue;
    }
    if (id !== stem) {
      warnings.push(warn(label, "id", `Camera id ${id} does not match the file stem ${stem}.`));
      continue;
    }
    if (byMomentId.has(id)) {
      warnings.push(warn(label, "id", `Camera id ${id} is listed twice.`));
      continue;
    }
    byMomentId.set(id, real);
  }
  return { byMomentId, warnings };
};
