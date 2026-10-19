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
| root | `pnpm check` | lint, repo checks, typecheck and unit tests for every app and package |
| root | `pnpm build` | builds every app |
| root | `pnpm -F <app> dev` | runs one app in dev (same as `pnpm dev` inside its folder) |
