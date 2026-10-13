# Tower controller POC (`tower-poc`)

| | |
|---|---|
| Purpose | Learn what the tower can do: a controller and investigation tool for every UltimateDarkTower capability, with diagnostics and a gap register |
| Phase | Explore |
| SDLC tier | Full (touches hardware; its findings feed later apps) |
| Status | Spec v1 awaiting approval. Code starts at [plans/M0-scaffolding.md](plans/M0-scaffolding.md). |
| Disposable? | Yes, unless promoted. Reusable parts (protocol, tower client) move to `packages/` when `game-test` needs them. |

A Node service on the Mac owns the tower over Bluetooth (via [UltimateDarkTower](https://github.com/ChessMess/UltimateDarkTower)). Any browser on the LAN (Mac, iPad, phone) controls it over WebSocket.

## Where things are

| Path | What |
|---|---|
| `intent/` | Ideas in Bob's words (the original PRD is `0001`) |
| `spec.md` | Accepted design, including the decision log (D1–D18) |
| `plans/` | One plan per milestone (M0–M5) |
| `service/`, `web/`, `protocol/` | Code parts, created in M0 |
| `docs/` | App docs: capabilities, acceptance, troubleshooting (created M1–M5) |
| `../../research/tower/` | Spike and observability write-ups shared with other apps |

## Running (after M0)

```bash
cd apps/tower-poc
pnpm dev      # service (tsx watch) + next dev
pnpm start    # one process, one port (MOCK=1 for mock mode)
pnpm e2e      # Playwright, mock mode, 3 viewports
```
