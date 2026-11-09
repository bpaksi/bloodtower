import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { lintPath, lintPathWithIndex } from "../../server/scripts/packLint.ts";
import type { Issue } from "../needs/issues.ts";
import { entry, indexOf, tempRoot, unvignetted, vignette, writeImage } from "./fixtures.ts";
import {
  anchorInBounds,
  CAPTION_MAX,
  edgeRatio,
  INDEX_FILE,
  LINT_RULE,
  lintAvatar,
  lintGlowFiles,
  lintIndexEntries,
  lintIndexEntriesReport,
  lintIndexText,
  lintPackAssets,
  MOUTH_SHAPES,
  outsideAnchorChanges,
  packIndexSchema,
  readRaster,
} from "./index.ts";

const roots: string[] = [];
const root = (label: string) => {
  const r = tempRoot(label);
  roots.push(r);
  return r;
};
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

const allMouths = (file: string): Record<string, string> =>
  Object.fromEntries(MOUTH_SHAPES.map((s) => [s, file]));
const base = { root: "/unused", referenced: [] as string[], release: false };
const rules = (issues: Issue[]) => issues.map((i) => i.rule);
/** Exactly one issue, with the given rule, naming the asset id in path and message. */
const only = (issues: Issue[], rule: string, id: string) => {
  expect(issues).toHaveLength(1);
  expect(issues[0]?.rule).toBe(rule);
  expect(issues[0]?.path).toBe(id);
  expect(issues[0]?.message).toContain(id);
};

describe("A1-03 index schema (step 5 imports it)", () => {
  it("parses ID -> {kind, file, size, captions, status}", () => {
    const parsed = packIndexSchema.safeParse({ assets: { "place.village": entry("place") } });
    expect(parsed.success).toBe(true);
  });

  it("accepts sound sizes in seconds and rejects an avatar with fewer than eight mouths", () => {
    const sound = packIndexSchema.safeParse({
      assets: { "door.a": entry("effect", { size: { seconds: 1.5 } }) },
    });
    expect(sound.success).toBe(true);
    const few = packIndexSchema.safeParse({
      assets: {},
      avatar: {
        dir: "a",
        portrait: "p.png",
        anchor: { x: 0.5, y: 0.5, w: 0.2, h: 0.2 },
        mouths: { REST: "r.png" },
      },
    });
    expect(few.success).toBe(false);
    const all = packIndexSchema.safeParse({
      assets: {},
      avatar: {
        dir: "a",
        portrait: "p.png",
        anchor: { x: 0.5, y: 0.5, w: 0.2, h: 0.2 },
        mouths: allMouths("m.png"),
      },
    });
    expect(all.success).toBe(true);
  });

  it("rejects a bad entry with rule A1-9 naming the path", async () => {
    const text = JSON.stringify({ assets: { "place.village": { kind: "place" } } });
    const issues = await lintIndexText({ text, options: base });
    expect(rules(issues).every((r) => r === LINT_RULE.index)).toBe(true);
    expect(issues.map((i) => i.path)).toContain("assets.place.village.file");
    const bad = await lintIndexText({ text: "{nope", options: base });
    expect(rules(bad)).toEqual([LINT_RULE.index]);
  });
});

