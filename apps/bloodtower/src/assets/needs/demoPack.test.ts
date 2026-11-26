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
    // C3-03 replaced the day slice's tagline and chapters, and added scenes, items and endings.
    // Everything else in the manifest is still pinned to the baseline.
    const {
      title: oldTitle,
      assets: oldAssets,
      tagline: oldTagline,
      chapters: _oldChapters,
      ...restBefore
    } = before;
    const {
      title: newTitle,
      assets: newAssets,
      tagline: newTagline,
      chapters: _newChapters,
      scenes: _scenes,
      items: _items,
      endings: _endings,
      ...restAfter
    } = after;
    expect(oldTitle).toBe("Proving Grounds");
    expect(newTitle).toBe("The Ruined Keep");
    expect(oldTagline).toBe("AREA-077 day slice — Enter and Leave only.");
    expect(newTagline).toBe("[COPY: The Ruined Keep tagline]");
    expect(restAfter).toEqual(restBefore);
    expect(after.pack_id).toBe("test");
    const rows = newAssets as unknown[];
    expect(rows.slice(0, (oldAssets as unknown[]).length)).toEqual(oldAssets);
    expect(rows.slice((oldAssets as unknown[]).length)).toEqual([
      {
        id: "painting.ch1-the-roads",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/painting.ch1-the-roads.webp",
      },
      {
        id: "painting.ch2-the-keep",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/painting.ch2-the-keep.webp",
      },
      {
        id: "painting.ch3-the-tower",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/painting.ch3-the-tower.webp",
      },
      {
        id: "painting.keep-sealed-door",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/painting.keep-sealed-door.webp",
      },
      {
        id: "painting.finale-win",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/painting.finale-win.webp",
      },
      {
        id: "painting.finale-loss",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/painting.finale-loss.webp",
      },
      {
        id: "foe.level-1",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/foe.level-1.webp",
      },
      {
        id: "foe.level-2",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/foe.level-2.webp",
      },
      {
        id: "foe.level-3",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/foe.level-3.webp",
      },
      {
        id: "foe.level-4",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/foe.level-4.webp",
      },
      {
        id: "foe.warden~phase-1",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/foe.warden~phase-1.webp",
      },
      {
        id: "foe.warden~phase-2",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/foe.warden~phase-2.webp",
      },
      {
        id: "foe.warden~phase-3",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/foe.warden~phase-3.webp",
      },
      {
        id: "foe.keep-garrison",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/foe.keep-garrison.webp",
      },
      {
        id: "painting.keep-crypt~left-corridor",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/painting.keep-crypt~left-corridor.webp",
      },
      {
        id: "painting.keep-crypt~left-wall",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/painting.keep-crypt~left-wall.webp",
      },
      {
        id: "painting.keep-crypt~ahead-corridor",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/painting.keep-crypt~ahead-corridor.webp",
      },
      {
        id: "painting.keep-crypt~ahead-wall",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/painting.keep-crypt~ahead-wall.webp",
      },
      {
        id: "painting.keep-crypt~right-corridor",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/painting.keep-crypt~right-corridor.webp",
      },
      {
        id: "painting.keep-crypt~right-wall",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/painting.keep-crypt~right-wall.webp",
      },
      {
        id: "painting.trap-pit",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/painting.trap-pit.webp",
      },
      {
        id: "painting.trap-falling-rocks",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/painting.trap-falling-rocks.webp",
      },
      {
        id: "painting.tower-basement-map",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/painting.tower-basement-map.webp",
      },
      {
        id: "painting.tower-main-map",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/painting.tower-main-map.webp",
      },
      {
        id: "painting.tower-top-map",
        type: "still",
        target: "storyboard",
        status: "draft",
        path: "assets/painting.tower-top-map.webp",
      },
      {
        id: LINE_ID,
        type: "line",
        target: "storyboard",
        status: "placeholder",
        speaker: "narrator",
        text: LINE_TEXT,
      },
      {
        id: "chapter-card.01~vo-01",
        type: "line",
        target: "storyboard",
        status: "placeholder",
        speaker: "narrator",
        text: "Hear the herald in Greyford. Then open the forest road.",
      },
      {
        id: "chapter-card.02~vo-01",
        type: "line",
        target: "storyboard",
        status: "placeholder",
        speaker: "narrator",
        text: "Go down into the barrow under the old keep. Find the shrine on the road beside it.",
      },
      {
        id: "chapter-card.03~vo-01",
        type: "line",
        target: "storyboard",
        status: "placeholder",
        speaker: "narrator",
        text: "Open the sealed gate on the Tower road. Break his guard on the Grass Sea. Then climb.",
      },
      {
        id: "chapter-win.01~vo-01",
        type: "line",
        target: "storyboard",
        status: "placeholder",
        speaker: "narrator",
        text: "The roads are open. On the far hill, a fire burns in the old keep, where no one has lived for forty years.",
      },
      {
        id: "chapter-win.03~vo-01",
        type: "line",
        target: "storyboard",
        status: "placeholder",
        speaker: "narrator",
        text: "The gate is open and the last stand held. The Warden's door is open, for now.",
      },
      {
        id: "seal-break.02~vo-01",
        type: "line",
        target: "storyboard",
        status: "placeholder",
        speaker: "narrator",
        text: "The Keep gives up its dead, and a second seal cracks. The Tower waits.",
      },
      {
        id: "seal-break.03~vo-01",
        type: "line",
        target: "storyboard",
        status: "placeholder",
        speaker: "narrator",
        text: "The last stand holds, and the third seal breaks. Only the Warden remains.",
      },
      {
        id: "finale-win.shattered~vo-01",
        type: "line",
        target: "storyboard",
        status: "placeholder",
        speaker: "narrator",
        text: "The shard shatters. The Tower's call goes quiet, and the roads are yours.",
      },
      {
        id: "finale-win.oath~vo-01",
        type: "line",
        target: "storyboard",
        status: "placeholder",
        speaker: "narrator",
        text: "You swear his oath and take up his watch. The Tower called to him once. It will call to you.",
      },
      {
        id: "finale-loss.skulls~vo-01",
        type: "line",
        target: "storyboard",
        status: "placeholder",
        speaker: "narrator",
        text: "The last skull falls. The Tower's shadow covers the land, and the roads are his for good.",
      },
      {
        id: "finale-loss.corruption~vo-01",
        type: "line",
        target: "storyboard",
        status: "placeholder",
        speaker: "narrator",
        text: "One of you hears the Tower call, and goes to it. Without them, the hunt is over.",
      },
      {
        id: "finale-loss.fallen-buildings~vo-01",
        type: "line",
        target: "storyboard",
        status: "placeholder",
        speaker: "narrator",
        text: "Four strongholds have fallen. There is nowhere left to hold, and his raiders own the land.",
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
      "chapter-card.01~vo-01",
      "chapter-card.02~vo-01",
      "chapter-card.03~vo-01",
      "chapter-win.01~vo-01",
      "chapter-win.03~vo-01",
      "finale-loss.corruption~vo-01",
      "finale-loss.fallen-buildings~vo-01",
      "finale-loss.skulls~vo-01",
      "finale-win.oath~vo-01",
      "finale-win.shattered~vo-01",
      "foe.keep-garrison",
      "foe.level-1",
      "foe.level-2",
      "foe.level-3",
      "foe.level-4",
      "foe.warden~phase-1",
      "foe.warden~phase-2",
      "foe.warden~phase-3",
      "glow.cover",
      "painting.ch1-the-roads",
      "painting.ch2-the-keep",
      "painting.ch3-the-tower",
      "painting.cover",
      "painting.finale-loss",
      "painting.finale-win",
      "painting.keep-crypt~ahead-corridor",
      "painting.keep-crypt~ahead-wall",
      "painting.keep-crypt~left-corridor",
      "painting.keep-crypt~left-wall",
      "painting.keep-crypt~right-corridor",
      "painting.keep-crypt~right-wall",
      "painting.keep-sealed-door",
      "painting.tower-basement-map",
      "painting.tower-main-map",
      "painting.tower-top-map",
      "painting.trap-falling-rocks",
      "painting.trap-pit",
      "place.bazaar",
      "place.citadel",
      "place.sanctuary",
      "place.village",
      LINE_ID,
      "seal-break.02~vo-01",
      "seal-break.03~vo-01",
    ]);
    expect(rows.find((r) => r.id === LINE_ID)?.kind).toBe("line");
    expect(rows.filter((r) => r.id.startsWith("glow.")).length).toBe(1);
    expect(job.lines).toEqual([
      { id: LINE_ID, speaker: "narrator", text: LINE_TEXT },
      {
        id: "chapter-card.01~vo-01",
        speaker: "narrator",
        text: "Hear the herald in Greyford. Then open the forest road.",
      },
      {
        id: "chapter-card.02~vo-01",
        speaker: "narrator",
        text: "Go down into the barrow under the old keep. Find the shrine on the road beside it.",
      },
      {
        id: "chapter-card.03~vo-01",
        speaker: "narrator",
        text: "Open the sealed gate on the Tower road. Break his guard on the Grass Sea. Then climb.",
      },
      {
        id: "chapter-win.01~vo-01",
        speaker: "narrator",
        text: "The roads are open. On the far hill, a fire burns in the old keep, where no one has lived for forty years.",
      },
      {
        id: "chapter-win.03~vo-01",
        speaker: "narrator",
        text: "The gate is open and the last stand held. The Warden's door is open, for now.",
      },
      {
        id: "seal-break.02~vo-01",
        speaker: "narrator",
        text: "The Keep gives up its dead, and a second seal cracks. The Tower waits.",
      },
      {
        id: "seal-break.03~vo-01",
        speaker: "narrator",
        text: "The last stand holds, and the third seal breaks. Only the Warden remains.",
      },
      {
        id: "finale-win.shattered~vo-01",
        speaker: "narrator",
        text: "The shard shatters. The Tower's call goes quiet, and the roads are yours.",
      },
      {
        id: "finale-win.oath~vo-01",
        speaker: "narrator",
        text: "You swear his oath and take up his watch. The Tower called to him once. It will call to you.",
      },
      {
        id: "finale-loss.skulls~vo-01",
        speaker: "narrator",
        text: "The last skull falls. The Tower's shadow covers the land, and the roads are his for good.",
      },
      {
        id: "finale-loss.corruption~vo-01",
        speaker: "narrator",
        text: "One of you hears the Tower call, and goes to it. Without them, the hunt is over.",
      },
      {
        id: "finale-loss.fallen-buildings~vo-01",
        speaker: "narrator",
        text: "Four strongholds have fallen. There is nowhere left to hold, and his raiders own the land.",
      },
    ]);
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
  // Renders every declared picture of packs/test at 3840x2160 with fake providers. With the
  // 31 draft pictures (2026-11-26) it took 157 s alone on the box, so the limit is 300 s (was 120 s).
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
  }, 300000);
});

describe("A1-8b-1 Done when 7: no packed files are committed under packs/test/assets", () => {
  it("has no index.json, m4a or hash-named file", async () => {
    const { readdirSync } = await import("node:fs");
    const names = readdirSync(join(REPO_PACKS, "test/assets"));
    expect(names.filter((n) => n === "index.json" || /\.m4a$|^[0-9a-f]{64}\./.test(n))).toEqual([]);
  });
});
