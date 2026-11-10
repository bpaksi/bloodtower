import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildJob,
  buildJobFromDir,
  type Job,
  jobSchema,
  NeedsError,
  runNeeds,
  serializeJob,
  workPathsFor,
  writeJob,
} from "../index.ts";
import { CAST, SCRIPT, tempDir, writeStoryPack } from "./fixtures.ts";
import { computeRows } from "./job.ts";

const CUE = {
  start: 0,
  end: 4,
  from: { x: 0.5, y: 0.5, w: 1, h: 1 },
  to: { x: 0.5, y: 0.5, w: 0.8, h: 0.8 },
};
const REPO_PACKS = resolve(import.meta.dirname, "../../../../../packs");

const run = (
  argv: string[],
  env: Record<string, string | undefined> = {},
  dirs: { cwd?: string; configDir?: string } = {},
) => {
  let out = "";
  let err = "";
  const configDir = dirs.configDir ?? tempDir("config");
  const code = runNeeds(argv, {
    env: { ASSET_STUDIO_CONFIG_DIR: configDir, ...env },
    cwd: dirs.cwd ?? tempDir("cwd"),
    out: (t) => {
      out += t;
    },
    err: (t) => {
      err += t;
    },
  });
  return { code, out, err };
};

/** Every file under a folder with a hash of its bytes, so a changed byte shows. */
const snapshot = (dir: string): string =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => {
      const file = join(e.parentPath, e.name);
      return `${file} ${createHash("sha256").update(readFileSync(file)).digest("hex")}`;
    })
    .sort()
    .join("\n");

const issuesOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    if (error instanceof NeedsError) return error.issues;
    throw error;
  }
  throw new Error("expected NeedsError");
};

const keysDeep = (value: unknown, found = new Set<string>()): Set<string> => {
  if (Array.isArray(value)) for (const item of value) keysDeep(item, found);
  else if (typeof value === "object" && value !== null) {
    for (const [key, item] of Object.entries(value)) {
      found.add(key);
      keysDeep(item, found);
    }
  }
  return found;
};

const fullPack = (root: string, story = "fx") =>
  writeStoryPack(root, story, {
    assets: [
      "{id: place.village, type: still, target: storyboard, status: final, path: assets/a.jpg}",
      "{id: sound.door, type: sfx, target: storyboard, status: final, path: assets/door.m4a}",
    ],
    files: { "cast.yaml": CAST, "script.yaml": SCRIPT },
  });

