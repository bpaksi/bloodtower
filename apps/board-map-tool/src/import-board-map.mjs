// Reads the adjacency tables in research/game-design/board-map.md and writes src/starting-edges.json:
// one entry per pair of spaces, with unconfirmed (?) pairs marked. The draft
// gives no compass directions, so every starting edge begins under the cross (slot null).
// Run: node src/import-board-map.mjs
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const mapPath = join(here, "..", "..", "..", "research", "game-design", "board-map.md");
const { spaces } = JSON.parse(await readFile(join(here, "spaces.json"), "utf8"));

const clean = (s) =>
  s
    .replace(/\*\*/g, "")
    .replace(/\(.*?\)/g, "")
    .trim();
const byName = new Map(spaces.map((s) => [s.name, s.id]));
const unmatched = new Set();
const pairs = new Map();

function resolve(name) {
  // Notes in the draft sometimes prefix a name with its kingdom letter ("S The Throne").
  const bare = clean(name.split("—")[0])
    .replace(/\?+$/, "")
    .replace(/^[NESW] (?=\S)/, "")
    .trim();
  if (!bare || bare === "tower" || bare === "?") return null;
  const id = byName.get(bare);
  if (!id) unmatched.add(bare);
  return id ?? null;
}

// Each adjacency table row: | Space | Adjacent |
const lines = (await readFile(mapPath, "utf8")).split("\n");
let inAdjacency = false;
for (const line of lines) {
  if (line.startsWith("#### ")) inAdjacency = /adjacenc/i.test(line);
  else if (line.startsWith("## ") || line.startsWith("### ")) inAdjacency = false;
  if (!inAdjacency || !line.startsWith("|") || /^\|\s*(Space|---)/.test(line)) continue;
  // Drop parenthesised notes first: some hold a "|" that would split the cells.
  const cells = line
    .replace(/\([^)]*\)/g, "")
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());
  if (cells.length < 2) continue;
  const from = resolve(cells[0]);
  if (!from) {
    unmatched.add(`row: ${cells[0]}`);
    continue;
  }

  for (const part of cells[1].split(";").map((p) => p.trim())) {
    // "across … river → X" names neighbours across a river; rivers are not in the tool.
    const list = part
      .replace(/^(?:\?\s*)?across (?:.*? )?river\s*→\s*/i, "")
      .split(/[,/]/)
      .map((n) => n.trim())
      .filter(Boolean);
    for (const raw of list) {
      const to = resolve(raw);
      if (!to || to === from) continue;
      const unsure = /\?/.test(raw);
      const key = [from, to].sort().join("|");
      const seen = pairs.get(key) ?? { unsure: false };
      pairs.set(key, { unsure: seen.unsure || unsure });
    }
  }
}

const edges = [...pairs.entries()]
  .map(([key, v]) => {
    const [a, b] = key.split("|");
    return { a, b, unconfirmed: v.unsure };
  })
  .sort((x, y) => `${x.a}${x.b}`.localeCompare(`${y.a}${y.b}`));

await writeFile(
  join(here, "starting-edges.json"),
  JSON.stringify({ source: "research/game-design/board-map.md", edges }, null, 2) + "\n",
);
console.log(`${edges.length} edges, ${edges.filter((e) => e.unconfirmed).length} unconfirmed`);
if (unmatched.size) console.log("Names not matched to a space:", [...unmatched].join(" | "));
