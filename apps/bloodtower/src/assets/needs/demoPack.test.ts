import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { indexPackAssets } from "../../server/pack/assets.ts";
import { loadPackV2Dir } from "../../server/pack/v2/load.ts";
import { runPack } from "../pack/index.ts";
import { runRender } from "../render/cli.ts";
import { buildJob, LOREMASTER_DEFAULT } from "./build.ts";
import { tempDir, writeStoryPack } from "./fixtures.ts";
import { computeRows, workPathsFor } from "./job.ts";

const REPO_PACKS = resolve(import.meta.dirname, "../../../../../packs");
const LINE_ID = "seal-break.01~vo-01";
const LINE_TEXT =
  "The roads are clear, and a seal breaks like an old oath giving way. Ahead stands the Ruined Keep.";

const manifest = (file: string) => parseYaml(readFileSync(file, "utf8")) as Record<string, unknown>;

describe("A1-8b-1 Done when 1: packs/test is The Ruined Keep, id test", () => {
  it("differs from the baseline manifest only in the title and the appended rows", () => {
    const before = manifest(join(import.meta.dirname, "fixtures/test-pack.before.yaml"));
    const after = manifest(join(REPO_PACKS, "test/pack.yaml"));
    const { title: oldTitle, assets: oldAssets, ...restBefore } = before;
    const { title: newTitle, assets: newAssets, ...restAfter } = after;
    expect(oldTitle).toBe("Proving Grounds");
    expect(newTitle).toBe("The Ruined Keep");
    expect(restAfter).toEqual(restBefore);
    expect(after.pack_id).toBe("test");
    const rows = newAssets as unknown[];
    expect(rows.slice(0, (oldAssets as unknown[]).length)).toEqual(oldAssets);
    expect(rows.slice((oldAssets as unknown[]).length)).toEqual([
      {
        id: LINE_ID,
        type: "line",
        target: "storyboard",
        status: "placeholder",
        speaker: "narrator",
        text: LINE_TEXT,
      },
    ]);
  });

  it("loads with no assets/index.json and no line file: the line is unavailable, not a failure", () => {
    expect(existsSync(join(REPO_PACKS, "test/assets/index.json"))).toBe(false);
    const loaded = loadPackV2Dir(join(REPO_PACKS, "test"), REPO_PACKS);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok || loaded.kind !== "story") throw new Error("packs/test is a story pack");
    expect(loaded.pack.title).toBe("The Ruined Keep");
    const index = indexPackAssets(join(REPO_PACKS, "test"), loaded.pack);
    expect(index.indexed.has(LINE_ID)).toBe(false);
    expect(index.byId.has(LINE_ID)).toBe(false);
    expect(loaded.warnings.some((w) => w.message.includes(LINE_ID))).toBe(true);
  });
});

describe("A1-8b-1 Done when 2: assets:needs lists the demo ids", () => {
  it("lists the line (Loremaster), painting.cover, one glow.cover and the four places; no portrait", () => {
    const { job } = buildJob("test", { packsDir: REPO_PACKS });
    const rows = computeRows(job, workPathsFor(tempDir("wf"), "test"));
    expect(rows.map((r) => r.id)).toEqual([
      "glow.cover",
      "painting.cover",
      "place.bazaar",
      "place.citadel",
      "place.sanctuary",
      "place.village",
      LINE_ID,
    ]);
    expect(rows.find((r) => r.id === LINE_ID)?.kind).toBe("line");
    expect(rows.filter((r) => r.id.startsWith("glow.")).length).toBe(1);
    expect(job.lines).toEqual([{ id: LINE_ID, speaker: "narrator", text: LINE_TEXT }]);
    // The provisional Charon voice, and no moods: audio and caption only (D48, D8).
    expect(job.cast).toEqual([
      {
        id: "narrator",
        name: "Loremaster",
        voice: {
          provider: "gemini-tts",
          voiceId: LOREMASTER_DEFAULT.voice?.voiceId,
          style: expect.any(String),
        },
        moods: [],
      },
    ]);
    expect(job.cast[0]?.voice?.voiceId).toBe("Charon");
    expect(rows.some((r) => r.id.startsWith("portrait."))).toBe(false);
  });

  it("without a line row there is no narrator in the job; inline narration stays silent", () => {
    const packs = tempDir("packs");
    writeStoryPack(packs, "fx");
    const { job, silent } = buildJob("fx", { packsDir: packs });
    expect(job.cast).toEqual([]);
    expect(job.lines).toEqual([]);
    expect(silent.map((s) => s.reason)).toEqual(["legacy-inline"]);
  });
});

describe("A1-8b-1 Done when 3: fake providers, render, pack --drafts, loader", () => {
  it("exposes the line and the mask entries on a temp copy of packs/test", async () => {
    const packs = tempDir("packs");
    cpSync(join(REPO_PACKS, "test"), join(packs, "test"), { recursive: true });
    cpSync(join(REPO_PACKS, "base"), join(packs, "base"), { recursive: true });
    const workFolder = tempDir("work");
    const env = {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      ASSET_STUDIO_FAKE_PROVIDERS: "1",
      ASSET_STUDIO_CONFIG_DIR: tempDir("config"),
    };
    let err = "";
    const io = (): {
      env: typeof env;
      cwd: string;
      out: (t: string) => void;
      err: (t: string) => void;
    } => ({
      env,
      cwd: tempDir("cwd"),
      out: () => {},
      err: (t) => {
        err += t;
      },
    });
    const common = ["test", "--packs-dir", packs, "--work-folder", workFolder];
    expect(await runRender([...common, "--ai"], io()), err).toBe(0);
    expect(await runPack([...common, "--drafts"], io()), err).toBe(0);
    const loaded = loadPackV2Dir(join(packs, "test"), packs);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok || loaded.kind !== "story") throw new Error("the temp copy is a story pack");
    const { indexed } = indexPackAssets(join(packs, "test"), loaded.pack);
    const line = indexed.get(LINE_ID);
    expect(line?.kind).toBe("line");
    expect(line?.absolute.endsWith(".m4a")).toBe(true);
    expect(indexed.get("glow.cover")?.kind).toBe("glow");
    expect(indexed.has("painting.cover")).toBe(true);
    // The index caption is the exact locked text.
    const index = JSON.parse(readFileSync(join(packs, "test/assets/index.json"), "utf8")) as {
      assets: Record<string, { captions: string[] }>;
    };
    expect(index.assets[LINE_ID]?.captions).toEqual([LINE_TEXT]);
    writeFileSync(join(workFolder, ".keep"), "");
  }, 120000);
});

describe("A1-8b-1 Done when 7: no packed files are committed under packs/test/assets", () => {
  it("has no index.json, m4a or hash-named file", async () => {
    const { readdirSync } = await import("node:fs");
    const names = readdirSync(join(REPO_PACKS, "test/assets"));
    expect(names.filter((n) => n === "index.json" || /\.m4a$|^[0-9a-f]{64}\./.test(n))).toEqual([]);
  });
});
