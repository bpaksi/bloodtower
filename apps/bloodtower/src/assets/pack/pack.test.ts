import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildJob } from "../needs/build.ts";
import { tempDir } from "../needs/fixtures.ts";
import { realSpawn } from "../render/spawn.ts";
import { type CommitIo, realCommitIo } from "./commit.ts";
import {
  approveIds,
  hashedFiles,
  jobFile,
  mixed,
  pack,
  paths,
  readPackIndex,
  renderAll,
  renderForReal,
  type Setup,
  STORY,
  setup,
  snapshot,
  tamper,
  workEntry,
} from "./fixtures.ts";

const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

describe("A1-05a: export, lint, then copy finals only", () => {
  it("packs exactly the 2 finals and the index; --drafts adds the draft", async () => {
    const s = await mixed();
    const finals = ["painting.cover", "place.village"];
    const result = await pack(s);
    expect(result.err).not.toContain("AS-EXPORT");
    expect(result.code).toBe(0);
    expect(result.out).toContain("packed 2 (final 2, draft 0)");
    const wanted = finals.map((id) => workEntry(s, id).file).sort();
    expect(hashedFiles(s.packDir)).toEqual(wanted);
    // Source art (the pack's own files), the index and nothing else: no draft, no rejected file, no WAV, no master.
    expect(readdirSync(join(s.packDir, "assets")).sort()).toEqual(
      [
        ...wanted,
        "a.jpg",
        "door.m4a",
        "cover.png",
        "index.json",
        "place-bazaar.png",
        "place-citadel.png",
        "place-village.png",
      ].sort(),
    );
    expect(Object.keys(readPackIndex(s.packDir).assets)).toEqual(finals);
    for (const id of ["place.bazaar", "place.citadel"]) {
      expect(existsSync(join(s.packDir, "assets", workEntry(s, id).file))).toBe(false);
    }
    // Partial pack: glow.cover and the draft and rejected places are referenced and absent, so the lint warns with a count.
    expect(result.err).toContain("rule=A1-19");
    expect(result.err).toMatch(
      /\b3 referenced ids have no index entry yet \(glow\.cover, place\.bazaar, place\.citadel\)/,
    );

    const withDrafts = await pack(s, ["--drafts"]);
    expect(withDrafts.code).toBe(0);
    expect(withDrafts.out).toContain("packed 3 (final 2, draft 1)");
    expect(Object.keys(readPackIndex(s.packDir).assets)).toEqual([
      "painting.cover",
      "place.bazaar",
      "place.village",
    ]);
    expect(hashedFiles(s.packDir)).toEqual([...wanted, workEntry(s, "place.bazaar").file].sort());
  }, 90000);
});

describe("A1-05a/b: each index field comes from the export", () => {
  it("maps key, kind, file, size, captions and status; the pack source hash does not move", async () => {
    const s = setup({ voiced: true });
    await renderAll(s);
    const ids = ["painting.cover", "glow.cover", "fixture.01.vo-01", "fixture.01.vo-02"];
    approveIds(s, ids);
    const before = buildJob(STORY, { packsDir: s.packs }).job.source;
    const result = await pack(s);
    expect(result.code, result.err).toBe(0);
    const index = readPackIndex(s.packDir);
    expect(Object.keys(index.assets)).toEqual([...ids].sort());
    for (const id of ids) {
      const w = workEntry(s, id);
      const p = index.assets[id];
      expect(p?.kind).toBe(w.kind);
      expect(p?.file).toBe(w.file);
      expect(p?.size).toEqual(w.size);
      expect(p?.status).toBe("final");
    }
    // Captions: the raw text of a voiced line (pause markup kept), none for pictures.
    expect(index.assets["fixture.01.vo-01"]?.captions).toEqual(["The roads are clear."]);
    expect(index.assets["fixture.01.vo-02"]?.captions).toEqual([
      "A seal breaks. [pause 0.5] The door opens.",
    ]);
    expect(index.assets["painting.cover"]?.captions).toEqual([]);
    expect(index.assets["glow.cover"]?.captions).toEqual([]);
    // Key-sorted, two-space indent, trailing newline.
    const text = readFileSync(join(s.packDir, "assets/index.json"), "utf8");
    expect(text).toBe(`${JSON.stringify({ assets: index.assets }, null, 2)}\n`);
    expect(buildJob(STORY, { packsDir: s.packs }).job.source).toBe(before);
  }, 90000);
});

