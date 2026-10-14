import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_DATA_DIR,
  DEFAULT_DEV_PORT,
  DEFAULT_E2E_PORT,
  findWtFile,
  loadConfig,
} from "./config.ts";

const scratch: string[] = [];

const makeDir = () => {
  const dir = join(tmpdir(), `funeral-config-${Date.now()}-${scratch.length}`);
  mkdirSync(dir, { recursive: true });
  scratch.push(dir);
  return dir;
};

afterEach(() => {
  scratch.length = 0;
});

describe("loadConfig", () => {
  it("uses 4767, 4768 and the app data folder when there is no worktree file", () => {
    const config = loadConfig({ startDir: makeDir(), env: {} });
    expect(config.ports).toEqual({ dev: DEFAULT_DEV_PORT, e2e: DEFAULT_E2E_PORT });
    expect(config.port).toBe(4767);
    expect(config.dataDir).toBe(DEFAULT_DATA_DIR);
    expect(config.wtFile).toBeUndefined();
  });

  it("reads ports and dataDir from .wt.json above the server folder", () => {
    const root = makeDir();
    const nested = join(root, "src", "server");
    mkdirSync(nested, { recursive: true });
    const dataDir = join(root, ".wt-data");
    writeFileSync(
      join(root, ".wt.json"),
      JSON.stringify({ ports: { dev: 4777, e2e: 4778 }, dataDir }),
    );

    const config = loadConfig({ startDir: nested, env: {} });
    expect(config.ports).toEqual({ dev: 4777, e2e: 4778 });
    expect(config.port).toBe(4777);
    expect(config.dataDir).toBe(dataDir);
    expect(findWtFile(nested)).toBe(join(root, ".wt.json"));
  });

  it("stops at a checkout root and ignores a .wt.json outside it", () => {
    const outer = makeDir();
    writeFileSync(
      join(outer, ".wt.json"),
      JSON.stringify({ ports: { dev: 1, e2e: 2 }, dataDir: outer }),
    );
    const checkout = join(outer, "checkout", "src");
    mkdirSync(checkout, { recursive: true });
    writeFileSync(join(outer, "checkout", ".git"), "gitdir: /somewhere\n");

    expect(findWtFile(checkout)).toBeUndefined();
    expect(loadConfig({ startDir: checkout, env: {} }).port).toBe(DEFAULT_DEV_PORT);
  });

  it("lets PORT and DATA_DIR override the worktree without turning a blank PORT into zero", () => {
    const root = makeDir();
    writeFileSync(
      join(root, ".wt.json"),
      JSON.stringify({ ports: { dev: 4777, e2e: 4778 }, dataDir: join(root, "db") }),
    );
    const overridden = loadConfig({
      startDir: root,
      env: { PORT: "4768", DATA_DIR: join(root, "other") },
    });
    expect(overridden.port).toBe(4768);
    expect(overridden.ports.dev).toBe(4777);
    expect(overridden.dataDir).toBe(join(root, "other"));

    const blank = loadConfig({ startDir: root, env: { PORT: "" } });
    expect(blank.port).toBe(4777);
  });

  it("rejects a missing or nonsense port instead of using zero", () => {
    const root = makeDir();
    writeFileSync(join(root, ".wt.json"), JSON.stringify({ ports: { dev: "nope" } }));
    expect(() => loadConfig({ startDir: root, env: {} })).toThrow(/ports\.dev/);
    expect(() => loadConfig({ startDir: makeDir(), env: { PORT: "nope" } })).toThrow(/PORT/);
  });

  it("rejects a worktree file that is not an object", () => {
    const root = makeDir();
    writeFileSync(join(root, ".wt.json"), "[]");
    expect(() => loadConfig({ startDir: root, env: {} })).toThrow(/JSON object/);
  });

  it("resolves a relative dataDir from the worktree file", () => {
    const root = makeDir();
    writeFileSync(join(root, ".wt.json"), JSON.stringify({ dataDir: ".wt-data" }));
    expect(loadConfig({ startDir: root, env: {} }).dataDir).toBe(join(root, ".wt-data"));
  });
});
