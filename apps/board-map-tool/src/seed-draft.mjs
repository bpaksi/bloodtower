// Writes data/draft.json from the board map, if there is no draft yet. Run: pnpm -F board-map-tool seed
import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startingDraft } from "./seed.mjs";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const path = join(appDir, "data", "draft.json");

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
