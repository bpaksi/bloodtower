import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../config.ts";
import { lintPath } from "../scripts/packLint.ts";
import { loadPackDir, loadR1Pack, loadStories, type PackLoadIssue } from "./load.ts";

const testPack = () => join(loadConfig().packsDir, "test");

const copyPack = () => {
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-pack-"));
  cpSync(testPack(), dir, { recursive: true });
  return dir;
};

const rules = (issues: readonly PackLoadIssue[]) => issues.map((item) => item.rule);

describe("story loader", () => {
  it("loads the test pack, records its version, and keeps choices without running them", () => {
    const result = loadR1Pack(loadConfig().packsDir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.pack_id).toBe("test");
    expect(result.pack.version).toBe("0.1.0");
    expect(result.pack.hunters.map((hunter) => hunter.id)).toEqual([
      "alpha",
      "beta",
      "gamma",
      "delta",
    ]);
    expect(result.pack.nights).toHaveLength(1);
    expect(result.pack.set_pieces.map((piece) => piece.id)).toEqual([
      "proving-ground",
      "grey-stair",
    ]);
    const keeper = result.pack.moments.find((moment) => moment.id === "grey-stair.03");
    expect(keeper).toMatchObject({ kind: "clip", asset: "av.keeper", advance: "clip-end" });
    expect(keeper?.lines).toBeUndefined();
    expect(result.pack.cues[0]?.screen).toBe("fx.bell");
    expect(result.pack.cues[0]?.fallback_sfx).toBe("sfx.bell");
    expect(result.pack.cues[0]?.drums).toBe("none");
    expect(result.pack.moments.some((moment) => moment.id.endsWith("~no-delta"))).toBe(true);
    expect(result.pack.moments.some((moment) => moment.id.includes(".private."))).toBe(true);
    expect(result.pack.choices).toEqual([
      { id: "kept", label: "not run" },
      {
        id: "grey-stair.door-choice",
        options: [
          { id: "oil-the-hinge", label: "Oil the hinge" },
          { id: "force-it", label: "Force it" },
        ],
      },
    ]);
    expect(JSON.stringify(result.pack).toLowerCase()).not.toContain("dracula");
  });

  it("round-trips the test pack through one JSON file", () => {
    const loaded = loadR1Pack(loadConfig().packsDir);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const dir = mkdtempSync(join(tmpdir(), "bloodtower-json-"));
    try {
      writeFileSync(join(dir, "pack.json"), JSON.stringify(loaded.pack));
      const again = loadPackDir(dir);
      expect(again.ok).toBe(true);
      if (!again.ok || !again.playable) return;
      expect(again.pack.version).toBe(loaded.pack.version);
      expect(again.pack.moments.map((moment) => moment.id)).toEqual(
        loaded.pack.moments.map((moment) => moment.id),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("names the file, path and rule for each bad pack", () => {
    const cases: Array<{
      file: string;
      write: (text: string) => string;
      rule: string;
      path: string;
    }> = [
      {
        file: "pack.yaml",
        rule: "V-1",
        path: "title",
        write: (text) => text.replace("title: Proving ground\n", ""),
      },
      {
        file: "moments.yaml",
        rule: "V-2",
        path: "",
        write: (text) => text.replace("cue: bell", "cue: missing-bell"),
      },
      {
        file: "moments.yaml",
        rule: "V-3",
        path: "0.id",
        write: (text) => text.replace("id: proving-ground.01\n", "id: NOT A MOMENT\n"),
      },
      {
        file: "moments.yaml",
        rule: "V-4",
        path: "2",
        write: (text) => text.replace("target: ipad:alpha", "target: storyboard"),
      },
      {
        file: "moments.yaml",
        rule: "V-5",
        path: "",
        write: (text) => text.replace("~no-delta", "~no-ghost"),
      },
      {
        file: "cues.yaml",
        rule: "V-8",
        path: "0",
        write: (text) => text.replace("drums: none", "drums: top"),
      },
      {
        file: "nights.yaml",
        rule: "V-20",
        path: "",
        write: (text) => text.replace("night_end(n1)", "random end"),
      },
    ];

    for (const item of cases) {
      const dir = copyPack();
      try {
        const file = join(dir, item.file);
        writeFileSync(file, item.write(readFileSync(file, "utf8")));
        const result = loadPackDir(dir);
        expect(result.ok, item.rule).toBe(false);
        if (result.ok) continue;
        expect(rules(result.issues), item.rule).toContain(item.rule);
        const match = result.issues.find(
          (issue) => issue.rule === item.rule && issue.file === item.file,
        );
        expect(match, `${item.rule} ${JSON.stringify(result.issues)}`).toBeDefined();
        if (item.path) expect(match?.path, item.rule).toBe(item.path);
        else expect(match?.path, item.rule).toMatch(/^\d+$/);
        expect(match?.message, item.rule).toContain(item.rule);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it("names a YAML syntax error and an unknown file", () => {
    const broken = copyPack();
    try {
      writeFileSync(join(broken, "nights.yaml"), "nights: [\n");
      const result = loadPackDir(broken);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues[0]?.file).toBe("nights.yaml");
        expect(result.issues[0]?.rule).toBe("V-1");
        expect(result.issues[0]?.path).toBe("(file)");
      }
    } finally {
      rmSync(broken, { recursive: true, force: true });
    }

    const extra = copyPack();
    try {
      writeFileSync(join(extra, "notes.yaml"), "hello: true\n");
      const result = loadPackDir(extra);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(
          result.issues.some((item) => item.file === "notes.yaml" && item.rule === "V-1"),
        ).toBe(true);
      }
    } finally {
      rmSync(extra, { recursive: true, force: true });
    }
  });

  it("refuses a symlink that leaves the pack folder", () => {
    const dir = copyPack();
    const outside = mkdtempSync(join(tmpdir(), "bloodtower-outside-"));
    try {
      writeFileSync(join(outside, "secret.yaml"), "title: hidden\n");
      rmSync(join(dir, "hunters.yaml"));
      symlinkSync(join(outside, "secret.yaml"), join(dir, "hunters.yaml"));
      const result = loadPackDir(dir);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues.some((item) => item.file === "hunters.yaml")).toBe(true);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("loads a pack folder that is itself a symlink", () => {
    const parent = mkdtempSync(join(tmpdir(), "bloodtower-link-"));
    try {
      const link = join(parent, "pack");
      symlinkSync(testPack(), link);
      expect(loadPackDir(link).ok).toBe(true);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it("allows assets/ with images, rejects other subfolders and non-images in assets/", () => {
    const dir = copyPack();
    try {
      writeFileSync(join(dir, "assets", "fx-hall.png"), "png");
      expect(loadPackDir(dir).ok).toBe(true);

      writeFileSync(join(dir, "assets", "notes.txt"), "nope");
      const badText = loadPackDir(dir);
      expect(badText.ok).toBe(false);
      if (!badText.ok) {
        expect(
          badText.issues.some(
            (item) => item.file === "assets/notes.txt" && item.message.includes("image"),
          ),
        ).toBe(true);
      }

      rmSync(join(dir, "assets", "notes.txt"));
      mkdirSync(join(dir, "assets", "nested"));
      const nested = loadPackDir(dir);
      expect(nested.ok).toBe(false);
      if (!nested.ok) {
        expect(
          nested.issues.some(
            (item) => item.file === "assets/nested" && item.message.includes("subfolder"),
          ),
        ).toBe(true);
      }

      rmSync(join(dir, "assets", "nested"), { recursive: true });
      mkdirSync(join(dir, "extra"));
      const extra = loadPackDir(dir);
      expect(extra.ok).toBe(false);
      if (!extra.ok) {
        expect(extra.issues.some((item) => item.file === "extra")).toBe(true);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("warns only for still and portrait assets without image files", () => {
    const dir = copyPack();
    try {
      const assetsDir = join(dir, "assets");
      rmSync(assetsDir, { recursive: true, force: true });
      const result = loadPackDir(dir);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.assets.warnings.every((item) => item.rule === "W-asset")).toBe(true);
      expect(result.assets.warnings.some((item) => item.path === "vo.alpha")).toBe(false);
      expect(result.assets.warnings.some((item) => item.path === "fx.hall")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not warn for a placeholder still with no file, and indexes it once the file lands", () => {
    const dir = copyPack();
    try {
      const result = loadPackDir(dir);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.assets.warnings).toEqual([]);
      expect(result.assets.byId.has("ill.setup-board")).toBe(false);
      writeFileSync(join(dir, "assets", "ill-setup-board.png"), "png");
      const landed = loadPackDir(dir);
      expect(landed.ok).toBe(true);
      if (!landed.ok) return;
      expect(landed.assets.byId.get("ill.setup-board")?.basename).toBe("ill-setup-board.png");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("warns when a declared asset has no image file", () => {
    const dir = copyPack();
    try {
      const assetsDir = join(dir, "assets");
      rmSync(assetsDir, { recursive: true, force: true });
      const result = loadPackDir(dir);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.assets.byId.has("fx.hall")).toBe(false);
      expect(result.assets.warnings.some((item) => item.rule === "W-asset")).toBe(true);
      mkdirSync(assetsDir);
      writeFileSync(join(dir, "assets", "fx-hall.png"), "png");
      const again = loadPackDir(dir);
      expect(again.ok).toBe(true);
      if (!again.ok) return;
      expect(again.assets.byId.get("fx.hall")?.basename).toBe("fx-hall.png");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not load a pack that is not the test pack through loadR1Pack", () => {
    const dir = mkdtempSync(join(tmpdir(), "bloodtower-packs-"));
    try {
      mkdirSync(join(dir, "other"));
      writeFileSync(join(dir, "other", "pack.yaml"), "pack_id: other\n");
      const result = loadR1Pack(dir);
      expect(result.ok).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("story list", () => {
  const storiesDir = () => {
    const dir = mkdtempSync(join(tmpdir(), "bloodtower-stories-"));
    cpSync(testPack(), join(dir, "test"), { recursive: true });
    return dir;
  };

  it("lists both packs in order: the metadata-only dracula card, then the playable test pack", () => {
    const [dracula, test, ...rest] = loadStories(loadConfig().packsDir);
    expect(rest).toEqual([]);
    // Listed and choosable, but metadata only: it can never be bound (playable: false).
    expect(dracula?.card).toEqual({
      id: "dracula",
      title: "The Count of Vellmoor",
      blurb: "The Count has taken Lenka. Bring her home before she's his.",
      tagline: "The Count has taken Lenka. Bring her home before she's his.",
      cover: "/packs/dracula/assets/cover.png",
      players: null,
      playable: false,
      loadable: true,
      tower: "optional",
    });
    expect(dracula?.pack).toBeNull();
    expect(test?.card).toEqual({
      id: "test",
      title: "Proving ground",
      blurb: "A long-lived proving ground for new ideas.",
      tagline: "A long-lived proving ground for new ideas.",
      cover: "/packs/test/assets/cover.png",
      players: { min: 1, max: 4 },
      playable: true,
      loadable: true,
      tower: "optional",
    });
    expect(test?.pack?.pack_id).toBe("test");
    // Game settings come from each manifest, including the pack that is never bound.
    expect(dracula?.settings.map((setting) => setting.id)).toEqual(["length"]);
    expect(test?.settings.map((setting) => [setting.id, setting.default])).toEqual([
      ["length", "standard"],
      ["difficulty", "standard"],
    ]);
  });

  it("keeps a pack that fails the lint as a greyed card with no lint text on it", () => {
    const dir = storiesDir();
    try {
      cpSync(testPack(), join(dir, "broken"), { recursive: true });
      writeFileSync(join(dir, "broken", "pack.yaml"), "pack_id: broken\n");
      const entries = loadStories(dir);
      expect(entries.map((entry) => entry.card.id)).toEqual(["broken", "test"]);
      const broken = entries[0];
      expect(broken?.card).toEqual({
        id: "broken",
        title: "broken",
        blurb: null,
        tagline: null,
        cover: null,
        players: null,
        playable: false,
        loadable: false,
        tower: null,
      });
      expect(broken?.pack).toBeNull();
      expect(broken?.issues.length).toBeGreaterThan(0);
      expect(entries[1]?.card.loadable).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("skips files, hidden folders and folder names that are not ids", () => {
    const dir = storiesDir();
    try {
      writeFileSync(join(dir, "notes.txt"), "not a story");
      mkdirSync(join(dir, ".hidden"));
      mkdirSync(join(dir, "Not A Story"));
      // Work in progress: files, but no manifest yet.
      mkdirSync(join(dir, "draft"));
      writeFileSync(join(dir, "draft", "script.yaml"), "lines: []\n");
      expect(loadStories(dir).map((entry) => entry.card.id)).toEqual(["test"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  const storyOfLength = (length: number) => {
    const dir = storiesDir();
    const id = `a${"b".repeat(length - 1)}`;
    cpSync(testPack(), join(dir, id), { recursive: true });
    return { dir, entry: loadStories(dir).find((item) => item.card.id === id) };
  };

  it("loads a 44-character story id, the longest whose Choose prompt id fits 64", () => {
    const { dir, entry } = storyOfLength(44);
    try {
      expect(entry?.card.loadable).toBe(true);
      expect(`continue-pick-story-${entry?.card.id}`.length).toBe(64);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("shows a 45-character story id as a greyed card that cannot be chosen (#64)", () => {
    const { dir, entry } = storyOfLength(45);
    try {
      expect(entry?.card.loadable).toBe(false);
      expect(entry?.pack).toBeNull();
      expect(entry?.issues.length).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("is empty when the packs folder is missing", () => {
    expect(loadStories(join(tmpdir(), "bloodtower-no-such-packs-folder"))).toEqual([]);
  });
});

describe("pack:lint", () => {
  it("passes the test pack and rejects a bad folder with file, path and rule", () => {
    const ok = lintPath(undefined, process.cwd());
    expect(ok.exitCode).toBe(0);
    expect(ok.lines).toEqual(["OK test 0.1.0"]);

    const dir = copyPack();
    try {
      writeFileSync(join(dir, "cues.yaml"), "[]\n");
      const bad = lintPath(dir, process.cwd());
      expect(bad.exitCode).toBe(1);
      expect(
        bad.lines.some((line) => line.includes("file=cues.yaml") && line.includes("rule=V-")),
      ).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("manifest fields on the repo packs", () => {
  const packsDir = () => loadConfig().packsDir;

  it("loads the test pack with its cover, tower and settings", () => {
    const result = loadR1Pack(packsDir());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.tower).toBe("optional");
    expect(result.pack.lengths).toEqual(["short", "standard", "long"]);
    expect(result.pack.settings.map((setting) => setting.id)).toEqual(["length", "difficulty"]);
    expect(result.assets.byBasename.get("cover.png")).toMatch(/packs\/test\/assets\/cover\.png$/);
    expect(result.assets.warnings.some((item) => item.path === "cover")).toBe(false);
  });

  it("loads dracula as a metadata-only pack and resolves its cover", () => {
    const result = loadPackDir(join(packsDir(), "dracula"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.playable).toBe(false);
    expect(result.pack).toEqual({
      pack_id: "dracula",
      title: "The Count of Vellmoor",
      version: "0.1.0",
      engine_min: "0.1.0",
      tagline: "The Count has taken Lenka. Bring her home before she's his.",
      cover: "assets/cover.png",
      tower: "optional",
      settings: [
        {
          id: "length",
          label: "Length",
          options: [
            { id: "short", label: "Short" },
            { id: "standard", label: "Standard" },
            { id: "long", label: "Long" },
          ],
          default: "standard",
        },
      ],
      playable: false,
    });
    expect(result.assets.byBasename.get("cover.png")).toMatch(/dracula\/assets\/cover\.png$/);
  });

  it("lets a metadata-only pack ignore every other file in its folder", () => {
    const dir = mkdtempSync(join(tmpdir(), "bloodtower-dracula-"));
    try {
      cpSync(join(packsDir(), "dracula"), dir, { recursive: true });
      writeFileSync(join(dir, "notes.txt"), "not a pack file");
      writeFileSync(join(dir, "hunters.yaml"), "not: [valid\n");
      writeFileSync(join(dir, "random.bin"), "\u0000\u0001");
      const result = loadPackDir(dir);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.playable).toBe(false);
      expect(result.assets.warnings).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects a metadata-only pack that carries story fields", () => {
    const dir = copyPack();
    try {
      writeFileSync(
        join(dir, "pack.yaml"),
        "pack_id: test\ntitle: T\nversion: 0.1.0\nengine_min: 0.1.0\nplayable: false\nhunters: []\n",
      );
      const result = loadPackDir(dir);
      expect(result.ok).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects a cover path that is not a file directly inside assets/", () => {
    const dir = copyPack();
    try {
      const manifest = readFileSync(join(dir, "pack.yaml"), "utf8");
      writeFileSync(
        join(dir, "pack.yaml"),
        manifest.replace("cover: assets/cover.png", "cover: cover.png"),
      );
      const result = loadPackDir(dir);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(
        result.issues.some(
          (item) => item.file === "pack.yaml" && item.path === "cover" && item.rule === "V-1",
        ),
      ).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("warns, and does not block, when the cover file is missing", () => {
    const dir = copyPack();
    try {
      rmSync(join(dir, "assets", "cover.png"));
      const result = loadPackDir(dir);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.assets.byBasename.has("cover.png")).toBe(false);
      expect(
        result.assets.warnings.some((item) => item.rule === "W-asset" && item.path === "cover"),
      ).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