describe("A1-02a: pack to job, work folder, needs list", () => {
  it("writes a job for test and dracula that passes jobSchema, with no status and no tower cue", () => {
    for (const story of ["test", "dracula"]) {
      const { job } = buildJob(story, { packsDir: REPO_PACKS });
      expect(jobSchema.safeParse(job).success).toBe(true);
      expect(Object.keys(job)).toEqual([
        "schema",
        "story",
        "source",
        "profiles",
        "cast",
        "lines",
        "pictures",
        "moments",
        "sounds",
      ]);
      expect(job.story).toBe(story);
      expect(job.source).toMatch(/^sha256:[0-9a-f]{64}$/);
      const keys = keysDeep(job);
      for (const banned of ["status", "tower", "cue", "bytes"])
        expect(keys.has(banned)).toBe(false);
    }
  });

  it("is byte-identical on a second run and changes when a source file changes", () => {
    const root = tempDir("pack");
    const dir = fullPack(root);
    const first = serializeJob(buildJobFromDir("fx", dir).job);
    expect(serializeJob(buildJobFromDir("fx", dir).job)).toBe(first);
    const workA = tempDir("wf");
    const workB = tempDir("wf");
    run(["fx", "--packs-dir", root, "--work-folder", workA]);
    run(["fx", "--packs-dir", root, "--work-folder", workB]);
    const jobA = readFileSync(join(workA, "fx", "asset-job.json"), "utf8");
    expect(jobA).toBe(readFileSync(join(workB, "fx", "asset-job.json"), "utf8"));
    writeFileSync(join(dir, "assets", "a.jpg"), "changed");
    expect(buildJobFromDir("fx", dir).job.source).not.toBe(JSON.parse(jobA).source);
  });

  it("hashes sorted relative path and bytes of the files it read", () => {
    const root = tempDir("pack");
    const dir = fullPack(root);
    const read = [
      "assets/a.jpg",
      "assets/cover.png",
      "assets/door.m4a",
      "cast.yaml",
      "pack.yaml",
      "script.yaml",
    ];
    const hash = createHash("sha256");
    for (const rel of read) {
      const data = readFileSync(join(dir, rel));
      hash.update(`${rel}\0${data.length}\0`);
      hash.update(data);
    }
    expect(buildJobFromDir("fx", dir).job.source).toBe(`sha256:${hash.digest("hex")}`);
  });

  it("writes <work folder>/<story>/asset-job.json and prints the rows; --json prints id, kind, origin, status", () => {
    const wf = tempDir("wf");
    const text = run(["test", "--work-folder", wf]);
    expect(text.code).toBe(0);
    expect(text.out).toBe(
      [
        "glow.cover           glow      missing",
        "painting.cover       painting  missing",
        "place.bazaar         place     missing",
        "place.citadel        place     missing",
        "place.sanctuary      place     missing",
        "place.village        place     missing",
        "seal-break.01~vo-01  line      missing",
        "",
      ].join("\n"),
    );
    const job = JSON.parse(readFileSync(join(wf, "test", "asset-job.json"), "utf8")) as Job;
    expect(job.story).toBe("test");
    const json = run(["test", "--json", "--work-folder", wf]);
    expect(JSON.parse(json.out)[0]).toEqual({
      id: "glow.cover",
      kind: "glow",
      origin: "built",
      status: "missing",
    });
  });

  it("stops with AS-CONFIG-1 and writes nothing when no work folder is set", () => {
    const cwd = tempDir("cwd");
    const configDir = tempDir("config");
    const packs = tempDir("pack");
    const dir = fullPack(packs);
    const before = snapshot(dir);
    const { code, err } = run(["fx", "--packs-dir", packs], {}, { cwd, configDir });
    expect(code).toBe(3);
    expect(err).toContain("AS-CONFIG-1");
    expect(readdirSync(cwd)).toEqual([]);
    expect(readdirSync(configDir)).toEqual([]);
    expect(snapshot(dir)).toBe(before);
  });

  it("leaves the previous job when the write fails, and no temp file", () => {
    const wf = tempDir("wf");
    const { job } = buildJobFromDir("fx", fullPack(tempDir("pack")));
    const path = writeJob(wf, job);
    const before = readFileSync(path, "utf8");
    const removed: string[] = [];
    expect(() =>
      writeJob(
        wf,
        { ...job, source: `sha256:${"0".repeat(64)}` },
        {
          writeFile: (p, data) => {
            writeFileSync(p, data.slice(0, 20));
            throw new Error("disk full");
          },
          rename: () => {
            throw new Error("not reached");
          },
          remove: (p) => {
            removed.push(p);
          },
          log: () => {},
        },
      ),
    ).toThrow("disk full");
    expect(readFileSync(path, "utf8")).toBe(before);
    expect(removed).toHaveLength(1);
    expect(removed[0]).toMatch(/asset-job\.json\.\d+\.tmp$/);
  });

  it("removes the temp file for real when the rename fails", () => {
    const wf = tempDir("wf");
    const { job } = buildJobFromDir("fx", fullPack(tempDir("pack")));
    const path = writeJob(wf, job);
    const before = readFileSync(path, "utf8");
    expect(() =>
      writeJob(
        wf,
        { ...job, source: `sha256:${"1".repeat(64)}` },
        {
          writeFile: (p, data) => writeFileSync(p, data),
          rename: () => {
            throw new Error("rename failed");
          },
          remove: (p) => rmSync(p, { force: true }),
          log: () => {},
        },
      ),
    ).toThrow("rename failed");
    expect(readFileSync(path, "utf8")).toBe(before);
    expect(readdirSync(join(wf, "fx"))).toEqual(["asset-job.json"]);
  });

  it("reports each key with its status from a seeded index.json", () => {
    const wf = tempDir("wf");
    const { job } = buildJobFromDir("fx", fullPack(tempDir("pack")));
    const paths = workPathsFor(wf, "fx");
    mkdirSync(paths.root, { recursive: true });
    const hash = `sha256:${"a".repeat(64)}`;
    const entry = (kind: string, status: string) => ({
      kind,
      file: `${"b".repeat(8)}.webp`,
      size: { width: 10, height: 10 },
      inputsHash: hash,
      status,
      notes: [],
    });
    writeFileSync(
      paths.index,
      JSON.stringify({
        "painting.cover": entry("painting", "draft"),
        "glow.cover": entry("glow", "final"),
        "place.village": entry("place", "rejected"),
      }),
    );
    const status = Object.fromEntries(computeRows(job, paths).map((r) => [r.id, r.status]));
    expect(status["painting.cover"]).toBe("draft");
    expect(status["glow.cover"]).toBe("final");
    expect(status["place.village"]).toBe("rejected");
    expect(status["sound.door"]).toBe("missing");
  });

  it("expands two profiles to <id>~<profile> keys, glow masks too", () => {
    const { job } = buildJobFromDir("fx", fullPack(tempDir("pack")), {
      profiles: { dashboard: { width: 3840, height: 2160 }, tv: { width: 1920, height: 1080 } },
    });
    const ids = computeRows(job, workPathsFor(tempDir("wf"), "fx")).map((r) => r.id);
    expect(ids).toContain("painting.cover~dashboard");
    expect(ids).toContain("glow.cover~tv");
    expect(ids).toContain("place.village~dashboard");
    expect(ids).not.toContain("painting.cover");
  });
});

