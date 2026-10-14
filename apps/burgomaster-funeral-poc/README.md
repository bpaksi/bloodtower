# Burgomaster's Funeral POC (`burgomaster-funeral-poc`)

| | |
|---|---|
| Purpose | Play `n2-burgomasters-funeral` on the Mac, the Dashboard and the hunters' devices, with cues as screen plus fallback audio |
| Phase | Build |
| SDLC tier | Full |
| Status | M1 in progress. The PRD (rev 4) is the intent. [plans/M1-funeral-poc.md](plans/M1-funeral-poc.md) |
| Disposable? | Yes, unless the scene engine is promoted. |

The Mac host owns the game. The Dashboard is the shared screen and plays the shared audio. Player devices join on the LAN and hold the hunters. This POC sends nothing to the tower; tower control is Phase 2.

## Where things are

| Path | What |
|---|---|
| `docs/PRD.md` | Product requirements, rev 4 (the intent until Bob writes `intent/`) |
| `spec.md` | Stub. Step 2 writes the spec. |
| `plans/` | Milestone plans |
| `assets/` | Manifest, script, stills, portraits, cue sheet. Read in place; do not move. |
| `src/web/`, `src/server/`, `src/protocols/` | Code parts, each its own package |
| `src/e2e/` | Playwright: phone and iPad on WebKit, desktop on Chromium |
| `data/` | SQLite files in the main checkout (gitignored). A worktree uses the `dataDir` in `.wt.json`. |

## Running

```bash
cd apps/burgomaster-funeral-poc
pnpm dev      # server (tsx watch, port 4767) + next dev
pnpm build    # web static export
pnpm start    # one process serving the export; run pnpm build first
pnpm e2e      # Playwright on port 4768 (first time: pnpm -F burgomaster-funeral-poc-e2e e2e:install)
```

Ports and the SQLite folder come from `.wt.json` in a worktree (`pnpm wt`). Otherwise the server binds 4767, Playwright uses 4768, and the database folder is `data/`. `PORT` and `DATA_DIR` override those for one run. `next dev` stays on port 3000, the same split as tower-poc. These ports sit away from tower-poc's 4747 and 4748.
