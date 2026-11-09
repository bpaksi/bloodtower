import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readIndex } from "@asset-studio/cli";
import { describe, expect, it } from "vitest";
import { tempDir, writeStoryPack } from "../needs/fixtures.ts";
import { workPathsFor } from "../needs/job.ts";
import { runRender } from "../render/cli.ts";
import { gradientPng, RENDER_CAST, RENDER_SCRIPT } from "../render/fixtures.ts";
import type { SpawnFn, SpawnResult } from "../render/spawn.ts";
import { runRedo } from "./cli.ts";
import { runSequence } from "./sequence.ts";

const SKILL_DIR = join(import.meta.dirname, "../../../../../.claude/skills/bt-assets");

interface Setup {
  packs: string;
  workFolder: string;
  configDir: string;
}

const setup = (): Setup => {
  const packs = tempDir("packs");
  const dir = writeStoryPack(packs, "fx", {
    files: { "cast.yaml": RENDER_CAST, "script.yaml": RENDER_SCRIPT },
  });
  writeFileSync(join(dir, "assets/cover.png"), gradientPng());
  return { packs, workFolder: tempDir("work"), configDir: tempDir("config") };
};

/** Fake providers only, and a child environment from a whitelist: no key can reach it. */
const env = (s: Setup) => ({
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  ASSET_STUDIO_FAKE_PROVIDERS: "1",
  ASSET_STUDIO_CONFIG_DIR: s.configDir,
});

const render = async (s: Setup) => {
  let out = "";
  let err = "";
  const code = await runRender(
    ["fx", "--ai", "--packs-dir", s.packs, "--work-folder", s.workFolder],
    {
      env: env(s),
      cwd: tempDir("cwd"),
      out: (t) => {
        out += t;
      },
      err: (t) => {
        err += t;
      },
    },
  );
  return { code, out, err };
};

const redo = async (s: Setup, argv: string[], withWork = true) => {
  let out = "";
  let err = "";
  const code = await runRedo(
    [...argv, "--packs-dir", s.packs, ...(withWork ? ["--work-folder", s.workFolder] : [])],
    {
      env: env(s),
      cwd: tempDir("cwd"),
      out: (t) => {
        out += t;
      },
      err: (t) => {
        err += t;
      },
    },
  );
  return { code, out, err };
};

