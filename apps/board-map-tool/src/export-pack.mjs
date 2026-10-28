// Writes the base pack's board file from the board map file: `pnpm export-pack`.
// Reads ~/Desktop/board-map.json (DATA_FILE moves it) and writes packs/base/board/spaces.json
// (OUT moves it), then formats it with the repo's Biome so `pnpm check` passes.
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

await writeFile(output, `${JSON.stringify(board, null, 2)}\n`);
const biome = join(repoRoot, "node_modules", ".bin", "biome");
if (!existsSync(biome))
  fail(`wrote ${output}, but Biome is not installed; run pnpm install at the root`);
const formatted = spawnSync(biome, ["format", "--write", output], { encoding: "utf8" });
if (formatted.status !== 0) {
  fail(`wrote ${output}, but Biome could not format it:\n${formatted.stderr || formatted.stdout}`);
}
const pairs = board.spaces.reduce((n, s) => n + s.neighbours.length, 0) / 2;
console.log(`export-pack: wrote ${board.spaces.length} spaces and ${pairs} pairs to ${output}`);
