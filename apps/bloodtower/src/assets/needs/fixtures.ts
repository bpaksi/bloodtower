import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/** A fresh temp folder. Tests build packs and work folders here, never in the repo. */
export const tempDir = (label: string): string =>
  mkdtempSync(join(tmpdir(), `bt-assets-${label}-`));

export interface FixtureOptions {
  /** Extra `assets:` rows, YAML flow maps, one per entry. */
  assets?: string[];
  /** Extra files, relative to the pack folder (`cast.yaml`, `script.yaml`, `camera/x.json`…). */
  files?: Record<string, string>;
  /** Replaces the `cover:` line. */
  cover?: string | null;
}

/** A small valid playable story pack with a cover, a legacy inline narrator line and `assets[]`. */
export const writeStoryPack = (
  root: string,
  story: string,
  options: FixtureOptions = {},
): string => {
  const dir = join(root, story);
  const cover = options.cover === null ? "" : `cover: ${options.cover ?? "assets/cover.png"}\n`;
  const assets = (options.assets ?? []).map((row) => `  - ${row}`).join("\n");
  const manifest = `format: 2
kind: story
pack_id: ${story}
title: Fixture
${cover}version: 0.1.0
engine_min: 0.1.0
base_pack: base
players: {min: 1, max: 4}
day:
  move_roll: {dice: 2d4, floor: 2, modifiers: false}
start:
  mode: one-per-kingdom-citadel
  assignments:
    - {hero: hero-a, kingdom: N}
chapters:
  - id: ch-one
    index: 1
    kingdoms: [N]
    start:
      effects:
        - kind: narrate
          target: storyboard
          lines:
            - {speaker: narrator, text: "A legacy caption."}
assets:${assets ? `\n${assets}` : " []"}
`;
  const files: Record<string, string> = {
    "pack.yaml": manifest,
    "assets/cover.png": "cover-bytes",
    "assets/a.jpg": "a-bytes",
    "assets/door.m4a": "door-bytes",
    ...options.files,
  };
  for (const [rel, data] of Object.entries(files)) {
    const file = join(dir, rel);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, data);
  }
  return dir;
};

/** Cast with a Loremaster, two speakers and one speaker who never gets a voiced line. */
export const CAST = `- id: narrator
  name: "Loremaster"
  voice: {provider: gemini-tts, name: Charon, style: "slow", audition: true}
  portrait: por.narrator
  anchor: {x: 0.5, y: 0.7}
- id: guide
  name: "Guide"
  voice: {provider: gemini-tts, name: Kore}
- id: witness
  name: "Witness"
`;

/** Script covering every rule: one fixed one-off line, a fill-in, repeats, a private line… */
export const SCRIPT = `- id: "seal-break.01"
  lines:
    - {id: "seal-break.01.vo-01", speaker: narrator, text: "The roads are clear, and a seal breaks."}
- id: "fixture.01"
  lines:
    - {id: "fixture.01.vo-01", speaker: guide, text: "Welcome."}
- id: "fixture.02"
  lines:
    - {id: "fixture.02.vo-01", speaker: guide, text: "Welcome, {hero}."}
    - {id: "fixture.02.vo-02", speaker: guide, text: "Follow me."}
    - {id: "fixture.02.vo-03", speaker: guide, text: "Follow me."}
    - {id: "fixture.02.vo-04", speaker: witness, text: "I saw nothing."}
- id: "fixture.03~no-guide"
  lines:
    - {id: "fixture.03~no-guide.vo-01", speaker: guide, text: "Alone now."}
- id: "fixture.04.private.guide"
  target: ipad:guide
  lines:
    - {id: "fixture.04.private.guide.vo-01", speaker: guide, note: "thought", text: "A secret."}
`;