describe("A1-08: assets:redo", () => {
  it("writes the exact id and note through reject; a fake re-render makes a new draft and keeps the note", async () => {
    const s = setup();
    expect((await render(s)).code).toBe(0);
    const paths = workPathsFor(s.workFolder, "fx");
    const before = readIndex(paths)["glow.cover"] as { file: string };

    const note = "Make the glow tighter, and warmer.";
    const result = await redo(s, ["fx", "glow.cover", ...note.split(" ")]);
    expect(result.code).toBe(0);
    const rejected = readIndex(paths)["glow.cover"] as { status: string; notes: string[] };
    expect(rejected.status).toBe("rejected");
    expect(rejected.notes).toEqual([note]);
    expect((readIndex(paths)["painting.cover"] as { status: string }).status).toBe("draft");
    expect(JSON.parse(readFileSync(paths.notes, "utf8"))["glow.cover"]).toEqual([note]);

    expect((await render(s)).code).toBe(0);
    const again = readIndex(paths)["glow.cover"] as {
      status: string;
      notes: string[];
      file: string;
    };
    expect(again.status).toBe("draft");
    expect(again.notes).toEqual([note]);
    expect(again.file).not.toBe(before.file);
  }, 90000);

  it("fails on an unknown id without guessing the nearest name and changes nothing", async () => {
    const s = setup();
    await render(s);
    const paths = workPathsFor(s.workFolder, "fx");
    const index = readFileSync(paths.index, "utf8");
    const result = await redo(s, ["fx", "glow.cove", "tighter"]);
    expect(result.code).not.toBe(0);
    expect(result.err).toContain("AS-ID-1");
    expect(readFileSync(paths.index, "utf8")).toBe(index);
  }, 60000);

  it("fails on an unknown story with A1-26 and writes nothing", async () => {
    const s = setup();
    const result = await redo(s, ["fy", "glow.cover", "tighter"]);
    expect(result.code).toBe(1);
    expect(result.err).toContain("A1-26");
    expect(readdirSync(s.workFolder)).toEqual([]);
  });

  it("fails with A1-27 when the story has no job yet, and AS-CONFIG-1 with no work folder", async () => {
    const s = setup();
    const noJob = await redo(s, ["fx", "glow.cover", "tighter"]);
    expect(noJob.err).toContain("A1-27");
    const cwd = tempDir("cwd");
    let err = "";
    const code = await runRedo(["fx", "glow.cover", "tighter", "--packs-dir", s.packs], {
      env: { PATH: process.env.PATH, ASSET_STUDIO_CONFIG_DIR: s.configDir },
      cwd,
      out: () => {},
      err: (t) => {
        err += t;
      },
    });
    expect(code).not.toBe(0);
    expect(err).toContain("AS-CONFIG-1");
    expect(readdirSync(cwd)).toEqual([]);
  });

  it("refuses to redo a final asset with A1-28 unless --final is given, then warns", async () => {
    const s = setup();
    await render(s);
    const paths = workPathsFor(s.workFolder, "fx");
    const index = JSON.parse(readFileSync(paths.index, "utf8"));
    index["glow.cover"].status = "final";
    writeFileSync(paths.index, JSON.stringify(index));
    const before = readFileSync(paths.index, "utf8");

    const refused = await redo(s, ["fx", "glow.cover", "tighter"]);
    expect(refused.code).toBe(1);
    expect(refused.err).toContain("A1-28");
    expect(refused.err).toContain("drops it from the next pack");
    expect(refused.err).toContain("pays for it again");
    expect(refused.err).toContain("--final");
    expect(readFileSync(paths.index, "utf8")).toBe(before);

    const allowed = await redo(s, ["fx", "glow.cover", "tighter", "--final"]);
    expect(allowed.code).toBe(0);
    expect(allowed.err).toContain("warning A1-28");
    expect((readIndex(paths)["glow.cover"] as { status: string }).status).toBe("rejected");
  }, 60000);

  it("rejects an unknown option instead of folding it into the note", async () => {
    const s = setup();
    await render(s);
    const paths = workPathsFor(s.workFolder, "fx");
    const before = readFileSync(paths.index, "utf8");
    const result = await redo(s, ["fx", "glow.cover", "--verbose", "tighter"]);
    expect(result.code).toBe(2);
    expect(result.err).toContain("Unknown option --verbose");
    expect(result.err).toContain("Usage: assets:redo");
    expect(readFileSync(paths.index, "utf8")).toBe(before);
  }, 60000);

  it("needs a story, an id and a note", async () => {
    const s = setup();
    for (const argv of [[], ["fx"], ["fx", "glow.cover"]]) {
      const result = await redo(s, argv);
      expect(result.code).toBe(2);
      expect(result.err).toContain("Usage: assets:redo");
    }
  });
});

describe("A1-08a/b: the needs -> render -> pack order", () => {
  const spawnWith = (failAt?: string, stderr = "") => {
    const calls: string[][] = [];
    const spawn: SpawnFn = async (command, args) => {
      calls.push([command, ...args]);
      const failed = failAt !== undefined && args[0] === failAt;
      const result: SpawnResult = {
        code: failed ? 1 : 0,
        stdout: "",
        stderr: failed ? stderr : "",
      };
      return result;
    };
    return { calls, spawn };
  };
  const io = (spawn: SpawnFn) => {
    let err = "";
    return {
      io: { env: {}, cwd: "/nowhere", out: () => {}, err: (t: string) => (err += t), spawn },
      errText: () => err,
    };
  };

  it("runs the three commands in order for one story, asked-once mode on render only", async () => {
    const f = spawnWith();
    const r = io(f.spawn);
    const result = await runSequence({ story: "fx", ai: true }, r.io);
    expect(result.exitCode).toBe(0);
    expect(f.calls).toEqual([
      ["pnpm", "assets:needs", "fx"],
      ["pnpm", "assets:render", "fx", "--ai"],
      ["pnpm", "assets:pack", "fx"],
    ]);
    const studio = spawnWith();
    await runSequence({ story: "fx", ai: false }, io(studio.spawn).io);
    expect(studio.calls[1]).toEqual(["pnpm", "assets:render", "fx"]);
  });

  it("passes --drafts only when asked", async () => {
    const f = spawnWith();
    await runSequence({ story: "fx", ai: false, drafts: true }, io(f.spawn).io);
    expect(f.calls[2]).toEqual(["pnpm", "assets:pack", "fx", "--drafts"]);
  });

  for (const [at, code, later] of [
    ["assets:needs", "A1-3", ["assets:render", "assets:pack"]],
    ["assets:render", "AS-VOICE-5", ["assets:pack"]],
    ["assets:pack", "A1-23", []],
  ] as const) {
    it(`stops at a failed ${at}, skips the later commands and shows ${code}`, async () => {
      const f = spawnWith(at, `${code}: something went wrong\n`);
      const r = io(f.spawn);
      const result = await runSequence({ story: "fx", ai: true }, r.io);
      expect(result.exitCode).toBe(1);
      expect(result.failed).toEqual({ command: at, exit: 1, code });
      const names = f.calls.map((c) => c[1]);
      for (const skipped of later) expect(names).not.toContain(skipped);
      expect(names.at(-1)).toBe(at);
      expect(r.errText()).toContain(code);
    });
  }

  it("shows a spawn failure instead of swallowing it", async () => {
    const r = io(async () => {
      throw new Error("spawn pnpm ENOENT");
    });
    const result = await runSequence({ story: "fx", ai: false }, r.io);
    expect(result.exitCode).toBe(1);
    expect(r.errText()).toContain("spawn pnpm ENOENT");
  });
});

