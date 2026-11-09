import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadJob, readIndex, reject } from "@asset-studio/cli";
import { describe, expect, it } from "vitest";
import { tempDir, writeStoryPack } from "../needs/fixtures.ts";
import { workPathsFor } from "../needs/job.ts";
import { failedAssets, runRender } from "./cli.ts";
import { gradientPng, RENDER_CAST, RENDER_SCRIPT, TOO_LONG_SCRIPT } from "./fixtures.ts";
import { realSpawn, type SpawnFn } from "./spawn.ts";

const VOICE_IDS = ["fixture.01.vo-01", "fixture.01.vo-02"];
const PICTURE_IDS = ["glow.cover", "painting.cover"];

interface Setup {
  packs: string;
  workFolder: string;
  configDir: string;
}

const setup = (script = RENDER_SCRIPT): Setup => {
  const packs = tempDir("packs");
  const dir = writeStoryPack(packs, "fx", {
    files: { "cast.yaml": RENDER_CAST, "script.yaml": script },
  });
  writeFileSync(join(dir, "assets/cover.png"), gradientPng());
  return { packs, workFolder: tempDir("work"), configDir: tempDir("config") };
};

/** The child sees only these variables, so no developer key can reach it (AS-FAKE-1 is on). */
const whitelistEnv = (s: Setup, extra: Record<string, string> = {}) => ({
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  ASSET_STUDIO_FAKE_PROVIDERS: "1",
  ASSET_STUDIO_CONFIG_DIR: s.configDir,
  ...extra,
});

const run = async (
  s: Setup,
  argv: string[],
  options: { withWorkFolder?: boolean; spawn?: SpawnFn; fakes?: boolean } = {},
) => {
  let out = "";
  let err = "";
  const code = await runRender(
    [
      ...argv,
      "--packs-dir",
      s.packs,
      ...(options.withWorkFolder === false ? [] : ["--work-folder", s.workFolder]),
    ],
    {
      env:
        options.fakes === false
          ? { ...whitelistEnv(s), ASSET_STUDIO_FAKE_PROVIDERS: "" }
          : whitelistEnv(s),
      cwd: tempDir("cwd"),
      out: (t) => {
        out += t;
      },
      err: (t) => {
        err += t;
      },
      ...(options.spawn === undefined ? {} : { spawn: options.spawn }),
    },
  );
  return { code, out, err };
};

const keysOf = (s: Setup) => Object.keys(readIndex(workPathsFor(s.workFolder, "fx"))).sort();

const snapshot = (dir: string): string =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => {
      const file = join(e.parentPath, e.name);
      return `${file} ${createHash("sha256").update(readFileSync(file)).digest("hex")}`;
    })
    .sort()
    .join("\n");

describe("A1-04a: render counts under fake providers", () => {
  it("makes 2 voiced lines, 1 picture and 1 glow mask with --ai and prints the counts", async () => {
    const s = setup();
    const result = await run(s, ["fx", "--ai"]);
    expect(result.code).toBe(0);
    expect(result.out).toContain("made 4, failed 0, missing 0");
    expect(keysOf(s)).toEqual([...PICTURE_IDS, ...VOICE_IDS].sort());
  }, 60000);

  it("lists the glow mask as missing and fails without --ai (plain render has no mask)", async () => {
    const s = setup();
    const result = await run(s, ["fx"]);
    expect(result.code).not.toBe(0);
    expect(result.out).toMatch(/made 3, failed 1, missing 1/);
    expect(result.out).toContain("missing glow.cover glow");
  }, 60000);
});

