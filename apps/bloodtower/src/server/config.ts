import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

/** Main-checkout ports. A worktree's `.wt.json` replaces them. They stay off tower-poc and the funeral POC. */
export const DEFAULT_DEV_PORT = 4787;
export const DEFAULT_E2E_PORT = 4788;

const APP_ROOT = resolve(import.meta.dirname, "../..");
const REPO_ROOT = resolve(APP_ROOT, "../..");
export const DEFAULT_DATA_DIR = join(APP_ROOT, "data");
/** Top-level `packs/`. `.wt.json` `packsDir` replaces it. `PACKS_DIR` replaces both. */
export const DEFAULT_PACKS_DIR = join(REPO_ROOT, "packs");

/** Playwright's SQLite folder: under the checkout's data dir, never a shared temp path. */
export const e2eDataDir = (dataDir: string): string => join(dataDir, "e2e");

export interface AppConfig {
  /** Port this process binds. `PORT` overrides it; otherwise it is `ports.dev`. */
  port: number;
  ports: { dev: number; e2e: number };
  dataDir: string;
  packsDir: string;
  /** Set when a `.wt.json` above the start directory was read. */
  wtFile?: string;
}

export interface LoadConfigOptions {
  /** Directory to start the `.wt.json` walk from. Defaults to this file's folder. */
  startDir?: string;
  /** Resolves a relative `PACKS_DIR`. Defaults to the process cwd. */
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

const parsePort = (value: unknown, label: string) => {
  const port =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`${label} must be an integer from 0 to 65535, got ${JSON.stringify(value)}.`);
  }
  return port;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Walks parents for `.wt.json` and stops at a checkout root (a `.git` file or directory)
 * so a config outside this repo is never picked up.
 */
export const findWtFile = (startDir: string): string | undefined => {
  let dir = resolve(startDir);
  for (;;) {
    const candidate = join(dir, ".wt.json");
    if (existsSync(candidate)) return candidate;
    if (existsSync(join(dir, ".git"))) return undefined;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
};

const readWt = (file: string) => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read ${file}: ${message}`);
  }
  if (!isRecord(parsed)) throw new Error(`${file} must be a JSON object.`);
  return parsed;
};

const resolveDir = (value: unknown, label: string, base: string) => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty path.`);
  }
  return isAbsolute(value) ? resolve(value) : resolve(base, value);
};

/** Ports, the SQLite folder and the packs folder. Env vars win over `.wt.json`, which wins over the defaults. */
export const loadConfig = (options: LoadConfigOptions = {}): AppConfig => {
  const env = options.env ?? process.env;
  const startDir = options.startDir ?? import.meta.dirname;
  const cwd = options.cwd ?? process.cwd();
  const wtFile = findWtFile(startDir);
  const wt = wtFile ? readWt(wtFile) : undefined;
  const wtDir = wtFile ? dirname(wtFile) : startDir;

  let dev = DEFAULT_DEV_PORT;
  let e2e = DEFAULT_E2E_PORT;
  if (wt && "ports" in wt && wt.ports !== undefined) {
    if (!isRecord(wt.ports)) throw new Error(`${wtFile} ports must be an object.`);
    if (wt.ports.dev !== undefined) dev = parsePort(wt.ports.dev, `${wtFile} ports.dev`);
    if (wt.ports.e2e !== undefined) e2e = parsePort(wt.ports.e2e, `${wtFile} ports.e2e`);
  }

  let dataDir = DEFAULT_DATA_DIR;
  if (wt && wt.dataDir !== undefined) dataDir = resolveDir(wt.dataDir, `${wtFile} dataDir`, wtDir);

  let packsDir = DEFAULT_PACKS_DIR;
  if (wt && wt.packsDir !== undefined) {
    packsDir = resolveDir(wt.packsDir, `${wtFile} packsDir`, wtDir);
  }

  const port = env.PORT !== undefined && env.PORT !== "" ? parsePort(env.PORT, "PORT") : dev;
  if (env.DATA_DIR !== undefined && env.DATA_DIR !== "") {
    dataDir = resolveDir(env.DATA_DIR, "DATA_DIR", cwd);
  }
  if (env.PACKS_DIR !== undefined && env.PACKS_DIR !== "") {
    packsDir = resolveDir(env.PACKS_DIR, "PACKS_DIR", cwd);
  }

  return {
    port,
    ports: { dev, e2e },
    dataDir,
    packsDir,
    ...(wtFile ? { wtFile } : {}),
  };
};