/** What would approve an asset: a call, a property access, an import, the CLI verb or a script. */
const APPROVE =
  /\bapprove\s*\(|\[\s*["']approve["']\s*\]|\bapprove\b[^\n]*\bfrom\b|assets:approve|asset-studio approve|["'`]approve["'`]/;

/** `--final` is allowed only on an `assets:redo` line, the person's own flag for a final asset. */
const badFinal = (text: string): boolean =>
  text.split("\n").some((line) => line.includes("--final") && !line.includes("assets:redo"));

describe("A1-08: the skill never marks anything final", () => {
  it("would catch each form of an approve call", () => {
    for (const sample of [
      "approve(job, paths, id)",
      "asset.approve (job)",
      'cli["approve"](job)',
      "cli['approve'](job)",
      'spawn(bin, ["approve", job, id])',
      "import { approve } from '@asset-studio/cli'",
      "pnpm assets:approve fx id",
      "asset-studio approve job id",
    ]) {
      expect(APPROVE.test(sample), sample).toBe(true);
    }
    expect(APPROVE.test("the studio approval is Bob's")).toBe(false);
    expect(badFinal("pnpm assets:redo fx id note --final")).toBe(false);
    expect(badFinal("pnpm assets:pack fx --final")).toBe(true);
  });

  it("has a SKILL.md, no approve call and no stray --final in the skill folder or the redo code", () => {
    expect(existsSync(join(SKILL_DIR, "SKILL.md"))).toBe(true);
    const files = [
      ...readdirSync(SKILL_DIR, { recursive: true, withFileTypes: true })
        .filter((e) => e.isFile())
        .map((e) => join(e.parentPath, e.name)),
      ...readdirSync(import.meta.dirname)
        .filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts") && n !== "cli.ts")
        .map((n) => join(import.meta.dirname, n)),
      join(import.meta.dirname, "cli.ts"),
    ];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(APPROVE.test(text), file).toBe(false);
      if (!file.endsWith("redo/cli.ts")) expect(badFinal(text), file).toBe(false);
    }
  });

  it("SKILL.md lists assets:needs, assets:render, assets:pack in that order", () => {
    const text = readFileSync(join(SKILL_DIR, "SKILL.md"), "utf8");
    const at = ["assets:needs", "assets:render", "assets:pack"].map((c) =>
      text.indexOf(`pnpm ${c}`),
    );
    expect(at.every((n) => n >= 0)).toBe(true);
    expect(at).toEqual([...at].sort((a, b) => a - b));
  });

  it("SKILL.md tells the agent to re-render in the asset's own mode after a redo", () => {
    const text = readFileSync(join(SKILL_DIR, "SKILL.md"), "utf8");
    expect(text).toMatch(/same mode the asset came from/);
    expect(text).toMatch(/without `--ai`/);
    expect(text).toMatch(/`assets:render --ai`/);
    expect(text).toMatch(/made 0 for that id, say so plainly/);
  });

  it("front matter names the skill and its triggers", () => {
    const text = readFileSync(join(SKILL_DIR, "SKILL.md"), "utf8");
    expect(text).toMatch(/^---\nname: bt-assets\ndescription: .+\n---\n/);
  });
});