describe("A1-03a/b kind, mood, caption, drafts, missing ids", () => {
  it("kind: the six picture kinds and two sound kinds pass", () => {
    const assets: Record<string, ReturnType<typeof entry>> = {};
    for (const k of ["painting", "portrait", "foe", "place", "item", "cover"]) {
      assets[`${k}.x`] = entry(k);
    }
    assets["door.a"] = entry("effect");
    assets["wind.a"] = entry("ambience");
    assets["glow.x"] = entry("glow");
    assets["painting.x"] = entry("painting");
    expect(lintIndexEntries(indexOf(assets), base)).toEqual([]);
  });

  it("kind: a bespoke kind (tomb, map, music) fails A1-15 with its id", () => {
    for (const kind of ["tomb", "map", "music"]) {
      const id = `${kind}.crypt`;
      only(lintIndexEntries(indexOf({ [id]: entry(kind) }), base), LINT_RULE.kind, id);
    }
  });

  it("kind: an old checklist id cannot ride on an allowed picture kind", () => {
    only(
      lintIndexEntries(indexOf({ "tomb.crypt": entry("painting") }), base),
      LINT_RULE.kind,
      "tomb.crypt",
    );
  });

  it("kind: a sound id cannot use a picture name (painting.x with kind effect)", () => {
    only(
      lintIndexEntries(indexOf({ "painting.x": entry("effect") }), base),
      LINT_RULE.kind,
      "painting.x",
    );
  });

  it("mood: the five pass, an unknown mood fails A1-16", () => {
    const ok: Record<string, ReturnType<typeof entry>> = { "portrait.guide": entry("portrait") };
    for (const m of ["neutral", "friendly", "scared", "angry", "sly"]) {
      ok[`portrait.guide~${m}`] = entry("portrait");
    }
    expect(lintIndexEntries(indexOf(ok), base)).toEqual([]);
    only(
      lintIndexEntries(indexOf({ "portrait.guide~jolly": entry("portrait") }), base),
      LINT_RULE.mood,
      "portrait.guide~jolly",
    );
  });

  it("caption: 120 code points pass, 121 fail A1-13, pause markup is not counted", () => {
    const id = "ch-one.01.vo-01";
    const at = (captions: string[]) =>
      lintIndexEntries(indexOf({ [id]: entry("line", { captions }) }), base);
    expect(at(["a".repeat(CAPTION_MAX)])).toEqual([]);
    only(at(["a".repeat(CAPTION_MAX + 1)]), LINT_RULE.caption, id);
    expect(at([`${"a".repeat(60)} [pause 1.5] ${"b".repeat(59)}`])).toEqual([]);
    expect(at(["\u{1F409}".repeat(CAPTION_MAX)])).toEqual([]);
    only(at(["x [pause oops"]), LINT_RULE.caption, id);
  });

  it("missing id: a release fails A1-19 per id; otherwise one warning with the count", () => {
    const index = indexOf({ "place.village": entry("place") });
    const refs = { ...base, referenced: ["place.village", "place.bazaar"] };
    only(lintIndexEntries(index, { ...refs, release: true }), LINT_RULE.missingId, "place.bazaar");
    expect(lintIndexEntries(index, refs)).toEqual([]);
    const warned = lintIndexEntriesReport(index, refs).warnings;
    expect(rules(warned)).toEqual([LINT_RULE.missingId]);
    expect(warned[0]?.message).toContain("1 referenced id has no index entry yet");
    expect(warned[0]?.message).toContain("place.bazaar");
    const many = lintIndexEntriesReport(index, {
      ...base,
      referenced: ["place.village", ...[1, 2, 3, 4, 5, 6, 7].map((n) => `place.p${n}`)],
    }).warnings;
    expect(many[0]?.message).toContain("7 referenced ids have no index entry yet");
    expect(many[0]?.message).toContain("and 2 more");
    expect(lintIndexEntries(index, { ...base, referenced: ["place.village"] })).toEqual([]);
    expect(
      lintIndexEntriesReport(index, { ...base, referenced: ["place.village"] }).warnings,
    ).toEqual([]);
  });

  it("missing id: painting.cover and glow.cover are a pair", () => {
    const refs = ["painting.cover", "glow.cover"];
    const index = indexOf({ "painting.cover": entry("painting") });
    const issues = lintIndexEntries(index, { ...base, referenced: refs, release: true });
    only(issues, LINT_RULE.missingId, "glow.cover");
    expect(issues[0]?.message).toContain("painting.cover");
    expect(
      lintIndexEntriesReport(index, { ...base, referenced: refs }).warnings[0]?.message,
    ).toContain("glow.cover");
    // A mask whose painting is absent is a pairing error even in a partial pack.
    const orphan = lintIndexEntries(indexOf({ "glow.cover": entry("glow") }), base);
    only(orphan, LINT_RULE.missingId, "glow.cover");
  });

  it("draft: only a release rejects it (A1-20)", () => {
    const index = indexOf({ "place.village": entry("place", { status: "draft" }) });
    expect(lintIndexEntries(index, base)).toEqual([]);
    only(lintIndexEntries(index, { ...base, release: true }), LINT_RULE.draft, "place.village");
    const final = indexOf({ "place.village": entry("place") });
    expect(lintIndexEntries(final, { ...base, release: true })).toEqual([]);
  });
});