describe("A1-02b: cast, counts and ID sets", () => {
  it("pins the exact ID set for the test pack", () => {
    const { job } = buildJob("test", { packsDir: REPO_PACKS });
    const rows = computeRows(job, workPathsFor(tempDir("wf"), "test")).map((r) => r.id);
    expect(rows).toEqual([
      "glow.cover",
      "painting.cover",
      "place.bazaar",
      "place.citadel",
      "place.sanctuary",
      "place.village",
      "seal-break.01~vo-01",
    ]);
    // The demo line row (D48) brings the built-in Loremaster, audio only.
    expect(job.cast.map((c) => [c.id, c.moods])).toEqual([["narrator", []]]);
    expect(job.lines.map((l) => l.id)).toEqual(["seal-break.01~vo-01"]);
  });

  it("pins the Dracula counts after eligibility filtering", () => {
    const result = buildJob("dracula", { packsDir: REPO_PACKS });
    const { job, silent } = result;
    expect(job.cast).toHaveLength(27);
    expect(job.lines).toHaveLength(214);
    expect(job.pictures).toHaveLength(1);
    expect(job.sounds).toHaveLength(0);
    expect(silent).toHaveLength(496);
    const reasons: Record<string, number> = {};
    for (const s of silent) reasons[s.reason] = (reasons[s.reason] ?? 0) + 1;
    expect(reasons).toEqual({ "invalid-id": 272, private: 188, repeated: 36 });
    // 710 script lines are all accounted for: voiced + silent.
    expect(job.lines.length + silent.length).toBe(710);
  });

  it("keeps the Loremaster audio-only (no moods) even with no voiced line", () => {
    const cast = `${CAST}`;
    const dir = writeStoryPack(tempDir("pack"), "fx", {
      files: {
        "cast.yaml": cast,
        "script.yaml":
          '- id: m.01\n  lines:\n    - {id: m.01.vo-01, speaker: guide, text: "Hi."}\n',
      },
    });
    const { job } = buildJobFromDir("fx", dir);
    const narrator = job.cast.find((c) => c.id === "narrator");
    expect(narrator?.voice).toBeUndefined();
    expect(narrator?.moods).toEqual([]);
    const ids = computeRows(job, workPathsFor(tempDir("wf"), "fx")).map((r) => r.id);
    expect(ids.filter((id) => id.startsWith("portrait.narrator"))).toEqual([]);
  });

  it("makes the Loremaster audio-only and gives a cast member with no voiced line stills only", () => {
    const { job } = buildJobFromDir("fx", fullPack(tempDir("pack")));
    const byId = Object.fromEntries(job.cast.map((c) => [c.id, c]));
    expect(byId.narrator).toEqual({
      id: "narrator",
      name: "Loremaster",
      voice: { provider: "gemini-tts", voiceId: "Charon", style: "slow" },
      moods: [],
    });
    expect(byId.guide?.voice?.voiceId).toBe("Kore");
    expect(byId.guide?.moods).toEqual(["neutral", "friendly", "scared", "angry", "sly"]);
    // The witness has a line, but it is "I saw nothing." from a cast with no voice: stills only.
    expect(byId.witness).toEqual({
      id: "witness",
      name: "Witness",
      moods: ["neutral", "friendly", "scared", "angry", "sly"],
    });
    const ids = computeRows(job, workPathsFor(tempDir("wf"), "fx")).map((r) => r.id);
    expect(ids.filter((id) => id.startsWith("portrait.narrator"))).toEqual([]);
    expect(ids).toContain("portrait.witness~sly");
    expect(ids).toContain("portrait.guide");
  });
});

