// Writes ~/Desktop/board-map.json (or DATA_FILE) from the board map, if there is none yet.
// Run: pnpm seed
import { access, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { startingDraft } from "./seed.mjs";

const path = process.env.DATA_FILE || join(homedir(), "Desktop", "board-map.json");

try {
  await access(path);
  console.error(`${path} already exists. Delete it first to start again from the board map.`);
  process.exit(1);
} catch {
  // no draft yet: write one
}
const draft = await startingDraft();
await mkdir(dirname(path), { recursive: true });
await writeFile(path, `${JSON.stringify(draft, null, 2)}\n`);
console.log(
  `Wrote ${path}: ${draft.regions.length} regions, ${Object.keys(draft.edges).length} pairs.`,
);
