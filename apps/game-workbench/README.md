# Game workbench (`game-workbench`)

| | |
|---|---|
| Purpose | A local, read-only website that shows the story-neutral Game Design Document in `research/game-design/`, and later its sketches, POC images, digital UI pieces and tower cues. Every piece has a stable kind-prefixed ID (`SCR-`, `UI-`, `CUE-`, `SND-`, `MEC-`, `IDEA-`, `SK-`, `EX-`, `Q-`). |
| Phase | Design |
| SDLC tier | Experiment (self-merge, no adversaries) |
| Status | Steps 0, 0a, 0b done; backlog in `plans/plan.md`. Built ahead of the intent at Bob's request (2026-10-19). Intent `intent/0001-game-workbench.md` still to be written by Bob. |
| Disposable? | Yes. The content lives in `research/game-design/`; this app only displays it. |

Edits are made by asking Claude to change files in `research/game-design/`. The site never writes.

## Running on the Mac

```bash
pnpm install
pnpm --dir apps/game-workbench dev     # http://localhost:4797
```

`pnpm --dir apps/game-workbench build && pnpm --dir apps/game-workbench start` serves a production build on the same port. Pages read `research/game-design/` on every request, so a reload shows the latest files.

## Command line

```bash
pnpm graph gaps            # gaps in the card graph, by rule, then a line "N gaps" (same list as /gaps)
pnpm graph show <ID>       # a card or document ID: its text, links both ways with verbs and notes, sources
pnpm graph find <words>    # the hits the top-bar box shows (same list as GET /api/find)
```

Gaps are warnings; `pnpm check` does not fail on them.

## Where things are

The generic parts (ID schemes, markdown with chips, card parsing, graph, layout, prompt starter, focus graph, CSS) live in [`packages/workbench`](../../packages/workbench/), shared with story-workbench (decision [0002](../../research/decisions/0002-workbench-package.md)). This app holds the game design's config and pages.

| Path | What |
|---|---|
| `src/web/app/` | Next.js pages: `/` (focus graph of the cards), `/map` (areas and progress), `/sounds` (the 113 tower sounds with their feel, filtered by mood or reads-as), `/docs` (document cards) and `/doc/<file>` (one rendered document) |
| `src/web/lib/ids.ts` | The game ID families and how an ID is recognised and classified (`GAME_IDS`) |
| `src/web/lib/content.ts` | Reads and groups the design docs (the groups preview the planned reorg) |
| `src/web/lib/cards.ts` | The card schema for `research/game-design/cards/` (format in its README) and the graph; `cards.test.ts` is the card lint |
| `src/web/lib/graph-types.ts` | Card types, layers and verbs |
| `src/web/lib/prompt.ts` | The prompt starter's rules (`GAME_PROMPT`) |
| `src/web/lib/progress.ts` | Area progress for the map |
| `src/web/lib/gaps.ts`, `src/web/cli/graph.ts` | The gaps report (engine in `packages/workbench/src/gaps.ts`) and the `pnpm graph` entry point |

A card file that does not parse is left out and listed in a banner on every page; the card lint in `pnpm check` fails on it.

## Plan

The backlog and the steps are in [plans/plan.md](plans/plan.md). Asks for the workbench go there.
