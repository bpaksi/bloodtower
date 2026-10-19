# Game workbench (`game-workbench`)

| | |
|---|---|
| Purpose | A local, read-only website that shows the story-neutral Game Design Document in `research/game-design/`, and later its sketches, POC images, digital UI pieces and tower cues. Every piece has a stable kind-prefixed ID (`SCR-`, `UI-`, `CUE-`, `SND-`, `MEC-`, `IDEA-`, `SK-`, `EX-`, `Q-`). |
| Phase | Design |
| SDLC tier | Experiment (self-merge, no adversaries) |
| Status | Step 0: shell and first page, built ahead of the intent at Bob's request (2026-10-19). Intent `intent/0001-game-workbench.md` still to be written by Bob. |
| Disposable? | Yes. The content lives in `research/game-design/`; this app only displays it. |

Edits are made by asking Claude to change files in `research/game-design/`. The site never writes.

## Running on the Mac

```bash
pnpm install
pnpm --dir apps/game-workbench dev     # http://localhost:4797
```

`pnpm --dir apps/game-workbench build && pnpm --dir apps/game-workbench start` serves a production build on the same port. Pages read `research/game-design/` on every request, so a reload shows the latest files.

## Where things are

| Path | What |
|---|---|
| `src/web/app/` | Next.js pages: `/` (document cards) and `/doc/<file>` (one rendered document) |
| `src/web/lib/ids.ts` | The ID families and how an ID is recognised and classified |
| `src/web/lib/content.ts` | Reads and groups the design docs (the groups preview the planned reorg) |
| `src/web/lib/markdown.ts` | Renders a doc; IDs become copyable chips, sibling `.md` links stay inside the workbench |

## Plan

Step 0 (this): shell and first page. Step 1: reorganise `research/game-design/` (chapters, catalogs, visuals, all pieces numbered). Step 2: the full GDD browser (`/id/<ID>` pages, backlinks, search, live refresh, ID lint in `pnpm check`). Later: UI pieces gallery, tower cue library (simulated tower, optional play on the tower through tower-poc), sketchbook, flows.
