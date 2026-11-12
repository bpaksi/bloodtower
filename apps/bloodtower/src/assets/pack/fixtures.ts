import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync, readlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { approve, loadJob, readIndex, reject } from "@asset-studio/cli";
import { tempDir, writeStoryPack } from "../needs/fixtures.ts";
import { workPathsFor } from "../needs/job.ts";
import { runRender } from "../render/cli.ts";
import { gradientPng, RENDER_CAST } from "../render/fixtures.ts";
import { realSpawn, type SpawnFn } from "../render/spawn.ts";
import { runPack } from "./cli.ts";
import type { CommitIo } from "./commit.ts";

export const STORY = "fx";

/** Still art ids the fixture pack declares, besides `painting.cover` and `glow.cover`. */
export const PLACES = ["place.village", "place.bazaar", "place.citadel"] as const;

export interface Setup {
  packs: string;
  packDir: string;
  workFolder: string;
  configDir: string;
}

/** The child sees only these variables, so no developer key can reach it (AS-FAKE-1 is on). */
export const whitelistEnv = (s: Setup) => ({
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  ASSET_STUDIO_FAKE_PROVIDERS: "1",
  ASSET_STUDIO_CONFIG_DIR: s.configDir,
});

const TWO_LINES = `- id: "fixture.01"
  lines:
    - {id: "fixture.01.vo-01", speaker: narrator, text: "The roads are clear."}
    - {id: "fixture.01.vo-02", speaker: narrator, text: "A seal breaks. [pause 0.5] The door opens."}
`;

/**
 * A story pack in a fresh temp folder: a cover and three place stills (generated art). With
 * `voiced`, two voiced lines as well. Nothing is rendered yet.
 */
export const setup = (options: { voiced?: boolean } = {}): Setup => {
  const packs = tempDir("packs");
  const assets = PLACES.map(
    (id) =>
      `{id: ${id}, type: still, target: storyboard, status: draft, path: assets/${id.replace(".", "-")}.png}`,
  );
  const packDir = writeStoryPack(packs, STORY, {
    assets,
    files: {
      "cast.yaml": RENDER_CAST,
      ...(options.voiced ? { "script.yaml": TWO_LINES } : {}),
    },
  });
  writeFileSync(join(packDir, "assets/cover.png"), gradientPng());
  PLACES.forEach((id, n) => {
    writeFileSync(
      join(packDir, `assets/${id.replace(".", "-")}.png`),
      gradientPng(80 + 16 * n, 45 + 9 * n),
    );
  });
  return { packs, packDir, workFolder: tempDir("work"), configDir: tempDir("config") };
};

/** Runs `assets:render --ai` (fake providers) so the work folder holds a draft of every id. */
export const renderAll = async (s: Setup): Promise<void> => {
  let err = "";
  const code = await runRender(
    [STORY, "--ai", "--packs-dir", s.packs, "--work-folder", s.workFolder],
    {
      env: whitelistEnv(s),
      cwd: tempDir("cwd"),
      out: () => {},
      err: (t) => {
        err += t;
      },
    },
  );
  if (code !== 0) throw new Error(`fixture render failed (${code}): ${err}`);
};

export const paths = (s: Setup) => workPathsFor(s.workFolder, STORY);

export const jobFile = (s: Setup) => join(paths(s).root, "asset-job.json");

/** Test-only: the human approval the studio does. Product code never approves. */
export const approveIds = (s: Setup, ids: readonly string[]): void => {
  const job = loadJob(jobFile(s));
  for (const id of ids) approve(job, paths(s), id);
};

export const rejectId = (s: Setup, id: string): void => {
  reject(loadJob(jobFile(s)), paths(s), id, "Not this one.");
};

/** Test-only: drops an entry from the work folder's index, so the id is "missing". */
export const dropFromWorkIndex = (s: Setup, id: string): void => {
  const file = join(paths(s).root, "index.json");
  const index = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  delete index[id];
  writeFileSync(file, JSON.stringify(index, null, 2));
};

export const workEntry = (s: Setup, id: string) =>
  readIndex(paths(s))[id] as { file: string; kind: string; size: unknown; status: string };

/**
 * The fixture in the shape the Done when names: painting.cover and place.village final,
 * place.bazaar draft, place.citadel rejected, glow.cover missing.
 */
export const mixed = async (): Promise<Setup> => {
  const s = setup();
  await renderAll(s);
  approveIds(s, ["painting.cover", "place.village"]);
  rejectId(s, "place.citadel");
  dropFromWorkIndex(s, "glow.cover");
  return s;
};

export interface Result {
  code: number;
  out: string;
  err: string;
}

export const pack = async (
  s: Setup,
  argv: string[] = [],
  options: {
    spawn?: SpawnFn;
    withWorkFolder?: boolean;
    cwd?: string;
    commitIo?: CommitIo;
  } = {},
): Promise<Result> => {
  let out = "";
  let err = "";
  const code = await runPack(
    [
      STORY,
      ...argv,
      "--packs-dir",
      s.packs,
      ...(options.withWorkFolder === false ? [] : ["--work-folder", s.workFolder]),
    ],
    {
      env: whitelistEnv(s),
      cwd: options.cwd ?? tempDir("cwd"),
      out: (t) => {
        out += t;
      },
      err: (t) => {
        err += t;
      },
      ...(options.spawn === undefined ? {} : { spawn: options.spawn }),
      ...(options.commitIo === undefined ? {} : { commitIo: options.commitIo }),
    },
  );
  return { code, out, err };
};

/** Runs the real bin, then lets a test change what it exported (to stand in for a bad export). */
export const tamper =
  (change: (exportDir: string) => void): SpawnFn =>
  async (command, args, options) => {
    const result = await realSpawn(command, args, options);
    const at = args.indexOf("--out");
    change(args[at + 1] as string);
    return result;
  };

/** Every file and link under `dir` with its hash (or link target), sorted. */
export const snapshot = (dir: string): string =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .map((e) => {
      const file = join(e.parentPath, e.name);
      const stat = lstatSync(file);
      if (stat.isSymbolicLink()) return `${file} -> ${readlinkSync(file)}`;
      if (stat.isDirectory()) return `${file}/`;
      return `${file} ${createHash("sha256").update(readFileSync(file)).digest("hex")}`;
    })
    .sort()
    .join("\n");

export const hashedFiles = (packDir: string): string[] =>
  readdirSync(join(packDir, "assets"))
    .filter((name) => /^[0-9a-f]{64}\./.test(name))
    .sort();

export const readPackIndex = (packDir: string) =>
  JSON.parse(readFileSync(join(packDir, "assets/index.json"), "utf8")) as {
    assets: Record<
      string,
      { kind: string; file: string; size: unknown; captions: string[]; status: string }
    >;
  };
