import { describe, expect, it } from "vitest";
import {
  absentHuntersOf,
  packIssues,
  packMetadataSchema,
  packSchema,
  parseMomentId,
  privateHunterOf,
  randomnessIssue,
  SETTING_ID_MAX,
  SETTING_OPTIONS_MAX,
  SETTINGS_MAX,
  SETUP_STEP_ID_MAX,
  SETUP_STEPS_MAX,
  sceneOf,
} from "./index.ts";

interface Fixture {
  title: string;
  assets: Array<Record<string, unknown>>;
  ambient: { night: { bed: string; accents: string[]; interval_s: [number, number] } };
  cues: Array<Record<string, unknown>>;
  moments: Array<Record<string, unknown>>;
  nights: Array<{ end: string } & Record<string, unknown>>;
  set_pieces: Array<{ id: string } & Record<string, unknown>>;
  [key: string]: unknown;
}

const asset = (
  id: string,
  type: "still" | "clip" | "line" | "sfx" | "music" | "ambient" | "portrait",
  target: "storyboard" | "ipad" | "phone",
) => ({
  id,
  type,
  target,
  status: "placeholder" as const,
  path: `${id.replaceAll(".", "-")}.txt`,
});

const validPack = (): Fixture => ({
  pack_id: "test",
  title: "Test pack",
  version: "0.0.1",
  engine_min: "0.1.0",
  structure: "one-shot" as const,
  players: { min: 1, max: 4 },
  lengths: ["standard" as const],
  difficulties: [{ id: "standard", label: "Standard", mods: {} }],
  systems: { clock: "nights", corruption: "off" },
  components: [{ "asset-group": "stills", use: "used" as const }],
  setup: [{ id: "lay-out-board", label: "Lay out the board and orient the kingdoms." }],
  av_theme: {
    art_style: "plain",
    clip_style: "none",
    palette: "ink",
    narrator_voice: "narrator",
    music_mood: "quiet",
    sfx_set: "basic",
  },
  ambient: {
    night: { bed: "amb.night", accents: ["acc.tick"], interval_s: [20, 60] as [number, number] },
  },
  hunters: [
    {
      id: "alpha",
      name: "Alpha",
      portrait: "por.alpha",
      voice: "vo.alpha",
      start_location: "hall",
    },
    {
      id: "beta",
      name: "Beta",
      portrait: "por.beta",
      voice: "vo.beta",
      start_location: "hall",
    },
  ],
  cast: [{ id: "narrator", name: "Narrator", voice: "vo.narrator", role: "narrator" as const }],
  nights: [
    {
      id: "n1",
      index: 1,
      kingdom: "fixed:K1",
      phases: [{ id: "night", advance: { after_actions: 1, on_event: "dawn" } }],
      set_pieces: [{ ref: "proving-ground", required: true }],
      end: "night_end(n1)",
    },
  ],
  set_pieces: [
    {
      id: "proving-ground",
      night: "n1",
      site: { building: "fixed" },
      trigger: "enter-site",
      flow: [{ kind: "moment" }],
      outcome: { next: "done" },
    },
  ],
  moments: [
    {
      id: "proving-ground.01",
      kind: "text-card" as const,
      target: "storyboard",
      lines: [{ speaker: "narrator", text: "A bell.", voice: "vo.line" }],
    },
    {
      id: "proving-ground.02.private.alpha",
      kind: "text-card" as const,
      target: "ipad:alpha",
      lines: [{ speaker: "alpha", text: "Only Alpha hears this.", voice: "vo.alpha-line" }],
    },
    {
      id: "proving-ground.01~no-beta",
      kind: "text-card" as const,
      cond: "absent(beta)",
    },
  ],
  cues: [
    {
      name: "bell",
      capability: "screen",
      status: "Library" as const,
      screen: "fx.bell",
      fallback_sfx: "sfx.bell",
      drums: "none" as const,
    },
  ],
  assets: [
    asset("amb.night", "ambient", "storyboard"),
    asset("acc.tick", "sfx", "storyboard"),
    asset("por.alpha", "portrait", "ipad"),
    asset("por.beta", "portrait", "ipad"),
    asset("vo.alpha", "line", "ipad"),
    asset("vo.beta", "line", "ipad"),
    asset("vo.narrator", "line", "storyboard"),
    asset("vo.line", "line", "storyboard"),
    asset("vo.alpha-line", "line", "ipad"),
    asset("fx.bell", "still", "storyboard"),
    asset("sfx.bell", "sfx", "storyboard"),
  ],
  stats: { custom: [], timing: { marks: "auto" as const } },
  choices: [{ id: "kept", label: "not run" }],
});