describe("A1-04a: --only leaves the other media alone, avatar is not offered", () => {
  it("--only voice changes only voice ids and --only picture only picture ids", async () => {
    const s = setup();
    const voice = await run(s, ["fx", "--only", "voice"]);
    expect(voice.code).toBe(0);
    expect(keysOf(s)).toEqual(VOICE_IDS);
    const voiceEntries = readIndex(workPathsFor(s.workFolder, "fx"));

    const picture = await run(s, ["fx", "--only", "picture", "--ai"]);
    expect(picture.code).toBe(0);
    expect(keysOf(s)).toEqual([...PICTURE_IDS, ...VOICE_IDS].sort());
    const after = readIndex(workPathsFor(s.workFolder, "fx"));
    for (const id of VOICE_IDS) expect(after[id]).toEqual(voiceEntries[id]);
  }, 60000);

  it("--only avatar exits 2 with a usage message and spawns nothing", async () => {
    const s = setup();
    let spawned = 0;
    const result = await run(s, ["fx", "--only", "avatar"], {
      spawn: async (...args) => {
        spawned++;
        return realSpawn(...args);
      },
    });
    expect(result.code).toBe(2);
    expect(result.err).toContain("avatar mode is not in asset-studio 0.2");
    expect(result.err).toContain("Usage: assets:render");
    expect(spawned).toBe(0);
    expect(readdirSync(s.workFolder)).toEqual([]);
  });
});

describe("A1-04b: no work folder", () => {
  it("stops with AS-CONFIG-1, changes nothing and never spawns the bin", async () => {
    const s = setup();
    await run(s, ["fx", "--ai"]);
    const before = snapshot(s.workFolder);
    let spawned = 0;
    const result = await run(s, ["fx", "--ai"], {
      withWorkFolder: false,
      spawn: async (...args) => {
        spawned++;
        return realSpawn(...args);
      },
    });
    expect(result.code).not.toBe(0);
    expect(result.err).toContain("AS-CONFIG-1");
    expect(spawned).toBe(0);
    expect(snapshot(s.workFolder)).toBe(before);
  }, 60000);
});

describe("A1-04b: partial failure", () => {
  it("prints the failed id with its AS- code, exits non-zero, and renders the others", async () => {
    const s = setup(TOO_LONG_SCRIPT);
    const result = await run(s, ["fx", "--ai"]);
    expect(result.code).not.toBe(0);
    expect(result.out).toContain("failed fixture.01.vo-02 AS-VOICE-5");
    expect(result.err).toContain("AS-VOICE-5: fixture.01.vo-02");
    expect(result.out).toMatch(/made 3, failed 1, missing 1/);
    expect(keysOf(s)).toEqual(["fixture.01.vo-01", ...PICTURE_IDS].sort());
  }, 60000);

  it("reads a code and a job key from the bin's stderr and ignores the summary lines", () => {
    const stderr =
      "AS-FAKE-1: fake providers in use\nAS-VOICE-5: fixture.01.vo-02: too long.\nAS-RENDER-2: 1 failed.\n";
    expect(failedAssets(stderr, ["fixture.01.vo-02", "fixture.01.vo-01"])).toEqual([
      { code: "AS-VOICE-5", id: "fixture.01.vo-02" },
    ]);
  });
});

describe("A1-04b: missing key", () => {
  it("fails with the voice and AI key codes, calls nothing, and needs no real key", async () => {
    const s = setup();
    const result = await run(s, ["fx", "--only", "voice"], { fakes: false });
    expect(result.code).not.toBe(0);
    expect(result.out).toContain("failed fixture.01.vo-01 AS-VOICE-1");
    expect(result.err).not.toContain("AS-FAKE-1");
    const ai = await run(s, ["fx", "--only", "picture", "--ai"], { fakes: false });
    expect(ai.code).not.toBe(0);
    expect(ai.err).toContain("AS-AI-1");
  }, 60000);
});

describe("A1-04b: retry note persistence", () => {
  it("keeps the note in notes[], makes a new draft and keeps the old draft file", async () => {
    const s = setup();
    await run(s, ["fx", "--ai"]);
    const paths = workPathsFor(s.workFolder, "fx");
    const oldFile = (readIndex(paths)["glow.cover"] as { file: string }).file;
    reject(
      loadJob(join(paths.root, "asset-job.json")),
      paths,
      "glow.cover",
      "Make the glow tighter.",
    );

    const again = await run(s, ["fx", "--ai"]);
    expect(again.code).toBe(0);
    const entry = readIndex(paths)["glow.cover"] as {
      file: string;
      status: string;
      notes: string[];
    };
    expect(entry.status).toBe("draft");
    expect(entry.notes).toEqual(["Make the glow tighter."]);
    expect(entry.file).not.toBe(oldFile);
    expect(existsSync(join(paths.store, oldFile))).toBe(true);
    expect(existsSync(join(paths.store, entry.file))).toBe(true);
  }, 60000);
});
