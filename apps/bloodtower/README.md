# Bloodtower (`bloodtower`)

| | |
|---|---|
| Purpose | The real app: a story pack on the Story board, iPads joining by QR, first press wins, and a timing log. R1 connects to the tower and sends no effects. |
| Phase | Build |
| SDLC tier | Full |
| Status | R1 batch B3. The socket hub joins the Story board and the devices to one session. [plans/R1-step1-foundation.md](plans/R1-step1-foundation.md). [spec.md](spec.md). |
| Disposable? | No. |

The Mac runs this host. The Story board is a display-only page at `/board`. iPad join is `/join` and the device controls are `/device`. Those pages open `/ws` on this host. tower-poc stays a sidecar on port 4747 (reuse-guide option A). This host uses a mock tower unless `TOWER_URL` points at that sidecar. It does not connect until a joined device presses connect, and it does not send a light, a sound or a drum.

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
| `../../packs/dracula/` | "The Count of Vellmoor": metadata only (`playable: false`). Listed on Pick Story as a card that cannot be chosen yet; its other files are not read. |

```bash
pnpm --dir apps/bloodtower pack:lint
```

That checks `packs/test`. `pnpm --dir apps/bloodtower pack:lint -- <dir>` checks another folder, and the path is resolved from the server package's working directory.

## Running on the Mac

From the repo root. One process serves the Story board and the session socket. It binds `0.0.0.0:4787` unless `PORT` is set. It creates `apps/bloodtower/data/` on start (gitignored) and opens `session.sqlite` there.

The workspace root package is also named `bloodtower`, so `pnpm -F bloodtower` selects both and its `build` runs every app. `--dir apps/bloodtower` selects this app.

```bash
pnpm install
pnpm --dir apps/bloodtower build
pnpm --dir apps/bloodtower start
```

Open http://127.0.0.1:4787/ for the title page, then **Story board** for the Mac/TV display (no buttons; the join code and QR come from the session) or **Hunter** on an iPad for `/join` (type the six-digit code from the board if the QR is not used). With a code in the URL, the iPad shows "Game is loading..." and enters Tower Connect on `/device`. Hunters are claimed on Party Join. The QR points at the Mac's LAN address, which the startup log prints. If the log warns that only loopback is available, connect the Mac to Wi-Fi and restart; the board shows the same warning until then. Health is http://127.0.0.1:4787/health and reports `tower: "connection-only"` and `effects: "none"`.

`TOWER_URL=ws://127.0.0.1:4747/ws` uses tower-poc instead of the mock. Start tower-poc yourself. This host still waits for a connect press. `DIAG_LOG=/path/to/log` records sidecar message types only.

A worktree reads ports, the SQLite folder and `packsDir` from `.wt.json` (`pnpm wt`). `PORT`, `DATA_DIR` and `PACKS_DIR` override those for one run. With no worktree file, packs are the repo's `packs/` directory.

These ports sit away from tower-poc (4747/4748) and the funeral POC (4767/4768).

## Other commands

```bash
cd apps/bloodtower
pnpm dev      # server (tsx watch, port 4787) + next dev on port 3000; open http://localhost:3000/
pnpm build    # web static export
pnpm start    # one process serving the export; run pnpm build first
pnpm e2e      # Playwright on port 4788 (first time: pnpm -F bloodtower-e2e e2e:install)
```

Visual specs also copy stable PNG names into `apps/bloodtower/test-results/screenshots` (gitignored). On a Cursor cloud agent VM, set `E2E_ARTIFACTS_DIR=/opt/cursor/artifacts/screenshots` so those copies land beside walkthrough artifacts.

`pnpm dev` is the split process for UI work. Open http://localhost:3000/ on the Mac for the title page (Story board and Hunter links). The session socket stays on port 4787; the page picks `ws://<this-host>:4787/ws`, so an iPad that opens the join QR on the Mac's LAN address also reaches the socket on that address. The board QR and join URL use the LAN IPv4 on port 3000. Private-range origins on the LAN are allowed for `/ws` while `DEV_ORIGINS` is set. For a table session with one port, use `pnpm start` after `pnpm build`.

To run tower-poc beside this app, start it on 4747 and set `TOWER_URL`. This host does not start it.
