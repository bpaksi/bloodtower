# Burgomaster's Funeral POC (`burgomaster-funeral-poc`)

| | |
|---|---|
| Purpose | Play `n2-burgomasters-funeral` on the Mac, the Dashboard and the hunters' devices, with cues as screen plus fallback audio |
| Phase | Build |
| SDLC tier | Full |
| Status | M1 in progress. The PRD (rev 5) is the intent. [plans/M1-funeral-poc.md](plans/M1-funeral-poc.md) |
| Disposable? | Yes, unless the scene engine is promoted. |

The Mac host owns the game. The Dashboard is the shared screen and plays the shared audio. Player devices join on the LAN and hold the hunters. This POC sends nothing to the tower; tower control is Phase 2.

## Where things are

| Path | What |
|---|---|
| `docs/PRD.md` | Product requirements, rev 5 (the intent until Bob writes `intent/`) |
| `spec.md` | Written by step 2. This step does not add the file. |
| `plans/` | Milestone plans |
| `assets/` | Manifest, script, stills, portraits, cue sheet. Read in place; do not move. |
| `src/web/`, `src/server/`, `src/protocols/` | Code parts, each its own package |
| `src/e2e/` | Playwright: phone and iPad on WebKit, desktop on Chromium |
| `data/` | SQLite files in the main checkout (gitignored). A worktree uses the `dataDir` in `.wt.json`. |

## Running the demo on macOS

From the repo root. One process serves the Dashboard, the join page, the WebSocket, and the asset files. SQLite is created under `apps/burgomaster-funeral-poc/data/` (gitignored).

```bash
pnpm install
pnpm -F burgomaster-funeral-poc demo
```

`demo` builds the static UI, then starts the host. Leave that terminal open. It prints three lines like these (the join code changes every start):

```text
Dashboard http://127.0.0.1:4767/dashboard
Join http://192.168.1.20:4767/join?code=048213
```

Open these:

| Who | URL |
|---|---|
| Dashboard, on this Mac | http://127.0.0.1:4767/dashboard |
| Door | http://127.0.0.1:4767/ |
| Phone or iPad on the same Wi-Fi | the `Join` URL printed in the terminal, or the QR code on the Dashboard |

The join URL uses this Mac's LAN address, so a phone or iPad on the same Wi-Fi can open it. `127.0.0.1` on the phone is the phone itself and will not reach the Mac. Scan the QR, or type the printed URL. The page also shows the numeric code. On the device, tap **Take all four**. On the Dashboard, **Begin** enables once all four hunters are held.

The host binds `0.0.0.0:4767` unless `PORT` is set. A worktree reads ports and the SQLite folder from `.wt.json` (`pnpm wt`). `DATA_DIR` overrides the folder for one run.

## Other commands

```bash
cd apps/burgomaster-funeral-poc
pnpm dev      # server (tsx watch, port 4767) + next dev on port 3000; the demo path is pnpm demo
pnpm build    # web static export
pnpm start    # one process serving the export; run pnpm build first
pnpm e2e      # Playwright on port 4768 (first time: pnpm -F burgomaster-funeral-poc-e2e e2e:install)
```

These ports sit away from tower-poc's 4747 and 4748.
