# Bloodtower (`bloodtower`)

| | |
|---|---|
| Purpose | The real app: a story pack on the Story board, iPads joining by QR, first press wins, and a timing log. R1 connects to the tower and sends no effects. |
| Phase | Build |
| SDLC tier | Full |
| Status | R1 batch B2. Loader, timing log, session lock, tower port, Story board and device screens. The socket hub is the next batch. [plans/R1-step1-foundation.md](plans/R1-step1-foundation.md). [spec.md](spec.md). |
| Disposable? | No. |

The Mac runs this host. The Story board is a display-only page at `/board`. iPad join is `/join` and the device controls are `/device`. Those pages do not open a session socket yet (that is the next batch). tower-poc stays a sidecar on port 4747 (reuse-guide option A). This host does not open that connection and does not send a light, a sound or a drum.

## Where things are

| Path | What |
|---|---|
| `spec.md` | Decision log and traceability |
| `plans/` | Milestone plans |
| `docs/` | Notes that are not the spec |
| `src/web/`, `src/server/`, `src/protocols/` | Code parts, each its own package |
| `src/e2e/` | Playwright: phone and iPad on WebKit, desktop on Chromium |
| `data/` | SQLite files in the main checkout (gitignored). A worktree uses the `dataDir` in `.wt.json`. Created when the host starts. |
| `../../packs/test/` | The only pack R1 loads. A proving ground: four hunters, one night, one set piece. Not a Dracula pack. |

```bash
pnpm --dir apps/bloodtower pack:lint
```

That checks `packs/test`. `pnpm --dir apps/bloodtower pack:lint -- <dir>` checks another folder, and the path is resolved from the server package's working directory.

## Running on the Mac

From the repo root. One process serves the Story board. It binds `0.0.0.0:4787` unless `PORT` is set. It creates `apps/bloodtower/data/` on start (gitignored) and does not open a database until the hub batch.

The workspace root package is also named `bloodtower`, so `pnpm -F bloodtower` selects both and its `build` runs every app. `--dir apps/bloodtower` selects this app.

```bash
pnpm install
pnpm --dir apps/bloodtower build
pnpm --dir apps/bloodtower start
```

Open http://127.0.0.1:4787/ for the scaffold page, http://127.0.0.1:4787/board for the Story board, http://127.0.0.1:4787/join for join, and http://127.0.0.1:4787/device for the device controls. The board has no buttons. Join and device say the session host is unavailable until the hub lands.

The page has no buttons. Health is http://127.0.0.1:4787/health and reports `tower: "connection-only"` and `effects: "none"`.

A worktree reads ports, the SQLite folder and `packsDir` from `.wt.json` (`pnpm wt`). `PORT`, `DATA_DIR` and `PACKS_DIR` override those for one run. With no worktree file, packs are the repo's `packs/` directory.

These ports sit away from tower-poc (4747/4748) and the funeral POC (4767/4768).

## Other commands

```bash
cd apps/bloodtower
pnpm dev      # server (tsx watch, port 4787) + next dev on port 3000
pnpm build    # web static export
pnpm start    # one process serving the export; run pnpm build first
pnpm e2e      # Playwright on port 4788 (first time: pnpm -F bloodtower-e2e e2e:install)
```

`pnpm dev` is the split process for UI work. The page Bob opens is `pnpm start` after `pnpm build`.

To run tower-poc beside this app later, start it on 4747. This host does not start it and does not connect to it.
