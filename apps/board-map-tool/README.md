# Board map entry tool (`board-map-tool`)

| | |
|---|---|
| Purpose | Enter each space's neighbours, compass slots, terrain and region, and export the board map JSON the game reads |
| Phase | Build |
| SDLC tier | Experiment |
| Status | Built; awaiting Bob's use and review |
| Disposable? | Yes. The exported JSON is kept; the tool is not |

Intent: [intent/0001-board-map-tool.md](intent/0001-board-map-tool.md). Design: research/game-design cards DEC-234 to DEC-244, Q-147 (region names), IDEA-032.

## Run

From this folder (`apps/board-map-tool`), no root install needed:

```bash
pnpm install
pnpm dev
```

Open http://127.0.0.1:4790. The server listens on 127.0.0.1 only.

- **Draft:** every change is saved at once to `data/draft.json` (not in the export).
- **Export:** writes `packs-v2/base/board-map.json` at the repo root, and only when the checks show no errors (DEC-240).

## Data

- **Spaces:** `src/spaces.json`, the 60 spaces from research/game-design/board-map.md, with printed name, kingdom, terrain and building. Terrain can be changed in the tool.
- **Standalone:** the app is excluded from the root pnpm workspace, so the repo-wide `pnpm check` does not cover it.
- **Starting edges:** `src/starting-edges.json`, made from the adjacency tables in board-map.md by `node src/import-board-map.mjs`. It has 133 pairs with no compass slots yet, and 40 marked unconfirmed, as the draft marks them with `?`. A new draft starts with them.
- **Edges:** one edge per pair of spaces. Each side has its own compass slot; entering one side sets the opposite point on the other (DEC-234, DEC-235).
- **Contested slot:** a slot used by another neighbour is refused. Move that neighbour under the cross first, then save (DEC-236).
- **Regions:** named in the tool, numbered REG-01, REG-02 in order (DEC-242, DEC-243). Each space holds exactly one region.

## Checks

Errors block the export: a space with no region, a space with no neighbours, a slot used twice on one space. A region with no spaces is a warning.

## Commands

- `pnpm install`: install (the app has no dependencies; it has its own lockfile).
- `pnpm dev` or `pnpm start`: run the tool at http://127.0.0.1:4790.
- `pnpm test`: the model tests (`src/model.test.mjs`). `pnpm build` runs the same tests.
- `pnpm seed`: write `data/draft.json` from the board map, if there is no draft yet.
