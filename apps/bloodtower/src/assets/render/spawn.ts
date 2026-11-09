import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

export interface SpawnResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Runs a program to the end. Injected so a test can spy on it or stand in for the bin. */
export type SpawnFn = (
  command: string,
  args: readonly string[],
  options: { env: Readonly<Record<string, string | undefined>>; cwd: string },
) => Promise<SpawnResult>;

/**
 * The `asset-studio` bin. The package `exports` block imports of `dist/bin/main.js`, not a
 * file path, so find the folder of the one exported entry (`dist/index.js`) and go from there.
 */
export const assetStudioBin = (): string =>
  join(dirname(createRequire(import.meta.url).resolve("@asset-studio/cli")), "bin", "main.js");

export const realSpawn: SpawnFn = (command, args, options) =>
  new Promise((resolve, reject) => {
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(options.env)) {
      if (value !== undefined) env[key] = value;
    }
    const child = spawn(command, [...args], { env, cwd: options.cwd, stdio: "pipe" });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => out.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => err.push(chunk));
    child.on("error", reject);
    child.on("close", (code, signal) => {
      resolve({
        code: code ?? (signal === null ? 1 : 128),
        stdout: Buffer.concat(out).toString("utf8"),
        stderr: Buffer.concat(err).toString("utf8"),
      });
    });
  });
