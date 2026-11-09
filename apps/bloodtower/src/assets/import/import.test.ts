import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildJob, workPathsFor } from "../index.ts";
import type { Io } from "../needs/cli.ts";
import { readIndex } from "../needs/deps.ts";
import { CAST, tempDir, writeStoryPack } from "../needs/fixtures.ts";
import { runImportCli } from "./cli.ts";
import { cacheFileFor, DEFAULT_TTS_MODEL, FAKE_TTS_MODEL } from "./seed.ts";
import { checkWav } from "./wav.ts";

const REPO_PACKS = resolve(import.meta.dirname, "../../../../../packs");
const FAKE = { ASSET_STUDIO_FAKE_PROVIDERS: "1" };

/** A canonical mono 16-bit 24 kHz WAV of `frames` frames; `fill` makes two files differ. */
const wav = (frames = 2400, fill = 1): Buffer => {
  const pcm = Buffer.alloc(frames * 2, fill);
  const head = Buffer.alloc(44);
  head.write("RIFF", 0);
  head.writeUInt32LE(36 + pcm.length, 4);
  head.write("WAVEfmt ", 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(24000, 24);
  head.writeUInt32LE(48000, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36);
  head.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([head, pcm]);
};

const SCRIPT = `- id: "funeral.01"
  lines:
    - {id: "funeral.01.vo-01", speaker: narrator, text: "The bell tolls."}
    - {id: "funeral.01.vo-02", speaker: guide, text: "Follow me."}
    - {id: "funeral.01.vo-03", speaker: guide, text: "Mind the step."}
    - {id: "funeral.01.vo-04", speaker: guide, text: "Wait here."}
    - {id: "funeral.01.vo-05", speaker: narrator, text: "Pause [pause 1] and go."}
`;

interface PocLine {
  id: string;
  speaker: string;
  text: string;
  bytes: Buffer;
}
const POC_LINES: PocLine[] = [
  { id: "funeral.01.vo-01", speaker: "narrator", text: "The bell tolls.", bytes: wav(2400, 1) },
  { id: "funeral.01.vo-02", speaker: "guide", text: "Follow me.", bytes: wav(2400, 2) },
  { id: "funeral.01.vo-03", speaker: "guide", text: "Mind the step.", bytes: wav(2400, 3) },
  // In the POC only: no such id in the script.
  { id: "enc-wine.01.vo-01", speaker: "marta", text: "Uncle?", bytes: wav(2400, 4) },
  // A matching id whose file is cut short.
  {
    id: "funeral.01.vo-04",
    speaker: "guide",
    text: "Wait here.",
    bytes: wav(2400, 5).subarray(0, 100),
  },
];

interface Fixture {
  packs: string;
  poc: string;
  work: string;
  config: string;
}

const fixture = (lines: PocLine[] = POC_LINES, script = SCRIPT): Fixture => {
  const packs = tempDir("packs");
  writeStoryPack(packs, "dracula", { files: { "cast.yaml": CAST, "script.yaml": script } });
  const poc = tempDir("poc");
  mkdirSync(join(poc, "assets", "audio", "lines"), { recursive: true });
  const manifest: Record<string, unknown> = {
    "funeral.01.sfx.door": { id: "funeral.01.sfx.door", type: "sfx", path: "audio/sfx/x.wav" },
  };
  for (const line of lines) {
    const path = `audio/lines/${line.id}.${line.speaker}.wav`;
    writeFileSync(join(poc, "assets", path), line.bytes);
    manifest[line.id] = {
      id: line.id,
      type: "line",
      path,
      text: line.text,
      speaker: line.speaker,
    };
  }
  writeFileSync(join(poc, "assets", "manifest.json"), JSON.stringify(manifest, null, 2));
  return { packs, poc, work: tempDir("work"), config: tempDir("config") };
};

const run = (
  argv: string[],
  f: Fixture,
  env: Record<string, string | undefined> = {},
  flags = true,
) => {
  let out = "";
  let err = "";
  const io: Io = {
    env: { ASSET_STUDIO_CONFIG_DIR: f.config, ...env },
    cwd: tempDir("cwd"),
    out: (t) => {
      out += t;
    },
    err: (t) => {
      err += t;
    },
  };
  const all = flags
    ? [...argv, "--work-folder", f.work, "--packs-dir", f.packs, "--poc-dir", f.poc]
    : argv;
  return { code: runImportCli(all, io), out, err };
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

const BIN = resolve(import.meta.dirname, "../node_modules/@asset-studio/cli/dist/bin/main.js");

/** The asset-studio bin with a whitelisted environment: no developer key is ever inherited. */
const render = (
  work: string,
  config: string,
  story: string,
  only: string,
  env: Record<string, string> = FAKE,
) =>
  spawnSync(
    process.execPath,
    [BIN, "render", join(work, story, "asset-job.json"), "--only", only, "--work-folder", work],
    {
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        ASSET_STUDIO_CONFIG_DIR: config,
        ...env,
      },
      encoding: "utf8",
    },
  );

const cachePath = (f: Fixture, line: PocLine, model: string): string => {
  const job = buildJob("dracula", { packsDir: f.packs }).job;
  const jobLine = job.lines.find((l) => l.id === line.id);
  const voice = job.cast.find((m) => m.id === jobLine?.speaker)?.voice;
  if (jobLine === undefined || voice === undefined) throw new Error(`no voice for ${line.id}`);
  const target = cacheFileFor(workPathsFor(f.work, "dracula").root, jobLine.text, voice, model);
  if ("reason" in target) throw new Error(target.reason);
  return target.file;
};

describe("IMP assets:import funeral", () => {
  it("IMP-1: prints matched 3, skipped 1, failed 1 with each reason; the source tree hash is unchanged", () => {
    const f = fixture();
    const before = snapshot(f.poc);
    const r = run(["funeral"], f, FAKE);
    expect(r.out).toContain("matched 3, skipped 1, failed 1");
    expect(r.out).toContain("skipped enc-wine.01.vo-01: no id match in script.yaml");
    expect(r.out).toMatch(/failed funeral\.01\.vo-04: corrupt WAV .*truncated data chunk/);
    expect(r.err).toContain("BT-IMPORT-5: funeral.01.vo-04");
    expect(r.code).toBe(1);
    expect(snapshot(f.poc)).toBe(before);
    for (const line of POC_LINES.slice(0, 3)) {
      expect(readFileSync(cachePath(f, line, FAKE_TTS_MODEL)).equals(line.bytes)).toBe(true);
    }
  });

  it("IMP-2: a second run leaves the work folder bytes identical and changes no status", {
    timeout: 60_000,
  }, () => {
    const f = fixture();
    run(["funeral"], f, FAKE);
    const first = snapshot(f.work);
    const again = run(["funeral"], f, FAKE);
    expect(again.out).toContain("matched 3, skipped 1, failed 1");
    expect(snapshot(f.work)).toBe(first);
    expect(readIndex(workPathsFor(f.work, "dracula"))).toEqual({});
    // After a render the drafts keep their status through a third run.
    expect(render(f.work, f.config, "dracula", "voice").status).toBe(0);
    const drafted = snapshot(f.work);
    const statuses = JSON.stringify(readIndex(workPathsFor(f.work, "dracula")));
    run(["funeral"], f, FAKE);
    expect(snapshot(f.work)).toBe(drafted);
    expect(JSON.stringify(readIndex(workPathsFor(f.work, "dracula")))).toBe(statuses);
  });

  it("IMP-3: a later render --only voice stores the imported audio as a draft with no provider call", {
    timeout: 60_000,
  }, () => {
    const f = fixture();
    run(["funeral"], f, FAKE);
    const seeded = POC_LINES[0] as PocLine;
    const r = render(f.work, f.config, "dracula", "voice");
    const paths = workPathsFor(f.work, "dracula");
    const index = readIndex(paths);
    expect(index[seeded.id]?.status).toBe("draft");
    // The master is the seeded audio re-wrapped, not the fake provider's tone.
    expect(readFileSync(join(paths.root, "masters", `${seeded.id}.wav`)).equals(seeded.bytes)).toBe(
      true,
    );
    expect(r.stdout).toContain("rendered");
  });

  it("IMP-4: a different model keys a different cache file; the default is the Gemini default", () => {
    const f = fixture();
    const real = run(["funeral"], f, {});
    expect(real.out).toContain(`voice model ${DEFAULT_TTS_MODEL}`);
    const other = run(["funeral", "--model", "other-model"], f, {});
    expect(other.out).toContain("voice model other-model");
    const dir = join(workPathsFor(f.work, "dracula").root, "tts-cache");
    expect(readdirSync(dir)).toHaveLength(6);
  });

  it("IMP-5: audio already in the tts-cache with other bytes is kept and reported, never overwritten", () => {
    const f = fixture();
    const first = POC_LINES[0] as PocLine;
    const file = cachePath(f, first, FAKE_TTS_MODEL);
    mkdirSync(dirname(file), { recursive: true });
    const rendered = wav(2400, 9);
    writeFileSync(file, rendered);
    const r = run(["funeral"], f, FAKE);
    expect(r.out).toContain("matched 2, skipped 2, failed 1");
    expect(r.out).toContain("skipped funeral.01.vo-01: tts-cache already holds different audio");
    expect(readFileSync(file).equals(rendered)).toBe(true);
  });

  it("IMP-6: a line whose text or speaker differs from the script, or that has pause markup, is skipped", () => {
    const lines: PocLine[] = [
      { id: "funeral.01.vo-01", speaker: "narrator", text: "Changed.", bytes: wav() },
      { id: "funeral.01.vo-02", speaker: "witness", text: "Follow me.", bytes: wav() },
      {
        id: "funeral.01.vo-05",
        speaker: "narrator",
        text: "Pause [pause 1] and go.",
        bytes: wav(),
      },
    ];
    const f = fixture(lines);
    const r = run(["funeral"], f, FAKE);
    expect(r.out).toContain("matched 0, skipped 3, failed 0");
    expect(r.out).toContain("skipped funeral.01.vo-01: text differs from script.yaml");
    expect(r.out).toContain(
      "skipped funeral.01.vo-02: speaker witness in the POC, guide in the script",
    );
    expect(r.out).toMatch(/skipped funeral\.01\.vo-05: .*pause/);
    expect(r.code).toBe(0);
  });

  it("IMP-7: a repeated line is a silent caption, so it has no voiced job line and is skipped", () => {
    const script = `- id: "funeral.01"
  lines:
    - {id: "funeral.01.vo-01", speaker: guide, text: "Follow me."}
    - {id: "funeral.01.vo-02", speaker: guide, text: "Follow me."}
`;
    const lines: PocLine[] = [
      { id: "funeral.01.vo-01", speaker: "guide", text: "Follow me.", bytes: wav(2400, 1) },
    ];
    const r = run(["funeral"], fixture(lines, script), FAKE);
    expect(r.out).toContain("matched 0, skipped 1, failed 0");
    expect(r.out).toContain("skipped funeral.01.vo-01: no id match in script.yaml");
  });
});

describe("IMP assets:import test", () => {
  it("IMP-8: the four place paintings are drafts after the documented render --only picture", {
    timeout: 60_000,
  }, () => {
    const f = fixture();
    const argv = ["test", "--work-folder", f.work, "--packs-dir", REPO_PACKS];
    const r = run(argv, f, FAKE, false);
    expect(r.out).toContain("matched 4, skipped 0, failed 0");
    expect(r.code).toBe(0);
    // Import wrote the job and nothing else; the render step makes the drafts.
    expect(readdirSync(join(f.work, "test"))).toEqual(["asset-job.json"]);
    render(f.work, f.config, "test", "picture");
    const index = readIndex(workPathsFor(f.work, "test"));
    const places = Object.keys(index)
      .filter((id) => id.startsWith("place."))
      .sort();
    expect(places).toEqual(["place.bazaar", "place.citadel", "place.sanctuary", "place.village"]);
    for (const id of places) expect(index[id]?.status).toBe("draft");
  });
});

describe("IMP failures write nothing", () => {
  it("IMP-9: a missing script is BT-IMPORT-2", () => {
    const f = fixture();
    const empty = tempDir("nopacks");
    mkdirSync(join(empty, "dracula"));
    const r = run(
      ["funeral", "--work-folder", f.work, "--packs-dir", empty, "--poc-dir", f.poc],
      f,
      FAKE,
      false,
    );
    expect(r.code).toBe(1);
    expect(r.err).toContain("BT-IMPORT-2");
    expect(readdirSync(f.work)).toEqual([]);
  });

  it("IMP-10: a missing POC source is BT-IMPORT-3", () => {
    const f = fixture();
    const r = run(
      ["funeral", "--work-folder", f.work, "--packs-dir", f.packs, "--poc-dir", tempDir("none")],
      f,
      FAKE,
      false,
    );
    expect(r.code).toBe(1);
    expect(r.err).toContain("BT-IMPORT-3");
    expect(readdirSync(f.work)).toEqual([]);
  });

  it("IMP-11: no work folder is AS-CONFIG-1 and nothing is read or written", () => {
    const f = fixture();
    const before = snapshot(f.packs);
    const r = run(["funeral", "--packs-dir", f.packs, "--poc-dir", f.poc], f, FAKE, false);
    expect(r.code).not.toBe(0);
    expect(r.err).toContain("AS-CONFIG-1");
    expect(snapshot(f.packs)).toBe(before);
    expect(readdirSync(f.config)).toEqual([]);
  });

  it("IMP-12: an unknown source or option is a BT-IMPORT-1 usage error, exit 2", () => {
    const f = fixture();
    for (const argv of [["nope"], [], ["funeral", "--bogus"], ["funeral", "test"]]) {
      const r = run(argv, f, FAKE);
      expect(r.code).toBe(2);
      expect(r.err).toContain("BT-IMPORT-1");
    }
    expect(readdirSync(f.work)).toEqual([]);
  });
});

describe("IMP the render reuses the seed with the fakes off", () => {
  // The spike: a placeholder key, no network (a preload makes `fetch` throw), the default model.
  // Needs afconvert, the real m4a converter, so it runs on macOS only.
  it.skipIf(process.platform !== "darwin")(
    "IMP-13: render --only voice reuses the seeded audio with no provider call",
    { timeout: 60_000 },
    () => {
      const script = `- id: "funeral.01"
  lines:
    - {id: "funeral.01.vo-01", speaker: narrator, text: "The bell tolls."}
`;
      const lines = [POC_LINES[0] as PocLine];
      const f = fixture(lines, script);
      expect(run(["funeral"], f, {}).out).toContain("matched 1, skipped 0, failed 0");
      const preload = join(tempDir("preload"), "no-fetch.mjs");
      writeFileSync(
        preload,
        'globalThis.fetch = () => { throw new Error("network call attempted"); };\n',
      );
      const r = render(f.work, f.config, "dracula", "voice", {
        GEMINI_API_KEY: "placeholder-not-a-key",
        NODE_OPTIONS: `--import=${preload}`,
      });
      expect(r.stderr).not.toContain("network call attempted");
      expect(r.status).toBe(0);
      const index = readIndex(workPathsFor(f.work, "dracula"));
      expect(index["funeral.01.vo-01"]?.status).toBe("draft");
      expect(statSync(workPathsFor(f.work, "dracula").index).isFile()).toBe(true);
    },
  );
});

describe("checkWav", () => {
  it("IMP-14: accepts a whole 16-bit PCM WAV and names why it refuses others", () => {
    expect(checkWav(wav(10))).toEqual({ channels: 1, sampleRate: 24000, frames: 10 });
    expect(checkWav(Buffer.from("nope"))).toBe("shorter than a RIFF header");
    expect(checkWav(Buffer.alloc(64))).toBe("not a RIFF/WAVE file");
    expect(checkWav(wav(10).subarray(0, 50))).toBe("truncated data chunk");
    const float = wav(10);
    float.writeUInt16LE(3, 20);
    expect(checkWav(float)).toMatch(/not 16-bit PCM/);
  });
});

describe("IMP paid-call warning and symlinks", () => {
  it("IMP-15: the next line counts the voiced job lines a render would still send to the provider", () => {
    const f = fixture();
    const r = run(["funeral"], f, FAKE);
    // vo-01..03 are seeded; vo-04 (corrupt) and vo-05 (pause markup) are not.
    expect(r.out).toContain(
      "render --only voice would call gemini for 2 of 5 voiced lines (3 reuse the import)",
    );
    const again = run(["funeral"], f, FAKE);
    expect(again.out).toContain("for 2 of 5 voiced lines (3 reuse");
  });

  it("IMP-16: a manifest path that is a symlink out of the POC assets folder is failed, not read", () => {
    const f = fixture();
    const outside = join(tempDir("outside"), "secret.wav");
    writeFileSync(outside, wav(2400, 7));
    const link = join(f.poc, "assets", "audio", "lines", "funeral.01.vo-01.narrator.wav");
    rmSync(link);
    symlinkSync(outside, link);
    const r = run(["funeral"], f, FAKE);
    expect(r.out).toMatch(/failed funeral\.01\.vo-01: path .* leaves the POC assets folder/);
    expect(r.out).toContain("matched 2, skipped 1, failed 2");
  });
});