describe("A1-05a/D10: a bad export stops before the pack is touched", () => {
  const stops = async (
    change: (exportDir: string, s: Awaited<ReturnType<typeof mixed>>) => void,
    code: string,
  ) => {
    const s = await mixed();
    const before = snapshot(s.packs);
    const result = await pack(s, [], { spawn: tamper((dir) => change(dir, s)) });
    expect(result.code).toBe(1);
    expect(result.err).toContain(`rule=${code}`);
    expect(snapshot(s.packs)).toBe(before);
    return result;
  };
  const indexPath = (dir: string) => join(dir, "export-index.json");
  const editIndex = (
    dir: string,
    edit: (assets: Record<string, Record<string, unknown>>) => void,
  ) => {
    const doc = JSON.parse(readFileSync(indexPath(dir), "utf8"));
    edit(doc.assets);
    writeFileSync(indexPath(dir), JSON.stringify(doc));
  };

  it("A1-22: a file whose bytes do not match its name", async () => {
    const result = await stops((dir, s) => {
      writeFileSync(join(dir, workEntry(s, "painting.cover").file), "not the picture");
    }, "A1-22");
    expect(result.err).toContain("painting.cover");
    expect(result.err).toContain("does not match its name");
  }, 90000);

  it("A1-22: a traversal name", async () => {
    const result = await stops((dir) => {
      editIndex(dir, (a) => {
        (a["painting.cover"] as Record<string, unknown>).file = `../${"a".repeat(64)}.webp`;
      });
    }, "A1-22");
    expect(result.err).toContain("not a safe file name");
  }, 90000);

  it("A1-22: a file that is a link", async () => {
    const result = await stops((dir, s) => {
      const target = join(tempDir("outside"), "real.webp");
      const file = join(dir, workEntry(s, "painting.cover").file);
      writeFileSync(target, readFileSync(file));
      rmSync(file);
      symlinkSync(target, file);
    }, "A1-22");
    expect(result.err).toContain("not a regular file");
  }, 90000);

  it("A1-22: an export for another story", async () => {
    await stops((dir) => {
      const doc = JSON.parse(readFileSync(indexPath(dir), "utf8"));
      doc.story = "other";
      writeFileSync(indexPath(dir), JSON.stringify(doc));
    }, "A1-22");
  }, 90000);

  it("A1-21: a WAV, naming the id, the file and the fix", async () => {
    const wav = Buffer.from("RIFFfakeWAVEdata");
    const name = `${sha(wav)}.wav`;
    const result = await stops((dir) => {
      writeFileSync(join(dir, name), wav);
      editIndex(dir, (a) => {
        (a["painting.cover"] as Record<string, unknown>).file = name;
      });
    }, "A1-21");
    expect(result.err).toContain("painting.cover");
    expect(result.err).toContain(name);
    expect(result.err).toContain(".m4a source");
  }, 90000);

  it("lint failure (here a kind the lint refuses) stops with its rule", async () => {
    const result = await stops((dir) => {
      editIndex(dir, (a) => {
        (a["place.village"] as Record<string, unknown>).kind = "bogus";
      });
    }, "A1-15");
    expect(result.err).toContain("place.village");
  }, 90000);

  it("A1-24: the export bin failing passes its AS-EXPORT code through", async () => {
    const s = await mixed();
    const before = snapshot(s.packs);
    const result = await pack(s, [], {
      spawn: async () => ({
        code: 1,
        stdout: "",
        stderr: "AS-EXPORT-3: The out folder is not empty.\n",
      }),
    });
    expect(result.code).toBe(1);
    expect(result.err).toContain("rule=A1-24");
    expect(result.err).toContain("AS-EXPORT-3");
    expect(snapshot(s.packs)).toBe(before);
  }, 90000);

  it("A1-23: no job in the work folder says to run assets:render first", async () => {
    const s = setup();
    const before = snapshot(s.packs);
    let spawned = 0;
    const result = await pack(s, [], {
      spawn: async (...args) => {
        spawned++;
        return realSpawn(...args);
      },
    });
    expect(result.code).toBe(1);
    expect(result.err).toContain("rule=A1-23");
    expect(result.err).toContain("assets:render fx");
    expect(spawned).toBe(0);
    expect(snapshot(s.packs)).toBe(before);
    expect(readdirSync(s.workFolder)).toEqual([]);
  });

  it("no work folder: AS-CONFIG-1, nothing read, written or spawned", async () => {
    const s = await mixed();
    const cwd = tempDir("cwd");
    const before = [snapshot(s.packs), snapshot(s.workFolder), snapshot(cwd)];
    let spawned = 0;
    const result = await pack(s, [], {
      cwd,
      withWorkFolder: false,
      spawn: async (...args) => {
        spawned++;
        return realSpawn(...args);
      },
    });
    expect(result.code).not.toBe(0);
    expect(result.err).toContain("AS-CONFIG-1");
    expect(spawned).toBe(0);
    expect([snapshot(s.packs), snapshot(s.workFolder), snapshot(cwd)]).toEqual(before);
  }, 90000);
});

