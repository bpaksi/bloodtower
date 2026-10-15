import { describe, expect, it } from "vitest";
import {
  absentHuntersOf,
  packIssues,
  packSchema,
  parseMomentId,
  privateHunterOf,
  randomnessIssue,
  sceneOf,
} from "./index.ts";

interface Fixture {
  title: string;
  assets: Array<Record<string, unknown>>;
  ambient: { night: { bed: string; accents: string[]; interval_s: [number, number] } };
  cues: Array<Record<string, unknown>>;
  moments: Array<Record<string, unknown>>;
  nights: Array<{ end: string } & Record<string, unknown>>;
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
  setup: ["join"],
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
    expect(parseMomentId("Proving.01")).toBeUndefined();
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