const rules = (value: unknown) => {
  const parsed = packSchema.safeParse(value);
  if (parsed.success) return [];
  return packIssues(parsed.error).map((item) => item.rule);
};

describe("moment ids", () => {
  it("parses a shared moment, a private moment and an absence variant", () => {
    expect(parseMomentId("proving-ground.01")).toEqual({
      scene: "proving-ground",
      moment: "01",
      variants: [],
    });
    expect(parseMomentId("proving-ground.02.private.alpha")?.hunter).toBe("alpha");
    expect(privateHunterOf("proving-ground.02.private.alpha")).toBe("alpha");
    expect(sceneOf("proving-ground.investigate.share")).toBe("proving-ground");
    expect(absentHuntersOf("proving-ground.01~no-beta~nailed")).toEqual(["beta"]);
    expect(parseMomentId("proving-ground.private.alpha")).toBeUndefined();
    expect(parseMomentId("proving-ground.00")).toBeUndefined();
    expect(parseMomentId("proving-ground.01.02")).toBeUndefined();
    expect(parseMomentId("Proving.01")).toBeUndefined();
    expect(parseMomentId("crypt.wet-steps")).toEqual({
      scene: "crypt",
      moment: "wet-steps",
      variants: [],
    });
    expect(parseMomentId("end.lit.01")).toEqual({ scene: "end", moment: "lit.01", variants: [] });
    expect(parseMomentId("crypt.cold-niche~no-bryn")?.variants).toEqual(["no-bryn"]);
    expect(privateHunterOf("end.lit.private.alpha")).toBe("alpha");
  });
});