describe("A1-05b: a stale source warns and packs", () => {
  it("names the story and still packs", async () => {
    const s = await mixed();
    const cast = join(s.packDir, "cast.yaml");
    writeFileSync(cast, `${readFileSync(cast, "utf8")}# edited after the render\n`);
    const result = await pack(s);
    expect(result.code, result.err).toBe(0);
    expect(result.err).toMatch(
      /warning: the export for fx was rendered from a different pack source/,
    );
    expect(result.out).toContain("packed 2");
    expect(Object.keys(readPackIndex(s.packDir).assets)).toHaveLength(2);
  }, 90000);

  it("does not warn when the source matches", async () => {
    const s = await mixed();
    const result = await pack(s);
    expect(result.err).not.toContain("different pack source");
  }, 90000);
});

describe("A1-05b: the next pack removes only what the old index named", () => {
  it("deletes the files the new index drops, prints each, and keeps everything else", async () => {
    const s = await mixed();
    expect((await pack(s, ["--drafts"])).code).toBe(0);
    const bazaar = workEntry(s, "place.bazaar").file;
    const assets = join(s.packDir, "assets");
    expect(existsSync(join(assets, bazaar))).toBe(true);
    const sentinel = join(assets, "sentinel.keep");
    writeFileSync(sentinel, "keep me");
    const cover = readFileSync(join(assets, "cover.png"));
    // An unindexed hash-named file is not the tool's to delete.
    const stray = join(assets, `${"b".repeat(64)}.webp`);
    writeFileSync(stray, "stray");

    const result = await pack(s);
    expect(result.code, result.err).toBe(0);
    expect(result.out).toContain(`removed ${bazaar} (was place.bazaar)`);
    expect(result.out.match(/^removed /gm)).toHaveLength(1);
    expect(existsSync(join(assets, bazaar))).toBe(false);
    expect(readFileSync(sentinel, "utf8")).toBe("keep me");
    expect(readFileSync(join(assets, "cover.png"))).toEqual(cover);
    expect(existsSync(stray)).toBe(true);
    expect(Object.keys(readPackIndex(s.packDir).assets)).toEqual([
      "painting.cover",
      "place.village",
    ]);
  }, 90000);

  it("an unparseable old index deletes nothing and warns", async () => {
    const s = await mixed();
    expect((await pack(s, ["--drafts"])).code).toBe(0);
    const bazaar = workEntry(s, "place.bazaar").file;
    writeFileSync(join(s.packDir, "assets/index.json"), "{not json");
    const result = await pack(s);
    expect(result.code, result.err).toBe(0);
    expect(result.err).toContain("could not be parsed");
    expect(result.out).not.toContain("removed ");
    expect(existsSync(join(s.packDir, "assets", bazaar))).toBe(true);
    expect(Object.keys(readPackIndex(s.packDir).assets)).toHaveLength(2);
  }, 90000);

  it("a missing old index deletes nothing", async () => {
    const s = await mixed();
    const stray = join(s.packDir, "assets", `${"c".repeat(64)}.webp`);
    writeFileSync(stray, "stray");
    const result = await pack(s);
    expect(result.code, result.err).toBe(0);
    expect(existsSync(stray)).toBe(true);
    expect(result.out).not.toContain("removed ");
  }, 90000);
});

describe("A1-05b/D3: a failed write leaves the old pack as it was", () => {
  const failing = (over: Partial<CommitIo>): CommitIo => ({ ...realCommitIo, ...over });

  it("a failed copy removes what this run created", async () => {
    const s = await mixed();
    expect((await pack(s)).code).toBe(0);
    // Two more finals, so the second copy can fail after the first has landed.
    approveIds(s, ["place.bazaar", "place.citadel"]);
    const before = snapshot(s.packDir);
    let copies = 0;
    const result = await pack(s, [], {
      commitIo: failing({
        copyFile: (from, to) => {
          if (++copies === 1) return realCommitIo.copyFile(from, to);
          throw new Error("disk full");
        },
      }),
    });
    expect(result.code).toBe(1);
    expect(result.err).toContain("disk full");
    expect(snapshot(s.packDir)).toBe(before);
  }, 90000);

  it("a failed index rename removes the new files and keeps the old index", async () => {
    const s = await mixed();
    expect((await pack(s)).code).toBe(0);
    const before = snapshot(s.packDir);
    const result = await pack(s, ["--drafts"], {
      commitIo: failing({
        rename: (from, to) => {
          if (to.endsWith("index.json")) throw new Error("rename refused");
          return realCommitIo.rename(from, to);
        },
      }),
    });
    expect(result.code).toBe(1);
    expect(result.err).toContain("rename refused");
    expect(snapshot(s.packDir)).toBe(before);
  }, 90000);

  it("a first pack that fails leaves no assets folder it made", async () => {
    const s = await mixed();
    rmSync(join(s.packDir, "assets"), { recursive: true });
    writeFileSync(join(s.packDir, "assets.keep"), "");
    const result = await pack(s, [], {
      commitIo: failing({
        rename: (from, to) => {
          if (to.endsWith("index.json")) throw new Error("rename refused");
          return realCommitIo.rename(from, to);
        },
      }),
    });
    expect(result.code).toBe(1);
    expect(existsSync(join(s.packDir, "assets"))).toBe(false);
  }, 90000);
});