describe("A1-03a glow masks", () => {
  const pair = (mask: [number, number]) =>
    indexOf({
      "painting.cover": entry("painting", { size: { width: 1920, height: 1080 } }),
      "glow.cover": entry("glow", { size: { width: mask[0], height: mask[1] } }),
    });

  it("an exact size match passes, 1920x1079 fails A1-17", () => {
    expect(lintIndexEntries(pair([1920, 1080]), base)).toEqual([]);
    const issues = lintIndexEntries(pair([1920, 1079]), base);
    only(issues, LINT_RULE.glowSize, "glow.cover");
    expect(issues[0]?.message).toContain("1920x1079");
  });

  it("a grayscale mask passes, a coloured RGB mask fails A1-18", async () => {
    const dir = root("glow");
    await writeImage(join(dir, "assets/gray.png"), 16, 9, (x) => [x * 10, x * 10, x * 10]);
    await writeImage(join(dir, "assets/color.png"), 16, 9, (x) => [x * 10, 0, 0]);
    const at = (file: string) =>
      lintGlowFiles(
        indexOf({ "glow.cover": entry("glow", { file, size: { width: 16, height: 9 } }) }),
        dir,
      );
    expect(await at("gray.png")).toEqual([]);
    only(await at("color.png"), LINT_RULE.glowGray, "glow.cover");
  });

  it("a mask file that is not the size the index says fails A1-17", async () => {
    const dir = root("glowsize");
    await writeImage(join(dir, "assets/m.png"), 16, 8, () => [9, 9, 9]);
    const issues = await lintGlowFiles(
      indexOf({ "glow.cover": entry("glow", { file: "m.png", size: { width: 16, height: 9 } }) }),
      dir,
    );
    only(issues, LINT_RULE.glowSize, "glow.cover");
  });

  it("an unreadable mask is reported, not skipped", async () => {
    const dir = root("glowbad");
    mkdirSync(join(dir, "assets"));
    writeFileSync(join(dir, "assets/m.png"), "not an image");
    const issues = await lintGlowFiles(
      indexOf({ "glow.cover": entry("glow", { file: "m.png" }) }),
      dir,
    );
    only(issues, LINT_RULE.glowGray, "glow.cover");
  });
});

describe("A1-03a avatar rules", () => {
  const W = 64;
  const H = 80;
  const anchor = { x: 0.5, y: 0.625, w: 0.5, h: 0.25 }; // centre form: pixels x 16..48, y 40..60
  const portraitPixel = vignette(W, H);
  const names = [...MOUTH_SHAPES];

  const kit = async (
    label: string,
    mouth: (shape: string) => { w?: number; h?: number; edit?: (x: number, y: number) => boolean },
  ) => {
    const dir = root(label);
    const av = join(dir, "avatars/g");
    await writeImage(join(av, "portrait.png"), W, H, portraitPixel);
    const mouths: Record<string, string> = {};
    for (const shape of names) {
      const m = mouth(shape);
      await writeImage(join(av, `${shape}.png`), m.w ?? W, m.h ?? H, (x, y) =>
        m.edit?.(x, y) ? [255, 0, 0] : portraitPixel(x, y),
      );
      mouths[shape] = `${shape}.png`;
    }
    return {
      dir,
      index: indexOf({}, { dir: "avatars/g", portrait: "portrait.png", anchor, mouths }),
    };
  };
  const inside = (x: number, y: number) => x >= 16 && x < 48 && y >= 40 && y < 60;

  it("a full kit with changes only inside the anchor passes", async () => {
    const { dir, index } = await kit("ok", () => ({ edit: inside }));
    expect(await lintAvatar(index, dir)).toEqual([]);
  });

  it("a mouth frame of another size fails A1-10", async () => {
    const { dir, index } = await kit("size", (s) =>
      s === "AH" ? { w: W - 1, edit: inside } : { edit: inside },
    );
    const issues = await lintAvatar(index, dir);
    only(issues, LINT_RULE.frameSize, "avatar");
    expect(issues[0]?.message).toContain("mouth AH");
  });

  it("one altered pixel outside the anchor fails A1-11", async () => {
    const { dir, index } = await kit("out", (s) => ({
      edit: (x, y) => inside(x, y) || (s === "FV" && x === 3 && y === 3),
    }));
    const issues = await lintAvatar(index, dir);
    only(issues, LINT_RULE.outsideAnchor, "avatar");
    expect(issues[0]?.message).toContain("mouth FV");
    expect(issues[0]?.message).toContain("1 pixels");
  });

  it("an anchor box that overflows the portrait fails A1-12 (x, y is the centre)", async () => {
    const { dir, index } = await kit("bounds", () => ({ edit: inside }));
    const avatar = index.avatar;
    if (!avatar) throw new Error("fixture has an avatar");
    const bad = { ...index, avatar: { ...avatar, anchor: { x: 0.05, y: 0.5, w: 0.2, h: 0.25 } } };
    only(await lintAvatar(bad, dir), LINT_RULE.anchorBounds, "avatar");
    expect(anchorInBounds({ x: 0.05, y: 0.5, w: 0.2, h: 0.25 })).toBe(false);
    expect(anchorInBounds({ x: 0.9, y: 0.5, w: 0.15, h: 0.25 })).toBe(true);
    expect(anchorInBounds({ x: 0.95, y: 0.5, w: 0.15, h: 0.25 })).toBe(false);
    expect(anchorInBounds(anchor)).toBe(true);
    expect(anchorInBounds({ x: 0.5, y: 0.5, w: 1, h: 1 })).toBe(true);
    expect(anchorInBounds({ x: 0.5, y: 0.5, w: 0, h: 0.5 })).toBe(false);
  });

  it("the black-vignette recipe passes the dark edge, its inverse fails A1-14", async () => {
    const dir = root("edge");
    await writeImage(join(dir, "avatars/g/v.png"), 128, 160, vignette(128, 160));
    await writeImage(join(dir, "avatars/g/u.png"), 128, 160, unvignetted(128, 160));
    const at = (portrait: string) =>
      lintAvatar(
        indexOf({}, { dir: "avatars/g", portrait, anchor, mouths: allMouths(portrait) }),
        dir,
      );
    expect(await at("v.png")).toEqual([]);
    only(await at("u.png"), LINT_RULE.darkEdge, "avatar");
    expect(edgeRatio(await readRaster(join(dir, "avatars/g/v.png")))).toBeLessThan(0.6);
    expect(edgeRatio(await readRaster(join(dir, "avatars/g/u.png")))).toBeGreaterThan(0.6);
  });

  it("an avatar folder outside the pack is refused", async () => {
    const dir = root("trav");
    const issues = await lintAvatar(
      indexOf({}, { dir: "../x", portrait: "p.png", anchor, mouths: allMouths("p.png") }),
      dir,
    );
    only(issues, LINT_RULE.index, "avatar");
  });
});

