/**
 * Captures the Pick story list as the code at a git commit built it, for the EV-03 fixture
 * `src/e2e/tests/w3-pick-story.main.json` (C3-01).
 *
 *   pnpm -F bloodtower-server exec tsx scripts/captureMainPickStory.ts          # print the fixture
 *   pnpm -F bloodtower-server exec tsx scripts/captureMainPickStory.ts --write  # rewrite it
 *   pnpm -F bloodtower-server exec tsx scripts/captureMainPickStory.ts --check  # exit 1 on drift
 *
 * It unpacks `apps/bloodtower/src/{server,engine,protocols}` and `packs/` from BASE_COMMIT with
 * `git archive` (so no checkout moves), links each part's `node_modules` into the copy, then
 * runs that commit's own `loadStoryCatalog` over that commit's own packs. The list is the
 * catalog's raw order (the loader sorts stories by pack id), not the carousel's start order.
 * Nothing here runs in CI or in the browser tests; the fixture is the committed result.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** The PR base: the last `main` commit before C3-01 changed the loader (v1 loader still present). */
export const BASE_COMMIT = "39ee78a5c250c62f5f63c891f907a38c60a64acb";

export const FIXTURE_REL = "apps/bloodtower/src/e2e/tests/w3-pick-story.main.json";

export interface MainPickStoryFixture {
  source: {
    commit: string;
    derivation: string;
    script: string;
  };
  /** Raw catalog order: `loadStoryCatalog(packs).stories`, sorted by pack id. */
  stories: { id: string; title: string; playable: boolean }[];
}

const PARTS = ["server", "engine", "protocols"] as const;

const repoRoot = resolve(import.meta.dirname, "../../../../..");

const git = (args: string[]): Buffer =>
  execFileSync("git", ["-C", repoRoot, ...args], { maxBuffer: 256 * 1024 * 1024 });

const unpackBase = (into: string): void => {
  const tar = git([
    "archive",
    "--format=tar",
    BASE_COMMIT,
    "packs",
    ...PARTS.map((part) => `apps/bloodtower/src/${part}`),
  ]);
  execFileSync("tar", ["-x", "-C", into], { input: tar });
  const realSrc = join(repoRoot, "apps/bloodtower/src");
  const copySrc = join(into, "apps/bloodtower/src");
  const packageNames = new Map<string, string>();
  for (const part of PARTS) {
    const manifest = JSON.parse(readFileSync(join(copySrc, part, "package.json"), "utf8")) as {
      name: string;
    };
    packageNames.set(manifest.name, join(copySrc, part));
  }
  // Each part keeps its real dependencies; workspace parts point at the base copy, not at HEAD.
  for (const part of PARTS) {
    const realModules = join(realSrc, part, "node_modules");
    const copyModules = join(copySrc, part, "node_modules");
    mkdirSync(copyModules, { recursive: true });
    for (const entry of readdirSync(realModules)) {
      if (entry.startsWith(".")) continue;
      symlinkSync(packageNames.get(entry) ?? join(realModules, entry), join(copyModules, entry));
    }
  }
};

export const captureMainPickStory = async (): Promise<MainPickStoryFixture> => {
  const temp = mkdtempSync(join(tmpdir(), "w3-main-"));
  try {
    unpackBase(temp);
    const loader = join(temp, "apps/bloodtower/src/server/core/loadStories.ts");
    const mod = (await import(pathToFileURL(loader).href)) as {
      loadStoryCatalog: (dir: string) => {
        stories: { card: { id: string; title: string; playable: boolean } }[];
      };
    };
    const catalog = mod.loadStoryCatalog(join(temp, "packs"));
    return {
      source: {
        commit: BASE_COMMIT,
        derivation:
          "loadStoryCatalog(packs) from the base commit's own server code and packs, raw order",
        script: "apps/bloodtower/src/server/scripts/captureMainPickStory.ts",
      },
      stories: catalog.stories.map(({ card }) => ({
        id: card.id,
        title: card.title,
        playable: card.playable,
      })),
    };
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
};

const render = (fixture: MainPickStoryFixture): string => `${JSON.stringify(fixture, null, 2)}\n`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const captured = render(await captureMainPickStory());
  const file = join(repoRoot, FIXTURE_REL);
  if (process.argv.includes("--write")) {
    writeFileSync(file, captured);
    process.stdout.write(`wrote ${FIXTURE_REL}\n`);
  } else if (process.argv.includes("--check")) {
    if (!existsSync(file) || readFileSync(file, "utf8") !== captured) {
      process.stderr.write(`${FIXTURE_REL} differs from ${BASE_COMMIT}\n`);
      process.exit(1);
    }
    process.stdout.write(`${FIXTURE_REL} matches ${BASE_COMMIT}\n`);
  } else {
    process.stdout.write(captured);
  }
}