describe("an interrupted run, a second run and a linked story folder", () => {
  it("removes exact leftover temp files at the start and prints each", async () => {
    const s = await mixed();
    const assets = join(s.packDir, "assets");
    const a = `${"a".repeat(64)}.webp.tmp-123`;
    const b = "index.json.tmp-9";
    const keep = [`${"a".repeat(64)}.png.tmp-1`, "notes.tmp-5", `${"b".repeat(64)}.webp`];
    for (const name of [a, b, ...keep]) writeFileSync(join(assets, name), "x");
    const result = await pack(s);
    expect(result.code, result.err).toBe(0);
    expect(result.out).toContain(`removed leftover ${a}`);
    expect(result.out).toContain(`removed leftover ${b}`);
    expect(existsSync(join(assets, a))).toBe(false);
    expect(existsSync(join(assets, b))).toBe(false);
    for (const name of keep) expect(existsSync(join(assets, name))).toBe(true);
  }, 90000);

  it("a second run while the story lock is held stops with A1-25 naming the lock", async () => {
    const s = await mixed();
    const lock = join(paths(s).root, ".pack-lock");
    mkdirSync(lock);
    const before = snapshot(s.packs);
    const result = await pack(s);
    expect(result.code).toBe(1);
    expect(result.err).toContain("rule=A1-25");
    expect(result.err).toContain(lock);
    expect(snapshot(s.packs)).toBe(before);
    rmSync(lock, { recursive: true });
    expect((await pack(s)).code).toBe(0);
    expect(existsSync(lock)).toBe(false);
  }, 90000);

  it("two concurrent runs: one packs, the other is refused by the lock, the lock is released", async () => {
    const s = await mixed();
    const [one, two] = await Promise.all([pack(s), pack(s)]);
    expect([one.code, two.code].sort()).toEqual([0, 1]);
    const refused = one.code === 1 ? one : two;
    expect(refused.err).toContain("rule=A1-25");
    expect(existsSync(join(paths(s).root, ".pack-lock"))).toBe(false);
    expect(Object.keys(readPackIndex(s.packDir).assets)).toHaveLength(2);
  }, 90000);

  it("a story folder that is a link out of the packs folder stops with A1-22", async () => {
    const s = await mixed();
    const outside = join(tempDir("outside"), STORY);
    renameSync(s.packDir, outside);
    symlinkSync(outside, s.packDir);
    const before = snapshot(outside);
    const result = await pack(s);
    expect(result.code).toBe(1);
    expect(result.err).toContain("rule=A1-22");
    expect(result.err).toContain("outside the packs folder");
    expect(snapshot(outside)).toBe(before);
  }, 90000);
});

describe("the render fixture: a copied work folder is what a real render leaves", () => {
  // The work folder without its location: each file's hash, and the job with its folders blanked.
  const shape = (s: Setup) => ({
    job: readFileSync(jobFile(s), "utf8")
      .replaceAll(s.packs, "<packs>")
      .replaceAll(s.workFolder, "<work>"),
    files: snapshot(s.workFolder)
      .replaceAll(s.workFolder, "<work>")
      .split("\n")
      .filter((line) => !line.includes("asset-job.json")),
  });

  // The voiced pack holds pictures and voice lines, so it covers every kind the fixture renders.
  it("every file and the job match a real render, byte for byte", async () => {
    // The first render of this pack content is real and is kept; any later one is the copy.
    await renderAll(setup({ voiced: true }));
    const copied = setup({ voiced: true });
    await renderAll(copied);
    const real = setup({ voiced: true });
    await renderForReal(real);

    const want = shape(real);
    const got = shape(copied);
    expect(want.files.length).toBeGreaterThan(10);
    expect(got.files).toEqual(want.files);
    expect(got.job).toBe(want.job);
    // The job names this pack's own folder, not the folder of the pack that was rendered first.
    const job = readFileSync(jobFile(copied), "utf8");
    expect(job).toContain(copied.packs);
    expect(job).not.toContain(real.packs);
  }, 90000);
});
