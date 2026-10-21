import { buildFindIndex, type FindIndex, find } from "@dark-tower/workbench";
import { loadCards } from "./cards.ts";
import { loadDocs } from "./content.ts";
import { GAME_IDS } from "./ids.ts";

/** The find index over the cards and documents. */
export function getFindIndex(): FindIndex {
  const { cards } = loadCards();
  const docs = loadDocs();
  return buildFindIndex(
    cards.map((c) => ({ id: c.id, title: c.title, body: c.body })),
    docs.map((d) => ({ slug: d.slug, file: d.file, title: d.title, markdown: d.markdown })),
    GAME_IDS,
  );
}

/** Searches the cards and docs, like the pages do. */
export function searchGame(query: string, limit = 20) {
  return find(getFindIndex(), query, limit);
}
