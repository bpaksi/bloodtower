import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { setCompleted } from "./model.mjs";
import { startingDraft } from "./seed.mjs";

const here = dirname(fileURLToPath(import.meta.url));
// Biome only formats files under the repo root, so the scratch folder sits in this app.
const dir = mkdtempSync(join(here, "..", ".export-pack-test-"));
after(() => rmSync(dir, { recursive: true, force: true }));

// The seeded map with every space completed is ready to export.
const spaces = JSON.parse(readFileSync(join(here, "spaces.json"), "utf8")).spaces;
const draft = await startingDraft();
for (const s of spaces) setCompleted(draft, s.id, true);
const dataFile = join(dir, "board-map.json");
writeFileSync(dataFile, JSON.stringify(draft));

// BIOME moves the Biome binary the script runs, so a missing or broken one can be tried.
function exportPack(name, biome) {
  const out = join(dir, `${name}.json`);
  const run = spawnSync(process.execPath, [join(here, "export-pack.mjs")], {
    encoding: "utf8",
    env: { ...process.env, DATA_FILE: dataFile, OUT: out, ...(biome ? { BIOME: biome } : {}) },
  });
  return { ...run, out };
}

test("with Biome missing, nothing is written and the message says so", () => {
  const run = exportPack("missing", join(dir, "no-such-biome"));
  assert.equal(run.status, 1, run.stdout);
  assert.match(run.stderr, /Biome is not installed/);
  assert.equal(existsSync(run.out), false, "spaces.json must not be written unformatted");
});

test("when Biome fails to spawn, the spawn error is shown", () => {
  const notExecutable = join(dir, "biome-not-executable");
  writeFileSync(notExecutable, "not a program\n", { mode: 0o644 });
  const run = exportPack("spawn-error", notExecutable);
  assert.equal(run.status, 1, run.stdout);
  assert.match(run.stderr, /EACCES/);
});

test("with the repo's Biome, the board is written and formatted", () => {
  const run = exportPack("ok");
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /wrote 60 spaces/);
  assert.equal(JSON.parse(readFileSync(run.out, "utf8")).spaces.length, 60);
});
