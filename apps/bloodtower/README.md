# Bloodtower (`bloodtower`)

| | |
|---|---|
| Purpose | The story app: a pack on the Story board, heroes on iPads joining by QR, first press wins, and a timing log rebuilt from the event store. The core engine runs setup and the Proving Grounds day slice; the host speaks protocol v2 only. |
| Phase | Build |
| SDLC tier | Full |
| Status | C1 step 9: core host, v2 views, `packs/` format v2. [plans/C1-engine-core.md](plans/C1-engine-core.md). [spec.md](spec.md). |
| Disposable? | No. |

The Mac runs this host. The Story board is display-only at `/board`. Hero devices use `/join` and `/device`. Those pages open `/ws` on this host. The tower is `@dark-tower/tower` (mock in CI and e2e). Nothing connects, calibrates, or reconnects until a joined device wins that press, and no light or drum is sent automatically.

## Where things are

| Path | What |
|---|---|
| `spec.md` | Decision log and traceability |
| `plans/` | Milestone plans |
| `docs/` | Notes that are not the spec |
| `src/web/`, `src/server/`, `src/protocols/`, `src/engine/` | Code parts, each its own package |
| `src/e2e/` | Playwright: phone and iPad on WebKit, desktop on Chromium |
| `data/` | SQLite and `logs/` (gitignored). A worktree uses the `dataDir` in `.wt.json`. Created when the host starts. |
| `../../packs/` | Format v2 story packs (`test` is the Proving Grounds slice; `dracula` is metadata-only). |
| `../../packs/base/` | Shared board graph and hero roster for v2 packs. |

```bash
pnpm --dir apps/bloodtower pack:lint            # packs/test only
pnpm --dir apps/bloodtower pack:lint packs/test
pnpm --dir apps/bloodtower pack:lint:all        # every door under packsDir
```

`pnpm --dir apps/bloodtower pack:lint <dir>` checks another folder; the path is resolved from the server package working directory. `pack:lint:all` walks every immediate child of `packsDir` (`.wt.json`, then `PACKS_DIR`, default `packs/`) and `packs-v2/` when that tree is separate. `pnpm check` and `pnpm build` run it and fail if a pack fails. `W-asset` on a placeholder stays a warning. A missing non-placeholder still, audio file, or cover fails the lint.

## Running on the Mac

From the repo root. One process serves the Story board and the session socket. It binds `0.0.0.0:4787` unless `PORT` is set. It creates `apps/bloodtower/data/` on start and opens `session.sqlite` there.

```bash
pnpm install
pnpm --dir apps/bloodtower build
pnpm --dir apps/bloodtower start
```

Open http://127.0.0.1:4787/ for the title page, then **Story board** or **Hunter** on an iPad. Setup is Pick Game → Pick Story → Game settings → Tower connect and calibrate → Claim heroes → pack setup steps → Begin → play (day slice). Continue on Pick Game restores an autosaved game (DEC-208). Health is http://127.0.0.1:4787/health and reports `protocol: 2`, `tower: "connection-and-sound"`, `effects: "sound-only"`.

Errors and warnings are JSON lines under `data/logs/`. Pages send `log` on the v2 socket after hello, or `POST /log` as a fallback. The Story board shows logged errors as toasts.

A worktree reads ports, SQLite folder, and `packsDir` from `.wt.json` (`pnpm wt`). `PORT`, `DATA_DIR`, and `PACKS_DIR` override for one run.

## Other commands

```bash
cd apps/bloodtower
pnpm dev      # server (tsx watch, port 4787) + next dev on port 3000
pnpm build    # pack:lint:all, then the web static export
pnpm start    # one process serving the export; run pnpm build first
pnpm e2e      # Playwright on port 4788 (first time: pnpm -F bloodtower-e2e e2e:install)
pnpm simulate --games 1000 --days 10 --seed s   # headless Proving Grounds slice
```

`pnpm check` at the repo root runs Biome, import guards, and tests for every package.