describe("A1-03 regression: the legacy Keeper kit", () => {
  const keeper = join(import.meta.dirname, "../../../public/avatars/keeper");
  const shapes = ["REST", "MBP", "CONS-EE", "EH-AE", "AH", "OH-ER", "OO-W", "FV"];
  const mouths = Object.fromEntries(shapes.map((s) => [s, `mouths/${s}.png`]));
  const anchor = { x: 0.501953125, y: 0.61328125, w: 0.341796875, h: 0.25 };

  it("all eight mouths are the portrait's pixel size and the anchor is in bounds", async () => {
    const issues = await lintAvatar(
      indexOf({}, { dir: "avatars/keeper", portrait: "portrait.png", anchor, mouths }),
      join(keeper, "../.."),
    );
    expect(rules(issues)).not.toContain(LINT_RULE.frameSize);
    expect(rules(issues)).not.toContain(LINT_RULE.anchorBounds);
    expect(rules(issues)).not.toContain(LINT_RULE.index);
  });

  it("under the centre-form anchor all eight mouths are clean (0 flagged)", async () => {
    const issues = await lintAvatar(
      indexOf({}, { dir: "avatars/keeper", portrait: "portrait.png", anchor, mouths }),
      join(keeper, "../.."),
    );
    expect(issues.filter((i) => i.rule === LINT_RULE.outsideAnchor)).toEqual([]);
    const portrait = await readRaster(join(keeper, "portrait.png"));
    for (const shape of shapes) {
      const frame = await readRaster(join(keeper, `mouths/${shape}.png`));
      expect(outsideAnchorChanges(portrait, frame, anchor)).toBe(0);
    }
  });
});

