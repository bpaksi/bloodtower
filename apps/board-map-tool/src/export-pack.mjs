// Writes the base pack's board file from the board map file: `pnpm export-pack`.
// Reads ~/Desktop/board-map.json (DATA_FILE moves it) and writes packs/base/board/spaces.json
// (OUT moves it), then formats it with the repo's Biome (BIOME moves it) so `pnpm check` passes.
// Biome is checked before anything is written, so a missing Biome never leaves an unformatted file.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDraft } from "./model.mjs";
import { toPackBoard } from "./pack-board.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const input = process.env.DATA_FILE || join(homedir(), "Desktop", "board-map.json");
const output = process.env.OUT || join(repoRoot, "packs", "base", "board", "spaces.json");

function fail(message) {
  console.error(`export-pack: ${message}`);
  process.exit(1);
}

const spaces = JSON.parse(await readFile(join(here, "spaces.json"), "utf8")).spaces;
let text;
try {
  text = await readFile(input, "utf8");
} catch (err) {
  fail(`could not read ${input} (${err.message})`);
}
const { draft, problems: loadProblems } = parseDraft(text, spaces);
if (!draft) fail(`${input}: ${loadProblems.join("; ")}`);
if (loadProblems.length)
  fail(`${input} has entries the tool drops:\n  ${loadProblems.join("\n  ")}`);

const { board, problems } = toPackBoard(draft, spaces);
if (!board) fail(`the map is not ready:\n  ${problems.join("\n  ")}`);

const biome = process.env.BIOME || join(repoRoot, "node_modules", ".bin", "biome");
if (!existsSync(biome))
  fail(`Biome is not installed at ${biome}; run pnpm install at the root. Nothing was written`);

await writeFile(output, `${JSON.stringify(board, null, 2)}\n`);
const formatted = spawnSync(biome, ["format", "--write", output], { encoding: "utf8" });
if (formatted.error) {
  fail(
    `wrote ${output}, but Biome could not start (${formatted.error.message}); the file is unformatted`,
  );
}
if (formatted.status !== 0) {
  const why = formatted.stderr || formatted.stdout || `exit status ${formatted.status}`;
  fail(`wrote ${output}, but Biome could not format it; the file is unformatted:\n${why}`);
}
const pairs = board.spaces.reduce((n, s) => n + s.neighbours.length, 0) / 2;
console.log(`export-pack: wrote ${board.spaces.length} spaces and ${pairs} pairs to ${output}`);
