# Bloodtower

A new game built around the *Return to Dark Tower* tower. Unofficial and fan-made; *Return to Dark Tower* is © Restoration Games.

The game is [apps/bloodtower](apps/bloodtower/). Its design lives in [research/game-design](research/game-design/) as cards, and its stories ship as packs in [packs](packs/). The other apps are tools and proofs of concept made on the way. How work is planned, built, reviewed and merged is in [docs/sdlc.md](docs/sdlc.md); the short rules for agents are in [CLAUDE.md](CLAUDE.md) and [AGENTS.md](AGENTS.md).

## Apps

Each app's own README holds its current status. This table says only what the app is, so it does not go stale.

| App | Folder | What it is | Phase | Tier |
|---|---|---|---|---|
| **Bloodtower** | [apps/bloodtower](apps/bloodtower/) | The game: a host on the Mac, the Story board on the TV, heroes on iPads, the tower over Bluetooth | Build | Full |
| Game workbench | [apps/game-workbench](apps/game-workbench/) | Read-only site that shows the design cards as a graph. Also holds the card lint and the `pnpm graph` CLI | Design | Experiment |
| Tower controller POC | [apps/tower-poc](apps/tower-poc/) | Controller and investigation tool for every tower capability, with the gap register | Explore | Experiment |
| Sound review tool | [apps/sound-review-tool](apps/sound-review-tool/) | Plays each tower sound so Bob can describe it; the saved file feeds the sound cards | Build | Experiment |
| Board map entry tool | [apps/board-map-tool](apps/board-map-tool/) | Enters each board space's neighbours, terrain and region as the board map JSON | Build | Experiment |
| Prototypes | [apps/prototypes](apps/prototypes/) | Throwaway prototypes that test the design before Bloodtower builds it | Explore | Experiment |
| Funeral POC | [apps/burgomaster-funeral-poc](apps/burgomaster-funeral-poc/) | Proof of concept: one Dracula scene, the Burgomaster's funeral, played end to end | Build | Full |
| TV display POC | [apps/tv-display-poc](apps/tv-display-poc/) | Test page for how a browser game looks and sounds on the TV | Explore | Experiment |
| Story workbench | [apps/story-workbench](apps/story-workbench/) | Planned viewer for several stories at once. Awaiting intent | Design | Experiment |
| TTS explorer | [apps/Visuals/src/tts-explorer](apps/Visuals/src/tts-explorer/) | Auditions text-to-speech voices for narrator and character lines | Explore | Not stated |

## Layout

```text
.
├── apps/                  # every website, one folder each (table above)
│   └── bloodtower/        # the game: spec.md, plans/, docs/, src/{web,server,protocols,engine,assets,e2e}
├── packages/              # shared code, only once a second app needs it: rng, tower, workbench
├── packs/                 # story packs the game loads: base (board, heroes, tuning), test, dracula
├── assets/                # app icons and story scripts
├── research/              # notes and findings, no code
│   ├── game-design/       # the game's design: cards/ is the truth, the documents are sources
│   ├── stories/           # story notes: dracula, fellowship, ruined-keep
│   ├── decisions/         # cross-app decision records (NNNN-*.md)
│   ├── tower/             # hardware, UltimateDarkTower API, Bluetooth findings, spikes
│   ├── return-to-dark-tower/, dark-tower-1981/   # reference material on the two source games
│   ├── look-and-feel/, tv-display/               # early visual direction and TV findings
│   └── brainstorming/, jev/                      # loose ideas; one experiment on review findings
├── docs/
│   ├── sdlc.md            # the process: gates, CI, review, merging, who does what, where IDs live
│   ├── art-direction/     # the game's look: game-look.md, tokens.css, fonts, mocks
│   ├── ui-mocks/          # mocks for single UI pieces
│   └── deliveries/        # dated notes for delivered art and audio files
├── scripts/               # repo checks, worktree and card-ID tools, the CI scope classifier
├── .claude/               # hooks, agents and skills shared by every app
└── .github/workflows/     # check.yml (the required check), e2e-main.yml
```

## Where to start

| You want to | Read |
|---|---|
| Change the game's code | [apps/bloodtower/README.md](apps/bloodtower/README.md), then the milestone plan it names |
| Know a rule of the game | `pnpm graph find <words>` and `pnpm graph show <ID>`, or [research/game-design/README.md](research/game-design/README.md) |
| See what 1.0 still needs | [apps/bloodtower/plans/1.0-milestones.md](apps/bloodtower/plans/1.0-milestones.md) and `pnpm graph gaps` |
| Add or change a tower capability | The `tower-capability` skill and [research/tower](research/tower/) |
| Know what an ID such as `DEC-143`, `D36` or `EV-19` refers to | [docs/sdlc.md](docs/sdlc.md#where-ids-live) |
| Know who Wright, Gamewright or Warden is | [docs/sdlc.md](docs/sdlc.md#named-roles) |

## Adding a new app

Use the `new-app` skill, or by hand:

1. `mkdir apps/<name>` and copy the README template from [docs/sdlc.md](docs/sdlc.md#app-readme-template).
2. Bob writes `apps/<name>/intent/0001-<name>.md` in his own words.
3. Pick the app's tier (Experiment or Full) in its README, then follow the loop.
4. Add a row to the Apps table above.

## Commands

| From | Command | Does |
|---|---|---|
| root | `pnpm install` | installs dependencies and git hooks (`lefthook install`). Every commit then runs Gitleaks on the staged changes |
| root | `pnpm check` | lint, repo checks, typecheck and unit tests for every app and package |
| root | `pnpm build` | builds every app |
| root | `pnpm -F <app> dev` | runs one app in dev (same as `pnpm dev` inside its folder) |

The full list, with the worktree, card-ID and asset commands, is in [CLAUDE.md](CLAUDE.md#commands).

## Secrets

Pre-commit uses Gitleaks **8.30.1** with its default rules. `.gitleaks.toml` extends those rules and allowlists one proven false positive: the RFC 6455 sample WebSocket nonce in `apps/tower-poc/src/server/server.test.ts`. The hook (`scripts/gitleaks-protect.mjs`) uses `gitleaks` on `PATH` when that exact version is already installed, and otherwise downloads the official release into `~/.cache/bloodtower/gitleaks/`. On a Mac, `brew install gitleaks` is enough when Homebrew's version is 8.30.1.

`pnpm install` turns the hook on, including in a step worktree. It installs lefthook into `.git/hooks`. A checkout that already sets `core.hooksPath` keeps that path; the hooks still land in `.git/hooks` so an outer dispatcher runs them. CI fails the `check` job when a pull request's commits contain a secret. That job scans the pull request range, not the repository history.