describe("A1-03c scope", () => {
  it.skip("DEC-348: shared faces under the story filter wait for shared/cast/ to exist", () => {
    // Pending: no shared cast folder yet, and no new 110-face production task (D-DEC-348).
  });

  it("a chin line is not required on the avatar entry (0.3)", async () => {
    const dir = root("chin");
    const av = join(dir, "avatars/g");
    await writeImage(join(av, "p.png"), 32, 40, vignette(32, 40));
    await writeImage(join(av, "REST.png"), 32, 40, vignette(32, 40));
    const index = indexOf(
      {},
      {
        dir: "avatars/g",
        portrait: "p.png",
        anchor: { x: 0.25, y: 0.5, w: 0.5, h: 0.25 },
        mouths: allMouths("REST.png"),
      },
    );
    expect(packIndexSchema.safeParse(JSON.parse(JSON.stringify(index))).success).toBe(true);
    expect(await lintAvatar(index, dir)).toEqual([]);
  });
});

describe("A1-03a pack:lint wiring", () => {
  const repoRoot = join(import.meta.dirname, "../../../../..");
  const packsDir = () => {
    const r = root("pack");
    cpSync(join(repoRoot, "packs/base"), join(r, "base"), { recursive: true });
    cpSync(join(repoRoot, "packs/test"), join(r, "test"), { recursive: true });
    return r;
  };
  const refs = [
    "painting.cover",
    "glow.cover",
    "place.village",
    "place.bazaar",
    "place.citadel",
    "place.sanctuary",
  ];
  const writeIndex = async (story: string, status: "draft" | "final", drop?: string) => {
    const assets: Record<string, ReturnType<typeof entry>> = {};
    for (const id of refs) {
      const kind = id.split(".")[0] as string;
      assets[id] =
        kind === "glow"
          ? entry("glow", { file: "glow.png", size: { width: 16, height: 9 }, status })
          : entry(kind, { status, size: { width: 16, height: 9 } });
    }
    if (drop) delete assets[drop];
    await writeImage(join(story, "assets/glow.png"), 16, 9, () => [7, 7, 7]);
    // The loader resolves an indexed id to its file, so each indexed file is on disk (D45).
    for (const e of Object.values(assets)) {
      if (e.kind !== "glow")
        await writeImage(join(story, "assets", e.file), 16, 9, () => [7, 7, 7]);
    }
    writeFileSync(join(story, INDEX_FILE), JSON.stringify({ assets }));
  };

  it("a pack with no index.json lints exactly as before", async () => {
    const r = packsDir();
    const before = lintPath(join(r, "test"), r);
    const after = await lintPathWithIndex(join(r, "test"), r);
    expect(after).toEqual(before);
    expect(await lintPackAssets(join(r, "test"), false)).toBeUndefined();
  });

  it("checks a present index; a clean one passes and keeps the OK line", async () => {
    const r = packsDir();
    await writeIndex(join(r, "test"), "draft");
    const report = await lintPathWithIndex(join(r, "test"), r);
    expect(report.exitCode).toBe(0);
    expect(report.lines[0]).toContain("OK test");
  });

  it("an index issue keeps lintPath's own lines and warnings", async () => {
    const r = packsDir();
    await writeIndex(join(r, "test"), "final", "place.bazaar");
    const plain = lintPath(join(r, "test"), r);
    const report = await lintPathWithIndex(join(r, "test"), r);
    expect(report.lines.slice(0, plain.lines.length)).toEqual(plain.lines);
    expect(report.lines.length).toBeGreaterThan(plain.lines.length);
  });

  it("--release rejects a draft, naming rule and id", async () => {
    const r = packsDir();
    await writeIndex(join(r, "test"), "draft");
    const report = await lintPathWithIndex(join(r, "test"), r, true);
    expect(report.exitCode).toBe(1);
    expect(report.lines.join("\n")).toContain("rule=A1-20");
    expect(report.lines.join("\n")).toContain("place.village");
    await writeIndex(join(r, "test"), "final");
    expect((await lintPathWithIndex(join(r, "test"), r, true)).exitCode).toBe(0);
  });

  it("a referenced id missing from the index warns A1-19 with a count; --release fails", async () => {
    const r = packsDir();
    await writeIndex(join(r, "test"), "final", "place.bazaar");
    const report = await lintPathWithIndex(join(r, "test"), r);
    expect(report.exitCode).toBe(0);
    expect(report.lines.join("\n")).toMatch(
      /rule=A1-19 .*1 referenced id has no index entry yet \(place\.bazaar\)/,
    );
    const release = await lintPathWithIndex(join(r, "test"), r, true);
    expect(release.exitCode).toBe(1);
    expect(release.lines.join("\n")).toMatch(/rule=A1-19 .*place\.bazaar/);
  });
});
