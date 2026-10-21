import { buildFindIndex, find } from "@dark-tower/workbench";
import { loadCards } from "./cards.ts";
import { loadDocs } from "./content.ts";
import { GAME_IDS } from "./ids.ts";

/** Reads cards and docs fresh and searches them, like the pages do. */
export function searchGame(query: string, limit = 20) {
  const { cards } = loadCards();
  const docs = loadDocs();
  const index = buildFindIndex(
    cards.map((c) => ({ id: c.id, title: c.title, body: c.body })),
    docs.map((d) => ({ slug: d.slug, file: d.file, title: d.title, markdown: d.markdown })),
    GAME_IDS,
  );
  return find(index, query, limit);
}