describe("pack schema", () => {
  it("parses a pack and keeps a section it does not run", () => {
    const parsed = packSchema.parse(validPack());
    expect(parsed.pack_id).toBe("test");
    expect(parsed.choices).toEqual([{ id: "kept", label: "not run" }]);
    expect(parsed.stats.timing.marks).toBe("auto");
    expect(parsed.moments[2]?.target).toBe("storyboard");
  });

  it("rejects a player minimum above the maximum", () => {
    const pack = validPack();
    pack.players = { min: 4, max: 1 };
    expect(rules(pack)).toContain("V-1");
  });

  it("rejects a missing title and an unknown top-level field as V-1", () => {
    const { title, ...rest } = validPack();
    void title;
    expect(rules(rest)).toContain("V-1");
    expect(rules({ ...validPack(), bytes: "0a0b" })).toContain("V-1");
  });

  it("rejects a path used as an asset id (V-2)", () => {
    const pack = validPack();
    pack.assets[0] = { ...pack.assets[0], id: "../secret", type: "ambient", target: "storyboard" };
    pack.ambient.night.bed = "../secret";
    expect(rules(pack)).toContain("V-2");
  });

  it("rejects a missing asset and a cue name that is not in the pack (V-2)", () => {
    const pack = validPack();
    const cue = pack.cues[0];
    if (!cue) throw new Error("fixture");
    cue.screen = "fx.missing";
    expect(rules(pack)).toContain("V-2");
    const cues = validPack();
    const first = cues.moments[0];
    if (!first) throw new Error("fixture");
    first.cues = [{ cue: "no-such-cue", at: "start" }];
    expect(rules(cues)).toContain("V-2");
  });

  it("rejects a moment whose scene is not a set piece (V-3)", () => {
    const pack = validPack();
    const moment = pack.moments[0];
    if (!moment) throw new Error("fixture");
    moment.id = "other-scene.01";
    expect(rules(pack)).toContain("V-3");
  });

  it("accepts crypt. and end. moments without a set piece of that name (V-3)", () => {
    const pack = validPack();
    pack.moments.push(
      { id: "crypt.wet-steps", kind: "text-card" as const, target: "storyboard" },
      { id: "end.lit.01", kind: "text-card" as const, target: "storyboard" },
      {
        id: "end.lit.private.alpha",
        kind: "text-card" as const,
        target: "ipad:alpha",
        lines: [{ speaker: "alpha", text: "A last line.", voice: "vo.alpha-line" }],
      },
    );
    expect(rules(pack)).not.toContain("V-3");
    expect(packSchema.parse(pack).moments.map((moment) => moment.id)).toEqual(
      expect.arrayContaining(["crypt.wet-steps", "end.lit.01", "end.lit.private.alpha"]),
    );
  });

  it("rejects a set piece named crypt or end (V-3)", () => {
    const reserved = {
      night: "n1",
      site: { building: "fixed" },
      trigger: "enter-site",
      flow: [{ kind: "moment" as const }],
      outcome: { next: "done" },
    };
    const namedCrypt = validPack();
    namedCrypt.set_pieces.push({ ...reserved, id: "crypt" });
    expect(rules(namedCrypt)).toContain("V-3");
    const namedEnd = validPack();
    namedEnd.set_pieces.push({ ...reserved, id: "end" });
    expect(rules(namedEnd)).toContain("V-3");
  });

  it("keeps an optional positive hold_s on a cue", () => {
    const pack = validPack();
    const cue = pack.cues[0];
    if (!cue) throw new Error("fixture");
    pack.cues[0] = { ...cue, hold_s: 3 };
    expect(packSchema.parse(pack).cues[0]?.hold_s).toBe(3);
    pack.cues[0] = { ...cue, hold_s: 1.5 };
    expect(packSchema.parse(pack).cues[0]?.hold_s).toBe(1.5);

    const refused = validPack();
    const bad = refused.cues[0];
    if (!bad) throw new Error("fixture");
    refused.cues[0] = { ...bad, hold_s: 0 };
    expect(rules(refused)).toContain("V-1");
    refused.cues[0] = { ...bad, hold_s: -1 };
    expect(rules(refused)).toContain("V-1");
  });

  it("rejects a private moment on the story board and an unknown hunter (V-4)", () => {
    const pack = validPack();
    const moment = pack.moments[1];
    if (!moment) throw new Error("fixture");
    moment.target = "storyboard";
    expect(rules(pack)).toContain("V-4");
    const unknown = validPack();
    const privateMoment = unknown.moments[1];
    if (!privateMoment) throw new Error("fixture");
    privateMoment.id = "proving-ground.02.private.ghost";
    privateMoment.target = "ipad:ghost";
    expect(rules(unknown)).toContain("V-4");
  });

  it("rejects an absence variant for a hunter the pack does not declare (V-5)", () => {
    const pack = validPack();
    const moment = pack.moments[2];
    if (!moment) throw new Error("fixture");
    moment.id = "proving-ground.01~no-ghost";
    expect(rules(pack)).toContain("V-5");
  });

  it("rejects a story cue that moves drums (V-8)", () => {
    const pack = validPack();
    const cue = pack.cues[0];
    if (!cue) throw new Error("fixture");
    cue.drums = "top";
    expect(rules(pack)).toContain("V-8");
    cue.base_game = true;
    expect(rules(pack)).not.toContain("V-8");
  });

  it("rejects an unseeded random and accepts seed(table) (V-20)", () => {
    expect(randomnessIssue("a random draw")).toMatch(/^V-20/);
    expect(randomnessIssue("seed(box-count) = 3")).toBeUndefined();
    const pack = validPack();
    const night = pack.nights[0];
    if (!night) throw new Error("fixture");
    night.end = "random end";
    expect(rules(pack)).toContain("V-20");
  });
});

