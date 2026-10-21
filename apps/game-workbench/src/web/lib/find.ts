import { buildFindIndex, type FindIndex, find, makeCached } from "@dark-tower/workbench";
import { dirStamp } from "@dark-tower/workbench/server";
import { cardsDir, loadCards } from "./cards.ts";
import { designDir, loadDocs } from "./content.ts";
import { GAME_IDS } from "./ids.ts";

function build(): FindIndex {
  const { cards } = loadCards();
  const docs = loadDocs();
  return buildFindIndex(
    cards.map((c) => ({ id: c.id, title: c.title, body: c.body })),
    docs.map((d) => ({ slug: d.slug, file: d.file, title: d.title, markdown: d.markdown })),
    GAME_IDS,
  );
}

/**
 * The find index, rebuilt only when a file in the cards or documents folder was added, removed or
 * changed, so an edit still shows on the next search.
 */
export const getFindIndex = makeCached(() => dirStamp([designDir(), cardsDir()]), build);

/** Searches the cards and docs. */
export function searchGame(query: string, limit = 20) {
  return find(getFindIndex(), query, limit);
}