describe("A1-02c: pictures, sounds, glow, moments, lines", () => {
  it("keeps pack ids, uses the dashboard profile and derives exactly one glow.cover", () => {
    const { job } = buildJobFromDir("fx", fullPack(tempDir("pack")));
    expect(job.profiles).toEqual({ dashboard: { width: 3840, height: 2160 } });
    expect(job.pictures.map((p) => [p.id, p.kind, p.profiles, p.glow])).toEqual([
      ["painting.cover", "painting", ["dashboard"], true],
      ["place.village", "place", ["dashboard"], undefined],
    ]);
    expect(job.sounds.map((s) => [s.id, s.kind])).toEqual([["sound.door", "effect"]]);
    const ids = computeRows(job, workPathsFor(tempDir("wf"), "fx")).map((r) => r.id);
    expect(ids.filter((id) => id.startsWith("glow."))).toEqual(["glow.cover"]);
  });

  it("rejects an ipad art target with file, path and rule (D1)", () => {
    const root = tempDir("pack");
    const dir = writeStoryPack(root, "fx", {
      assets: ["{id: place.village, type: still, target: ipad, status: final, path: assets/a.jpg}"],
    });
    const [found] = issuesOf(() => buildJobFromDir("fx", dir));
    expect(found).toMatchObject({ file: "pack.yaml", path: "assets.0.target", rule: "A1-4" });
    expect(found?.message).toContain("Story board only");
  });

  it("carries a moment's camera from camera/<id>.json", () => {
    const track = {
      id: "grey-stair.01",
      still: "assets/a.jpg",
      cues: [
        {
          start: 0,
          end: 4,
          from: { x: 0.5, y: 0.5, w: 1, h: 1 },
          to: { x: 0.5, y: 0.5, w: 0.8, h: 0.8 },
        },
      ],
    };
    const root = tempDir("pack");
    const dir = writeStoryPack(root, "fx", {
      assets: [
        "{id: place.village, type: still, target: storyboard, status: final, path: assets/a.jpg}",
      ],
      files: { "camera/grey-stair.01.json": JSON.stringify(track) },
    });
    const { job } = buildJobFromDir("fx", dir);
    expect(job.moments).toEqual([
      {
        id: "grey-stair.01",
        picture: "place.village",
        camera: { track: { still: "assets/a.jpg", cues: track.cues } },
      },
    ]);
  });

  it("carries a named move that names its picture", () => {
    const dir = writeStoryPack(tempDir("pack"), "fx", {
      assets: [
        "{id: place.village, type: still, target: storyboard, status: final, path: assets/a.jpg}",
      ],
      files: {
        "camera/seal-break.01.json": JSON.stringify({
          id: "seal-break.01",
          picture: "painting.cover",
          move: "push-in",
          speed: "slow",
        }),
      },
    });
    expect(buildJobFromDir("fx", dir).job.moments).toEqual([
      {
        id: "seal-break.01",
        picture: "painting.cover",
        camera: { move: "push-in", speed: "slow" },
      },
    ]);
  });

  it("includes one fixed one-off line unchanged and lists the rest as silent captions", () => {
    const { job, silent } = buildJobFromDir("fx", fullPack(tempDir("pack")));
    expect(job.lines).toEqual([
      {
        id: "seal-break.01.vo-01",
        speaker: "narrator",
        text: "The roads are clear, and a seal breaks.",
      },
      { id: "fixture.01.vo-01", speaker: "guide", text: "Welcome." },
    ]);
    const why = Object.fromEntries(silent.map((s) => [s.id ?? s.path, s.reason]));
    expect(why).toEqual({
      "fixture.02.vo-01": "fill-in",
      "fixture.02.vo-02": "repeated",
      "fixture.02.vo-03": "repeated",
      "fixture.02.vo-04": "no-voice",
      "fixture.03~no-guide.vo-01": "invalid-id",
      "fixture.04.private.guide.vo-01": "private",
      "chapters.0.start.effects.0.lines.0": "legacy-inline",
    });
    expect(silent.find((s) => s.reason === "legacy-inline")?.text).toBe("A legacy caption.");
  });
});