describe("manifest fields", () => {
  const metadata = () => ({
    pack_id: "dracula",
    title: "The Count of Vellmoor",
    version: "0.1.0",
    engine_min: "0.1.0",
  });
  const length = (options: string[], value = "standard") => ({
    id: "length",
    label: "Length",
    options: options.map((id) => ({ id, label: id })),
    default: value,
  });

  it("gives a pack the optional tower default and no settings", () => {
    const parsed = packSchema.parse(validPack());
    expect(parsed.tower).toBe("optional");
    expect(parsed.settings).toEqual([]);
    expect(parsed.playable).toBe(true);
    expect(parsed.tagline).toBeUndefined();
  });

  it("accepts a tagline of 1 to 200 characters and rejects an empty or longer one", () => {
    expect(rules({ ...validPack(), tagline: "A bell." })).toEqual([]);
    expect(rules({ ...validPack(), tagline: "" })).toContain("V-1");
    expect(rules({ ...validPack(), tagline: "x".repeat(201) })).toContain("V-1");
  });

  it("accepts the three tower values and rejects any other", () => {
    for (const tower of ["required", "optional", "none"]) {
      expect(rules({ ...validPack(), tower })).toEqual([]);
    }
    expect(rules({ ...validPack(), tower: "maybe" })).toContain("V-1");
  });

  it("accepts a cover directly inside assets/ and rejects a path outside it", () => {
    expect(rules({ ...validPack(), cover: "assets/cover.png" })).toEqual([]);
    expect(rules({ ...validPack(), cover: "assets/cover.webp" })).toEqual([]);
    expect(rules({ ...validPack(), cover: "cover.png" })).toContain("V-1");
    expect(rules({ ...validPack(), cover: "../cover.png" })).toContain("V-1");
    expect(rules({ ...validPack(), cover: "assets/sub/cover.png" })).toContain("V-1");
    expect(rules({ ...validPack(), cover: "assets/cover.gif" })).toContain("V-1");
  });

  it("accepts a length setting whose options are in lengths, with a default that is one of them", () => {
    const pack = {
      ...validPack(),
      lengths: ["short", "standard"],
      settings: [length(["short", "standard"])],
    };
    expect(rules(pack)).toEqual([]);
  });

  it("rejects a length option outside lengths (V-1)", () => {
    const pack = { ...validPack(), settings: [length(["standard", "long"])] };
    expect(rules(pack)).toContain("V-1");
  });

  it("rejects a setting whose default is not one of its options (V-1)", () => {
    const pack = { ...validPack(), settings: [length(["standard"], "long")] };
    expect(rules(pack)).toContain("V-1");
  });

  it("rejects a difficulty option that the pack does not list (V-1)", () => {
    const difficulty = {
      id: "difficulty",
      label: "Difficulty",
      options: [{ id: "brutal", label: "Brutal" }],
      default: "brutal",
    };
    expect(rules({ ...validPack(), settings: [difficulty] })).toContain("V-1");
  });

  it("caps settings, options per setting and id length at what the board and device states carry (V-1)", () => {
    /** A free setting (not length or difficulty), `options` long, with ids padded to `idLength`. */
    const free = (id: string, options: number, idLength = 2) => {
      const ids = Array.from({ length: options }, (_, index) => `o${index}`.padEnd(idLength, "x"));
      return {
        id,
        label: "Free",
        options: ids.map((option) => ({ id: option, label: option })),
        default: ids[0],
      };
    };
    const settings = (count: number) =>
      Array.from({ length: count }, (_, index) => free(`s${index}`, 1));
    expect(rules({ ...validPack(), settings: settings(SETTINGS_MAX) })).toEqual([]);
    expect(rules({ ...validPack(), settings: settings(SETTINGS_MAX + 1) })).toContain("V-1");
    expect(rules({ ...validPack(), settings: [free("lantern", SETTING_OPTIONS_MAX)] })).toEqual([]);
    expect(
      rules({ ...validPack(), settings: [free("lantern", SETTING_OPTIONS_MAX + 1)] }),
    ).toContain("V-1");
    const longId = "a".repeat(SETTING_ID_MAX);
    expect(rules({ ...validPack(), settings: [free(longId, 1, SETTING_ID_MAX)] })).toEqual([]);
    expect(rules({ ...validPack(), settings: [free(`${longId}a`, 1)] })).toContain("V-1");
    expect(rules({ ...validPack(), settings: [free("lantern", 1, SETTING_ID_MAX + 1)] })).toContain(
      "V-1",
    );
    // A metadata-only pack has the same limits.
    expect(
      packMetadataSchema.safeParse({
        pack_id: "vellmoor",
        title: "Vellmoor",
        version: "0.1.0",
        engine_min: "0.1.0",
        playable: false,
        settings: settings(SETTINGS_MAX + 1),
      }).success,
    ).toBe(false);
  });

  it("rejects two settings with the same id (V-1)", () => {
    const pack = {
      ...validPack(),
      lengths: ["standard"],
      settings: [length(["standard"]), length(["standard"])],
    };
    expect(rules(pack)).toContain("V-1");
  });

  it("rejects playable: false on the playable schema, which needs the full pack (V-1)", () => {
    expect(rules({ ...validPack(), playable: false })).toContain("V-1");
  });

  it("parses a metadata-only pack with the defaults filled in", () => {
    const parsed = packMetadataSchema.parse({
      ...metadata(),
      tagline: "The Count has taken Lenka.",
      cover: "assets/cover.png",
      playable: false,
      settings: [length(["short", "standard", "long"])],
    });
    expect(parsed.playable).toBe(false);
    expect(parsed.tower).toBe("optional");
    expect(parsed.cover).toBe("assets/cover.png");
  });

  it("defaults a metadata-only pack to no settings and playable true", () => {
    const parsed = packMetadataSchema.parse(metadata());
    expect(parsed.settings).toEqual([]);
    expect(parsed.playable).toBe(true);
  });

  it("rejects a story field in a metadata-only pack", () => {
    expect(
      packMetadataSchema.safeParse({ ...metadata(), playable: false, hunters: [] }).success,
    ).toBe(false);
  });

  it("rejects a metadata-only length option outside the three lengths", () => {
    const parsed = packMetadataSchema.safeParse({
      ...metadata(),
      playable: false,
      settings: [length(["medium"])],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("setup steps", () => {
  const step = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    label: `Do ${id}.`,
    ...extra,
  });

  it("parses steps with an id, a label and an optional still illustration", () => {
    const pack = validPack();
    const parsed = packSchema.parse({
      ...pack,
      setup: [step("lay-out-board", { illustration: "fx.bell" }), step("ready-decks")],
    });
    expect(parsed.setup).toEqual([
      { id: "lay-out-board", label: "Do lay-out-board.", illustration: "fx.bell" },
      { id: "ready-decks", label: "Do ready-decks." },
    ]);
  });

  it("defaults to no steps", () => {
    const { setup: _unused, ...pack } = validPack();
    expect(packSchema.parse(pack).setup).toEqual([]);
  });

  it("rejects the old list of names, an empty label and an unknown field (V-1)", () => {
    expect(rules({ ...validPack(), setup: ["join"] })).toContain("V-1");
    expect(rules({ ...validPack(), setup: [{ id: "a", label: "" }] })).toContain("V-1");
    expect(rules({ ...validPack(), setup: [step("a", { image: "fx.bell" })] })).toContain("V-1");
  });

  it("rejects a step listed twice and a step the engine runs (V-1)", () => {
    expect(rules({ ...validPack(), setup: [step("a"), step("a")] })).toContain("V-1");
    for (const id of ["join", "party-join", "tower-volume-test"]) {
      expect(rules({ ...validPack(), setup: [step(id)] }), id).toContain("V-1");
    }
  });

  it("rejects an illustration that is not in the manifest (V-2) or is not a still (V-1)", () => {
    expect(rules({ ...validPack(), setup: [step("a", { illustration: "fx.missing" })] })).toContain(
      "V-2",
    );
    expect(rules({ ...validPack(), setup: [step("a", { illustration: "por.alpha" })] })).toEqual([
      "V-1",
    ]);
  });

  it("caps the step count and the id length at what a prompt id carries (V-1)", () => {
    const many = Array.from({ length: SETUP_STEPS_MAX + 1 }, (_, index) => step(`s${index}`));
    expect(rules({ ...validPack(), setup: many })).toContain("V-1");
    const longest = `s${"a".repeat(SETUP_STEP_ID_MAX - 1)}`;
    expect(rules({ ...validPack(), setup: [step(longest)] })).toEqual([]);
    expect(rules({ ...validPack(), setup: [step(`${longest}a`)] })).toContain("V-1");
  });
});
