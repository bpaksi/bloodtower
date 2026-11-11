# Bloodtower (`bloodtower`)

| | |
|---|---|
| Purpose | The story app: a pack on the Story board, heroes on iPads joining by QR, first press wins, and a timing log rebuilt from the event store. The core engine runs setup and the Proving Grounds day slice; the host speaks protocol v2 only. |
| Phase | Build |
| SDLC tier | Full |
| Status | Building 1.0 in four milestones, C2 to C5: [plans/1.0-milestones.md](plans/1.0-milestones.md). C1 was signed off on 2026-10-31. C2 (session shell) and C3 (a full game, The Ruined Keep) are in progress; the A1 asset adapter's steps 1 to 8 are merged. Each plan's Results section is the record. |
| Disposable? | No. |

The Mac runs this host. The Story board is display-only at `/board`. Hero devices use `/join` and `/device`. Those pages open `/ws` on this host. The tower is `@dark-tower/tower` (mock in CI and e2e). Nothing connects, calibrates, or reconnects until a joined device wins that press, and no light or drum is sent automatically.

## Where things are

| Path | What |
|---|---|
| `spec.md` | The architecture decision log (D1 to D48, still added to) and the protocol and pack contracts. Its R1 sections are history; see the note at its top |
| `plans/` | Milestone plans (`C1` to `C5`, `A1`), runbooks, and `1.0-milestones.md` |
| `plans/briefs/<plan>/<##-feature>/` | One folder per feature: `plan.md`, `eval.md`, `mockup.html` for a screen change, `approval.md` ([briefs/README.md](plans/briefs/README.md)) |
| `docs/` | Playtest notes, the C2 audit, diagnoses ([docs/README.md](docs/README.md)) |
| `src/protocols/` | The wire contract (`v2/`) and the pack format (`pack-v2/`), as zod schemas |
| `src/engine/` | The game rules as pure code: no I/O, clock or ambient randomness (`pnpm check` enforces it) |
| `src/server/` | The host: sockets, SQLite event store and checkpoints, pack loading, the tower, logs |
| `src/web/` | The Story board, join and device pages (Next.js static export) |
| `src/assets/` | The asset pipeline: `needs`, `render`, `pack`, `import`, `redo` (the `bt-assets` skill) |
| `src/e2e/` | Playwright: phone, iPad and desktop viewports, all on Chromium |
| `data/` | SQLite and `logs/` (gitignored). A worktree uses the `dataDir` in `.wt.json`. Created when the host starts. |
| `../../packs/` | Format v2 story packs (`test` is The Ruined Keep demo pack; `dracula` is metadata-only). |
| `../../packs/base/` | Shared board graph, hero roster and tuning for v2 packs. |

## How work reaches the code

Bloodtower has no `intent/` folder. The design cards in `research/game-design/cards/` stand in for it (Bob, 2026-11-07).

```text
design cards (DEC-, MEC-, SCR-, UI-, CUE-)       research/game-design/cards/
   └► milestone plan, each step with Builds: <IDs>   plans/C2…C5-*.md
        └► feature folder: plan, evals, mockup, Bob's approval   plans/briefs/<plan>/<##-feature>/
             └► one branch and PR per feature; the verifier runs the evals
                  └► Bob's gate at the end of the milestone (G-C2 … G-1.0)
```

Read the feature folder and the cards it builds before changing code. An architecture decision that outlives a feature gets a `D` row in `spec.md`.

## How the parts fit

One press, end to end:

1. A device page sends `act{promptId, actionId, args}` on `/ws` (`src/web/lib/session.ts`, schema in `src/protocols/v2/client.ts`).
2. The hub checks the message and the device, then calls the session (`src/server/hub/host.ts`).
3. The session turns it into an engine event and steps the engine (`src/server/core/session.ts` → `stepShell` in `src/engine/loops/session/stepShell.ts`). The loops under `src/engine/loops/` (session, game, chapter, day, group turn, encounter) decide what is offered next.
4. The engine returns a new state and a list of effects. The server runs the effects, such as event-store rows and tower commands (`src/server/core/effects.ts`), and the session writes checkpoints.
5. The session projects the state into a Board view and one Device view per device, and the hub sends them (`projectShellView` in `src/engine/loops/session/view.ts`, schemas in `src/protocols/v2/views.ts`).

The engine never touches the tower, the clock or the database. A tower command is an effect the server carries out through `@dark-tower/tower`.

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

Open http://127.0.0.1:4787/ for the title page, then **Story board** or **Hunter** on an iPad. The evening starts at the join, then Base board setup and the tower choice (connect and calibrate, or play without it), then Pick Story → Game settings → Claim heroes → pack setup steps → Begin → play (day slice). Continue, above the stories on Pick Story and on the session screen, restores an autosaved game (DEC-208, DEC-709). Quit story lands on the session screen (Continue, New game, tonight's games, Done for tonight, the tower's state); Done for tonight returns the board to the landing painting (DEC-713). Health is http://127.0.0.1:4787/health and reports `protocol: 2`, `tower: "connection-and-sound"`, `effects: "sound-only"`.

Errors and warnings are JSON lines under `data/logs/`. Pages send `log` on the v2 socket after hello, or `POST /log` as a fallback. The Story board shows logged errors as toasts.

A worktree reads ports, SQLite folder, and `packsDir` from `.wt.json` (`pnpm wt`). `PORT`, `DATA_DIR`, and `PACKS_DIR` override for one run.

## Other commands

```bash
cd apps/bloodtower
pnpm dev      # server (tsx watch, port 4787) + next dev on port 3000
pnpm build    # pack:lint:all, then the web static export
pnpm start    # one process serving the export; run pnpm build first
pnpm e2e      # builds, then Playwright on port 4788 (first time: pnpm -F bloodtower-e2e e2e:install)
pnpm simulate --games 1000 --days 10 --seed s   # headless Proving Grounds slice
pnpm playtest # guided playtest: builds and starts the host, walks Bob through each check (add --tower for the real tower), saves docs/playtests/<stamp>.{json,md}
```

`pnpm check` at the repo root runs Biome, import guards, and tests for every package.
