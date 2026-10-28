// Builds a fresh draft: the three region names (Q-147) and the adjacency from board-map.md
// (src/starting-edges.json, made by import-board-map.mjs). Used when no draft exists yet.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { addRegion, emptyDraft, setEdge } from "./model.mjs";

const here = dirname(fileURLToPath(import.meta.url));
export const startingRegions = ["The Great Woods", "Regal Run", "Long Water"];

export async function startingDraft() {
  const spaces = JSON.parse(await readFile(join(here, "spaces.json"), "utf8")).spaces;
  const { edges } = JSON.parse(await readFile(join(here, "starting-edges.json"), "utf8"));
  const draft = emptyDraft();
  for (const name of startingRegions) addRegion(draft, name);
  for (const e of edges) {
    const note = e.unconfirmed ? "unconfirmed on the board map draft" : "";
    setEdge(draft, spaces, { from: e.a, to: e.b, slot: null, note });
  }
  return draft;
}
