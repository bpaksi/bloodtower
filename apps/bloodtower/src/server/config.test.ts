import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_DATA_DIR,
  DEFAULT_DEV_PORT,
  DEFAULT_E2E_PORT,
  DEFAULT_PACKS_DIR,
  e2eDataDir,
  findWtFile,
  loadConfig,
} from "./config.ts";

const scratch: string[] = [];

const makeDir = () => {
  const dir = join(tmpdir(), `bloodtower-config-${Date.now()}-${scratch.length}`);
  mkdirSync(dir, { recursive: true });
  scratch.push(dir);
  return dir;
};

afterEach(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
  scratch.length = 0;
});

describe("loadConfig", () => {
  it("uses 4787, 4788, the app data folder and the repo packs folder", () => {
    const config = loadConfig({ startDir: makeDir(), env: {} });
    expect(config.ports).toEqual({ dev: DEFAULT_DEV_PORT, e2e: DEFAULT_E2E_PORT });
    expect(config.port).toBe(4787);
    expect(config.dataDir).toBe(DEFAULT_DATA_DIR);
    expect(config.packsDir).toBe(DEFAULT_PACKS_DIR);
    expect(config.packsDir.endsWith(`${join("packs")}`)).toBe(true);
    expect(config.wtFile).toBeUndefined();
    expect(DEFAULT_DEV_PORT).not.toBe(4747);
    expect(DEFAULT_DEV_PORT).not.toBe(4767);
  });

  it("reads ports, dataDir and packsDir from .wt.json above the server folder", () => {
    const root = makeDir();
    const nested = join(root, "src", "server");
    mkdirSync(nested, { recursive: true });
    const dataDir = join(root, ".wt-data");
    writeFileSync(
      join(root, ".wt.json"),
      JSON.stringify({
        ports: { dev: 4797, e2e: 4798 },
        dataDir,
        packsDir: join(root, "packs"),
      }),
    );

    const config = loadConfig({ startDir: nested, env: {} });
    expect(config.ports).toEqual({ dev: 4797, e2e: 4798 });
    expect(config.port).toBe(4797);
    expect(config.dataDir).toBe(dataDir);
    expect(config.packsDir).toBe(join(root, "packs"));
    expect(findWtFile(nested)).toBe(join(root, ".wt.json"));
  });

  it("resolves a relative packsDir from the worktree file, not the process cwd", () => {
    const root = makeDir();
    writeFileSync(join(root, ".wt.json"), JSON.stringify({ packsDir: "story-packs" }));
    expect(loadConfig({ startDir: root, env: {}, cwd: makeDir() }).packsDir).toBe(
      join(root, "story-packs"),
    );
  });

  it("lets PACKS_DIR and DATA_DIR override the worktree, and a blank value does not", () => {
    const root = makeDir();
    writeFileSync(
      join(root, ".wt.json"),
      JSON.stringify({
        ports: { dev: 4797, e2e: 4798 },
        dataDir: join(root, "db"),
        packsDir: join(root, "packs"),
      }),
    );
    const overridden = loadConfig({
      startDir: root,
      cwd: root,
      env: { PORT: "4788", DATA_DIR: "other", PACKS_DIR: "elsewhere" },
    });
    expect(overridden.port).toBe(4788);
    expect(overridden.ports.dev).toBe(4797);
    expect(overridden.dataDir).toBe(join(root, "other"));
    expect(overridden.packsDir).toBe(join(root, "elsewhere"));

    const blank = loadConfig({ startDir: root, env: { PORT: "", PACKS_DIR: "", DATA_DIR: "" } });
    expect(blank.port).toBe(4797);
    expect(blank.packsDir).toBe(join(root, "packs"));
    expect(blank.dataDir).toBe(join(root, "db"));
  });

  it("stops at a checkout root and ignores a .wt.json outside it", () => {
    const outer = makeDir();
    writeFileSync(
      join(outer, ".wt.json"),
      JSON.stringify({ ports: { dev: 1, e2e: 2 }, dataDir: outer, packsDir: outer }),
    );
    const checkout = join(outer, "checkout", "src");
    mkdirSync(checkout, { recursive: true });
    writeFileSync(join(outer, "checkout", ".git"), "gitdir: /somewhere\n");

    expect(findWtFile(checkout)).toBeUndefined();
    expect(loadConfig({ startDir: checkout, env: {} }).port).toBe(DEFAULT_DEV_PORT);
  });

  it("rejects a nonsense port instead of using zero", () => {
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

  it("puts the e2e database under the configured data dir", () => {
    const config = loadConfig({ startDir: makeDir(), env: {} });
    expect(e2eDataDir(config.dataDir)).toBe(join(DEFAULT_DATA_DIR, "e2e"));
  });
});
