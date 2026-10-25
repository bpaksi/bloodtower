# Bloodtower

Designing a new game around the *Return to Dark Tower* tower. Unofficial and fan-made; *Return to Dark Tower* is © Restoration Games.

The project produces many small websites over its life. Each one lives in its own folder under `apps/` and moves through its own intent → spec → plan loop (see [docs/sdlc.md](docs/sdlc.md)).

## Apps

| App | Folder | Phase | Status | Disposable? |
|---|---|---|---|---|
| Tower controller POC | [apps/tower-poc](apps/tower-poc/) | Explore | Spec v1 approved, M0 in progress | Yes, unless promoted |
| New game test | [apps/game-test](apps/game-test/) | Explore → Design | Not started | Yes |
| Final game | [apps/game](apps/game/) | Build | Not started | No |
| Game workbench (GDD viewer) | [apps/game-workbench](apps/game-workbench/) | Design | Awaiting intent | Yes |
| Story workbench | [apps/story-workbench](apps/story-workbench/) | Design | Awaiting intent | Yes |
| TV display POC | [apps/tv-display-poc](apps/tv-display-poc/) | Explore | Awaiting intent | Yes |
| Prototypes | [apps/prototypes](apps/prototypes/) | Explore | Plan approved, batch 0 next | Yes |
| Board map entry tool | [apps/board-map-tool](apps/board-map-tool/) | Build | Intent written, build not started | Yes |

## Layout

```text
dark-tower/
├── apps/                  # every website, one folder each
│   ├── tower-poc/         # web controller POC (Mac service + Next.js UI)
│   ├── game-test/         # prototype(s) of new game mechanics
│   └── game/              # the final game
├── packages/              # shared code, only once 2+ apps need it
├── research/              # notes, findings, brainstorms — no code
│   ├── tower/             # hardware, UltimateDarkTower API, Bluetooth findings, spikes
│   ├── game-design/       # mechanics, themes, rules ideas
│   ├── decisions/         # cross-app decision records (NNNN-*.md)
│   └── return-to-dark-tower/  # reference material on the original game
├── docs/sdlc.md           # how every app runs the AI-native SDLC loop
└── pnpm-workspace.yaml
```

## Adding a new app

1. `mkdir apps/<name>` and copy the README template from [docs/sdlc.md](docs/sdlc.md#app-readme-template).
2. Write `apps/<name>/intent/0001-<name>.md` in your own words.
3. Pick the app's tier (Experiment or Full) in its README, then follow the loop.
4. Add a row to the Apps table above.

## Commands

| From | Command | Does |
|---|---|---|
| root | `pnpm install` | installs dependencies and git hooks (`lefthook install`). Every commit then runs Gitleaks on the staged changes |
| root | `pnpm check` | lint, repo checks, typecheck and unit tests for every app and package |
| root | `pnpm build` | builds every app |
| root | `pnpm -F <app> dev` | runs one app in dev (same as `pnpm dev` inside its folder) |

## Secrets

Pre-commit uses Gitleaks **8.30.1** with its default rules. `.gitleaks.toml` extends those rules and allowlists one proven false positive: the RFC 6455 sample WebSocket nonce in `apps/tower-poc/src/server/server.test.ts`. The hook (`scripts/gitleaks-protect.mjs`) uses `gitleaks` on `PATH` when that exact version is already installed, and otherwise downloads the official release into `~/.cache/bloodtower/gitleaks/`. On a Mac, `brew install gitleaks` is enough when Homebrew's version is 8.30.1.

`pnpm install` turns the hook on, including in a step worktree. It installs lefthook into `.git/hooks`. A checkout that already sets `core.hooksPath` keeps that path; the hooks still land in `.git/hooks` so an outer dispatcher runs them. CI fails the `check` job when a pull request's commits contain a secret. That job scans the pull request range, not the repository history.
