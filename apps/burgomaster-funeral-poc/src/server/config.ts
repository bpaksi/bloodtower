import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** Main-checkout ports. A worktree adds its offset in `.wt.json` (docs/sdlc.md). */
export const DEFAULT_DEV_PORT = 4767;
export const DEFAULT_E2E_PORT = 4768;

const APP_ROOT = resolve(import.meta.dirname, "../..");
export const DEFAULT_DATA_DIR = join(APP_ROOT, "data");

export interface AppConfig {
  /** Port this process binds. `PORT` overrides it; otherwise it is `ports.dev`. */
  port: number;
  ports: { dev: number; e2e: number };
  dataDir: string;
  /** Set when a `.wt.json` above the start directory was read. */
  wtFile?: string;
}

export interface LoadConfigOptions {
  /** Directory to start the `.wt.json` walk from. Defaults to this file's folder. */
  startDir?: string;
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

/** Ports and the SQLite folder. `.wt.json` wins over the defaults; `PORT` and `DATA_DIR` win over both. */
export const loadConfig = (options: LoadConfigOptions = {}): AppConfig => {
  const env = options.env ?? process.env;
  const startDir = options.startDir ?? import.meta.dirname;
  const wtFile = findWtFile(startDir);
  const wt = wtFile ? readWt(wtFile) : undefined;

  let dev = DEFAULT_DEV_PORT;
  let e2e = DEFAULT_E2E_PORT;
  if (wt && "ports" in wt && wt.ports !== undefined) {
    if (!isRecord(wt.ports)) throw new Error(`${wtFile} ports must be an object.`);
    if (wt.ports.dev !== undefined) dev = parsePort(wt.ports.dev, `${wtFile} ports.dev`);
    if (wt.ports.e2e !== undefined) e2e = parsePort(wt.ports.e2e, `${wtFile} ports.e2e`);
  }

  let dataDir = DEFAULT_DATA_DIR;
  if (wt && wt.dataDir !== undefined) {
    if (typeof wt.dataDir !== "string" || wt.dataDir.trim() === "") {
      throw new Error(`${wtFile} dataDir must be a non-empty path.`);
    }
    dataDir = resolve(wtFile ? dirname(wtFile) : startDir, wt.dataDir);
  }

  const port = env.PORT !== undefined && env.PORT !== "" ? parsePort(env.PORT, "PORT") : dev;
  if (env.DATA_DIR !== undefined && env.DATA_DIR !== "") {
    dataDir = resolve(env.DATA_DIR);
  }

  return {
    port,
    ports: { dev, e2e },
    dataDir,
    ...(wtFile ? { wtFile } : {}),
  };
};