describe("A1-02d: invalid input and optional split files", () => {
  it("builds a valid inline pack with no script.yaml or cast.yaml", () => {
    const dir = writeStoryPack(tempDir("pack"), "fx");
    const { job, silent } = buildJobFromDir("fx", dir);
    expect(job.cast).toEqual([]);
    expect(silent.map((s) => s.reason)).toEqual(["legacy-inline"]);
  });

  it("never writes into the pack", () => {
    const dir = fullPack(tempDir("pack"));
    const before = snapshot(dir);
    run(["fx", "--packs-dir", resolve(dir, ".."), "--work-folder", tempDir("wf")]);
    expect(snapshot(dir)).toBe(before);
  });

  it("reports file, path and rule for a pack that does not match its schema", () => {
    const dir = writeStoryPack(tempDir("pack"), "fx");
    writeFileSync(join(dir, "pack.yaml"), "format: 2\nkind: story\npack_id: fx\n");
    const found = issuesOf(() => buildJobFromDir("fx", dir));
    expect(found.length).toBeGreaterThan(0);
    for (const item of found) {
      expect(item.file).toBe("pack.yaml");
      expect(item.rule).toMatch(/^P2-\d+$/);
      expect(item.path).not.toBe("");
    }
  });

  it("reports an unknown speaker, a bad cast and a bad id in pack-lint format", () => {
    const root = tempDir("pack");
    const dir = writeStoryPack(root, "fx", {
      assets: [
        "{id: place_village, type: still, target: storyboard, status: final, path: assets/a.jpg}",
      ],
      files: {
        "cast.yaml": "- id: guide\n  name: Guide\n",
        "script.yaml":
          '- id: m.01\n  lines:\n    - {id: m.01.vo-01, speaker: ghost, text: "Boo."}\n',
      },
    });
    const found = issuesOf(() => buildJobFromDir("fx", dir)).map(
      (i) => `${i.file} ${i.path} ${i.rule}`,
    );
    expect(found).toContain("script.yaml [0].lines[0].speaker A1-5");
    expect(found).toContain("pack.yaml assets.0.id A1-3");
    const result = run(["fx", "--packs-dir", root, "--work-folder", tempDir("wf")]);
    expect(result.code).toBe(1);
    expect(result.err).toContain(
      "file=script.yaml path=[0].lines[0].speaker rule=A1-5 message=A1-5:",
    );
  });

  it("rejects a malformed cast file and a missing source file", () => {
    const dir = writeStoryPack(tempDir("pack"), "fx", {
      assets: [
        "{id: place.gone, type: still, target: storyboard, status: final, path: assets/gone.jpg}",
      ],
      files: { "cast.yaml": "- id: guide\n" },
    });
    const found = issuesOf(() => buildJobFromDir("fx", dir)).map(
      (i) => `${i.file} ${i.path} ${i.rule}`,
    );
    expect(found).toContain("cast.yaml [0] A1-2");
    expect(
      found.some((f) => f.startsWith("assets/gone.jpg") || f.startsWith("pack.yaml assets.0.path")),
    ).toBe(true);
  });

  it("rejects a pack path that leaves the pack folder", () => {
    const dir = writeStoryPack(tempDir("pack"), "fx", {
      assets: [
        "{id: place.village, type: still, target: storyboard, status: final, path: ../outside.jpg}",
      ],
    });
    const [found] = issuesOf(() => buildJobFromDir("fx", dir));
    expect(found).toMatchObject({ file: "pack.yaml", path: "assets.0.path", rule: "A1-1" });
  });

  it("rejects an injected status in a camera sidecar and a sidecar id that is not its file name", () => {
    const bad = JSON.stringify({
      id: "grey-stair.01",
      still: "assets/a.jpg",
      status: "final",
      cues: [CUE],
    });
    const dir = writeStoryPack(tempDir("pack"), "fx", {
      files: {
        "camera/grey-stair.01.json": bad,
        "camera/grey-stair.02.json": JSON.stringify({
          id: "other.id",
          still: "assets/a.jpg",
          cues: [CUE],
        }),
      },
    });
    const found = issuesOf(() => buildJobFromDir("fx", dir)).map((i) => `${i.file} ${i.rule}`);
    expect(found).toContain("camera/grey-stair.02.json A1-6");
    expect(found).toContain("camera/grey-stair.01.json A1-6");
  });

  it("rejects a moment whose still is not a picture of the pack", () => {
    const dir = writeStoryPack(tempDir("pack"), "fx", {
      files: {
        "camera/grey-stair.01.json": JSON.stringify({
          id: "grey-stair.01",
          still: "assets/nope.jpg",
          cues: [CUE],
        }),
      },
    });
    const [found] = issuesOf(() => buildJobFromDir("fx", dir));
    expect(found).toMatchObject({
      file: "camera/grey-stair.01.json",
      rule: "A1-6",
      path: "track.still",
    });
  });

  it("fails a job that carries a status anywhere (asset-studio's rule)", () => {
    const { job } = buildJobFromDir("fx", fullPack(tempDir("pack")));
    const injected = { ...job, cast: job.cast.map((c) => ({ ...c, status: "final" })) };
    expect(jobSchema.safeParse(injected).success).toBe(false);
    expect(jobSchema.safeParse({ ...job, status: "final" }).success).toBe(false);
  });

  it("reports a dangling script.yaml symlink instead of treating it as absent", () => {
    const dir = writeStoryPack(tempDir("pack"), "fx", { files: { "cast.yaml": CAST } });
    symlinkSync(join(dir, "gone.yaml"), join(dir, "script.yaml"));
    const found = issuesOf(() => buildJobFromDir("fx", dir));
    expect(found.map((i) => `${i.file} ${i.path} ${i.rule}`)).toContain("script.yaml (file) A1-1");
  });

  it("lists the first silent captions with reasons on stderr, all with --verbose", () => {
    const root = tempDir("pack");
    fullPack(root);
    const brief = run(["fx", "--packs-dir", root, "--work-folder", tempDir("wf")]);
    expect(brief.err).toContain("silent captions: 7");
    expect(brief.err).toContain("fill-in  fixture.02.vo-01  file=script.yaml");
    expect(brief.err).toContain("--verbose lists all");
    const all = run(["fx", "--verbose", "--packs-dir", root, "--work-folder", tempDir("wf")]);
    expect(all.err).toContain(
      "legacy-inline  -  file=pack.yaml path=chapters.0.start.effects.0.lines.0",
    );
    expect(all.err).not.toContain("--verbose lists all");
  });

  it("reports a missing pack folder", () => {
    const found = issuesOf(() => buildJobFromDir("nope", join(tempDir("pack"), "nope")));
    expect(found[0]).toMatchObject({ rule: "A1-1", path: "(file)" });
  });

  it("is a usage error without a story, and writes nothing", () => {
    const wf = tempDir("wf");
    const result = run(["--work-folder", wf]);
    expect(result.code).toBe(2);
    expect(readdirSync(wf)).toEqual([]);
  });
});
