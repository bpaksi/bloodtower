# Tower controller POC (`tower-poc`)

| | |
|---|---|
| Purpose | Learn what the tower can do: a controller and investigation tool for every UltimateDarkTower capability, with diagnostics and a gap register |
| Phase | Explore |
| SDLC tier | Full (touches hardware; its findings feed later apps) |
| Status | **Closed after M3, 2026-10-15.** All 42 controls passed on the real tower. M4 and M5 are deferred. Read [docs/final-report.md](docs/final-report.md) for what the tower offers, and [docs/reuse-guide.md](docs/reuse-guide.md) for taking the code into another app. |
| Disposable? | No: its protocol and tower service are to move to `packages/` for the funeral app's Phase 2 ([reuse guide](docs/reuse-guide.md)). Until then it runs as the Mac-side tower service. |

A Node service on the Mac owns the tower over Bluetooth (via [UltimateDarkTower](https://github.com/ChessMess/UltimateDarkTower)). Any browser on the LAN (Mac, iPad, phone) controls it over WebSocket.

## Where things are

| Path | What |
|---|---|
| `intent/` | Ideas in Bob's words (the original PRD is `0001`) |
| `spec.md` | Accepted design, including the decision log (D1–D20) |
| `plans/` | One plan per milestone (M0–M5) |
| `src/web/`, `src/server/`, `src/protocols/` | Code parts, each its own package, created in M0 |
| `src/e2e/` | Playwright tests: phone and iPad on WebKit, desktop on Chromium |
| `docs/` | App docs: capabilities, acceptance, troubleshooting (created M1–M5) |
| `../../research/tower/` | Spike and observability write-ups shared with other apps |

## Running (after M0)

```bash
cd apps/tower-poc
pnpm dev      # service (tsx watch) + next dev
pnpm build    # web static export
pnpm start    # one process, one port (MOCK=1 for mock mode); run pnpm build first
pnpm e2e      # Playwright, mock mode, 3 viewports (first time: pnpm -F tower-poc-e2e e2e:install)
```

The service keeps its data in `data/tower-poc.db` (`data/tower-poc.mock.db` with `MOCK=1`); `DB_PATH` points it elsewhere. Delete the file to start with nothing saved.
