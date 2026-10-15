# R1 — Real app, step 1: thin foundation (build plan)

**Status:** draft for Bob, 2026-10-15. Nothing is built. In review.
**Source:** `research/game-design/requirements.md` (R-ENG, R-DEV, R-LEN), `story-engine.md` (E15–E20), `story-pack-format.md` (draft 2026-10-15, §0–§15), `setup-wizard-and-summary.md` (R-WIZ-10/11), `apps/burgomaster-funeral-poc/docs/{PRD.md rev 5, poc-v2-flow.md V2-1..V2-9}`, `docs/sdlc.md`, `apps/tower-poc/docs/{final-report.md,reuse-guide.md,capabilities.md}`. The funeral POC is frozen; it is a reference, never an import.
**Goal:** a new app with the tower-poc layout that loads a story pack from data, shows a display-only Story board on the Mac/TV, lets iPads join by QR and drive the only controls (first press wins, logged by device), and writes every timing mark to SQLite from day one. It plays no story yet beyond stepping through the loaded pack's moment list.
**Exit condition:** every acceptance criterion below passes in CI (mock tower) and on Bob's Mac with one iPad, and Bob signs off at G-R1.

Process: `docs/sdlc.md`. One branch and one PR per step on `bpaksi/bloodtower`, built by a Cursor cloud agent Wright launches (local agents use `pnpm wt`). Verifier plus `adversary-bugs` and `adversary-prd` on every PR, at most 3 fix rounds, then `needs-bob`. Wright squash-merges serially once `check` is green and both say `Blocking: none`.

**Tower in R1: connection only, no live effects.** The app reuses tower-poc's connection code (reuse-guide option A, see step 6): tower-poc runs as a sidecar service. The app connects, shows status and battery, and calibrates on an explicit press from any joined iPad (first press wins, the same lock as the other controls). No cue is sent to the tower in R1. Every cue plays its screen half and fallback audio (R-ENG-12, as funeral R4-2). Wiring cues to the tower is step 2+, because the findings show it is not trivial: no-op commands stall the queue 30 s (GAP-HW-010), sound end is never reported (GAP-LIB-007), loop is dropped (GAP-HW-008), and the `rotation*` sequences never answer (D23). The timing test on PR `tower-poc/timing-test` feeds that later step.

## App layout

Same source layout as `apps/tower-poc` and the funeral POC. The app is `apps/bloodtower`:

```text
apps/bloodtower/
  package.json        # "bloodtower": dev / start / build / e2e / pack:lint orchestrator scripts (concurrently, as tower-poc)
  README.md           # sdlc.md app README template; run commands
  spec.md             # step 2
  docs/               # PRD / intent, decisions, playtest notes
  plans/              # this file
  data/               # SQLite files in the main checkout (gitignored); a worktree uses .wt.json dataDir
  src/
    web/              # "bloodtower-web": Next.js App Router: Story board, iPad join + controls
    server/           # "bloodtower-server": Node host: story loader, session/lock, WS hub, SQLite, tower service wiring
    protocols/        # "bloodtower-protocols": shared types, Zod schemas, WS messages, pack schema types, timing types
    e2e/              # "bloodtower-e2e": Playwright (Story board + 2 device contexts)
```

Tests sit next to their files; e2e in `src/e2e/tests/`. Game logic is pure TS in `src/server/<concern>/` with no I/O. Stack (R-ENG-9): Next.js + React, pnpm, better-sqlite3 + Drizzle, `ws`, Zod, Vitest, Playwright, Biome, exact pins. Ports from `.wt.json`, defaulting to 4787 (dev) / 4788 (e2e) so they never collide with tower-poc (4747/4748) or the funeral POC (4767/4768). Story packs live in a top-level `packs/` folder by default (R-ENG-9). The app reads that location from `packsDir` in `.wt.json`, and a `PACKS_DIR` env var overrides it. R1 loads only the test pack at `packs/test/`. That pack is a long-lived proving ground for new ideas. The Dracula pack holds only proven work and comes in a later step.

## Scope

- Scaffold of the four packages and orchestrator scripts; `spec.md` with a decision log and traceability table.
- `protocols`: pack schema types (§1 metadata, §2 hunters, §3.1 nights / §3.3 set pieces, §4 moments and targets, §6 cues, §13 asset refs, §14 stats/timing), WS messages, device/holding types, control-lock types, and **timing types** (PRD-41 marks: phase, moment, pick, table talk, battle screen, cue start/end, pause start/end with cause; monotonic + wall time; device id). The timing-mark rows match the funeral POC's PRD-41 timing rows exactly.
- **Story loader** (R-ENG-1/10/11): reads a pack folder (YAML or JSON) from `packsDir` (`.wt.json`, overridable by `PACKS_DIR`; default `packs/`), validates with Zod and the subset of §15 rules that the R1 schema covers (V-1, V-2, V-3, V-4, V-5 load-time part, V-8, V-20), returns a typed immutable pack. CLI `pnpm bloodtower pack:lint <dir>`. Fields R1 does not interpret are parsed and kept, not executed.
- **SQLite timing log from day one**: Drizzle tables `sessions`, `devices`, `holdings`, `control_presses`, `timing_marks`; every mark written on the server with monotonic and wall time. One run can be reconstructed from rows (as funeral SC-4). The `timing_marks` rows match the funeral POC's PRD-41 timing rows exactly, so one report can compare both.
- **Story board** (V-1, V-3, V-8): full-screen browser page on the Mac, display only (no buttons, no input handlers), shows the QR + numeric join code (R-WIZ-10), the hunter list and holders, the one large next-step prompt, the current moment's shared still/text, tower status. Never renders `ipad:*` content (V-4).
- **iPad join by QR** (R-WIZ-10, R-WIZ-11, R-DEV-8/9): scan → join page → pick hunter(s) held; one device may hold several; holdings change only from iPads (PR #21); start gate until every hunter is held; rejoin restores holdings by device token.
- **iPad-only controls with first press wins** (V2-2): Begin, Continue, Pause/Resume, and tower connect/calibrate, on every joined device. One server-side lock per prompt; the first press counts, all screens update at once, later presses see the locked result; every press (winning and losing) logged with device id and time.
- **Moment stepping**: Continue advances through the loaded pack's ordered moments for the first night; each moment's shared half goes to the Story board, private moments only to holders of that hunter (V-4, R-DEV-9). No choices, investigation, battle or variants beyond present/absent filtering.
- **Pause on unheld hunter** (R-DEV-9 disconnect rule): pause start/end marks with cause.
- **Tower connection reuse** (step 6): tower-poc runs as a sidecar service. Status, connect and calibrate are explicit presses from any joined iPad; the first press wins, the same lock as the other controls. Mock tower in CI and dev (R-ENG-7). `DIAG_LOG` on in hardware sessions.

## Out of scope

- Live tower effects (lights, sounds, drums, seals, skull handling), the cue-to-tower map, fallback suppression, E16 tower idle. Fallback audio/screen only.
- Setup wizard beyond the QR + who-holds-whom steps (R-WIZ-1..9, 12), splash (V2-9), game length selection, difficulty.
- Choices, votes, investigation round (E17), queue (V2-4), replay and story log (V2-5/V2-6), hunter tabs (V2-7), sidebar cycling (V2-8), battle status, advantages (E18), quest tokens (E19), dungeon (E20), encounters, corruption guard, endings, stats summary (R-SUM).
- Saves/resume across restarts beyond holdings; pack versioning warnings beyond recording the version (R-ENG-11 full).
- Moving tower code into `packages/`. R1 uses reuse-guide option A only: tower-poc runs as a sidecar service.
- The Dracula pack. R1 loads the test pack at `packs/test/` only. The Dracula pack holds only proven work and comes in a later step.
- Any change to `apps/tower-poc` or `apps/burgomaster-funeral-poc`.
- Not planned around (open design calls, left to Bob/Gamewright): set pieces per length, crypt room counts, which advantage the crypt rooms improve, and the name of the space next to the tower. The schema keeps these fields open (parsed, not interpreted).

## Steps

### Step G0: Bob approves this plan
- Owner: Bob (gate G-plan)
- Depends on: none
- Touches: this file (Results)
- Deps change: no

### Step 1: Scaffold the app and the protocols contract
- Depends on: G0
- Touches: `apps/bloodtower/{package.json,README.md}`, `src/*/{package.json,tsconfig.json,vitest.config.ts}`, `src/protocols/{index.ts,pack.ts,pack.test.ts,messages.ts,messages.test.ts,devices.ts,control.ts,timing.ts,timing.test.ts}`, `src/server/{index.ts,server.ts,server.test.ts,config.ts,config.test.ts}`, `src/web/{next.config.ts,postcss.config.mjs,app/layout.tsx,app/page.tsx,app/globals.css}`, `src/e2e/{playwright.config.ts,tests/smoke.spec.ts}`, `.gitignore` (`apps/bloodtower/data/`), `pnpm-lock.yaml`
- Deps change: **yes** (the only one; adds every dependency later steps need, incl. `yaml`, `qrcode`, Drizzle, and the tower packages at the tower-poc pins: `ultimatedarktower` 7.1.2, `ultimatedarktowerdata` 3.0.0, `@stoprocent/noble` 2.8.0)
- Scope: the four packages (`bloodtower-web`, `bloodtower-server`, `bloodtower-protocols`, `bloodtower-e2e`), orchestrator scripts, `.wt.json` config including `packsDir` (default top-level `packs/`, overridable by `PACKS_DIR`), the full protocols contract including timing types. `types`/`messages` frozen after this step; a change later is a plan deviation.
- Covers: R-ENG-9, layout. Proof: `pnpm check`, `pnpm build`, smoke e2e on the configured port.

### Step 2: `spec.md` with decision log
- Depends on: G0
- Touches: `apps/bloodtower/spec.md`
- Deps change: no
- Scope: spec from this plan and the sources, traceability table (requirement → step → test), decision log (option A sidecar, `packsDir`, test pack only, iPad connect/calibrate, PRD-41 rows matching the funeral POC, iPad-only holdings, target naming `storyboard`). Docs only.

### Step 3: Story loader and pack lint
- Depends on: 1
- Touches: `src/server/pack/**`, `packs/test/**`, `src/server/scripts/packLint.ts`
- Deps change: no
- Scope: load folder → Zod parse → validation subset → typed pack; clear error list with file and path; CLI. The loader reads `packsDir` from `.wt.json` (default `packs/`), overridable by `PACKS_DIR`. R1 ships the test pack at `packs/test/`: 4 hunters, 1 night, 1 set piece, shared + private moments + `~no-<hunter>` variants and one cue with screen half and fallback. The test pack is a long-lived proving ground for new ideas. The Dracula pack is not loaded in R1.
- Covers: R-ENG-1, R-ENG-10 (lint part), R-ENG-11 (version recorded), V-1..V-5, V-8, V-20. Proof: unit tests per rule, the test pack and one bad pack per rule.

### Step 4: SQLite timing log and session store
- Depends on: 1
- Touches: `src/server/db/**`, `src/server/timing/**`
- Deps change: no
- Scope: Drizzle schema + migrations for sessions, devices, holdings, control presses, timing marks. The timing-mark schema matches the funeral POC's PRD-41 timing rows exactly (phase, moment, pick, table talk, battle screen, cue start/end, pause start/end with cause; monotonic + wall time), so one report can compare both. A `TimingLog` stamps monotonic (`performance.now` offset from session start) and wall time; storage injected so logic tests use in-memory SQLite.
- Covers: PRD-41 (same rows as the funeral POC), R-STA (base rows), R-DEV-9 (stats record devices and holdings). Proof: unit tests reconstruct a sample run from rows.

### Step 5: Session, holdings and first-press-wins lock
- Depends on: 1
- Touches: `src/server/session/**`, `src/server/control/**`
- Deps change: no
- Scope: pure reducers: device join/rejoin by token, holdings changed only from joined iPads, start gate, pause when a hunter has no connected holder and resume, control lock per prompt id (first press wins, later presses rejected with the locked result), moment stepping over the pack's first night with present/absent variant filtering. Connect and calibrate use that same lock. Emits timing marks and press records through interfaces.
- Covers: V2-2, R-DEV-4, R-DEV-9, R-WIZ-11, E15 (presence only). Proof: unit tests incl. two simultaneous presses → exactly one winner.

### Step 6: Tower connection reuse
- Depends on: 1
- Touches: `src/server/tower/**`
- Deps change: no
- Scope: reuse-guide option A. tower-poc runs as a sidecar service; this app connects to it at `ws://localhost:4747/ws` as a client. Expose status, battery, connect and calibrate as explicit presses from any joined iPad; the first press wins, the same lock as the other controls. Mock adapter for CI. No cue sends. Safety rules from root `CLAUDE.md` copied into spec, not code.
- Covers: R-DEV-1, R-DEV-5, R-ENG-7, R-SES-2. Proof: unit tests against the mock; manual connect on Bob's Mac.

### Step 7: Server integration and WS hub
- Depends on: 3, 4, 5, 6
- Touches: `src/server/{index.ts,hub/**}`
- Deps change: no
- Scope: wire loader, session, timing log and tower into the WS host; per-device views (Story board gets only `storyboard` targets; devices get shared + their hunters' privates); join token + QR URL + numeric code; origin check as tower-poc D20.
- Covers: R-ENG-16, R-DEV-4, R-DEV-6, R-WIZ-10, V-4 at runtime.

### Step 8: Story board page
- Depends on: 1 (builds against protocols; runs end to end after 7)
- Touches: `src/web/app/board/**`, `src/web/components/board/**`, `src/web/lib/**`
- Deps change: no
- Scope: display-only full-screen page: QR + code, hunters and holders, next-step prompt, current shared moment (still/text placeholder + fallback audio), pause banner, tower status. No interactive elements (lint/test asserts none). Holdings do not change here.
- Covers: V-1, V-3 (prompt only), V-8 (static list), R-WIZ-10.

### Step 9: iPad join and controls
- Depends on: 1 (runs end to end after 7)
- Touches: `src/web/app/join/**`, `src/web/app/device/**`, `src/web/components/device/**`
- Deps change: no
- Scope: join from QR, pick and change hunters (holdings change only from iPads), rejoin, Begin / Continue / Pause / Resume, locked-state feedback, private moment display for held hunters, tower connect and calibrate on any joined iPad (first press wins, the same lock as the other controls).
- Covers: V2-2, R-DEV-3, R-DEV-8, R-DEV-9, R-WIZ-11.

### Step 10: Acceptance e2e and timing reconstruction
- Depends on: 7, 8, 9
- Touches: `src/e2e/tests/**`, `src/server/scripts/timingReport.ts`
- Deps change: no
- Scope: Playwright with one board and two device contexts runs the test pack's night end to end with the mock tower; a script prints the timing rows of a session as a timeline.
- Proof: AC-1..AC-9 automated where possible.

### Step G-R1: Bob runs it on the Mac + TV + iPad
- Owner: Bob. Depends on: 10.

## Batches

| Batch | Steps | Depends on | Merge order | Why |
|---|---|---|---|---|
| G0 | Bob approves | — | — | Gate |
| B1 | 1, 2 | G0 | 1, 2 | Step 1 is the only `Deps change: yes`; 2 is docs |
| B2 | 3, 4, 5, 6, 8, 9 | B1 | 4, 3, 5, 6, 8, 9 | Separate folders, all built against protocols |
| B3 | 7 | B2 | — | Integration |
| B4 | 10 | B3 | — | Acceptance |
| G-R1 | Bob on hardware | B4 | — | Gate |

## Acceptance criteria

- AC-1: `pnpm check`, `pnpm build` and `pnpm -F bloodtower-e2e e2e` green in CI; nothing in `apps/tower-poc` or `apps/burgomaster-funeral-poc` changed.
- AC-2: `pack:lint` passes the test pack at `packs/test/` and rejects each bad pack with a message naming the file, path and rule (V-1..V-5, V-8, V-20).
- AC-3: the Story board has no interactive elements, shows the QR and a numeric code, and never receives an `ipad:*` payload (asserted on the WS frames).
- AC-4: an iPad (or phone) scanning the QR joins, picks one or more hunters, and Begin is blocked until all hunters are held.
- AC-5: two devices pressing Continue within the same tick: exactly one press wins, both screens and the board update, and both presses are in `control_presses` with device ids and winner flag.
- AC-6: a private moment reaches only devices holding that hunter; an absent hunter's `~no-` variant plays where it exists.
- AC-7: disconnecting the only holder of a hunter pauses play at once; rejoin resumes; pause start/end marks carry the cause.
- AC-8: every moment, press, pause and cue (fallback) has a timing mark with monotonic and wall time; the timing-mark schema matches the funeral POC's PRD-41 timing rows exactly, so one report can compare both; the timing report reconstructs the run.
- AC-9: with the real tower, any joined iPad can connect and calibrate, and the first press wins (the same lock as the other controls); status and battery show on the board; no light, sound or drum command is sent during play (DIAG_LOG shows none).

## Risks

- Story-pack-format is a draft (2026-10-15); schema churn after step 1 freezes protocols. Mitigation: loader keeps unknown-but-declared fields as opaque data; pack schema in its own module (`pack.ts`).
- Two tower owners: option A needs tower-poc running beside the app; running both with an embedded service breaks the one-owner rule. Mitigation: A only in R1; doc it in README.
- Bluetooth drops and calibration loss on reconnect (D9/D10) can confuse a first hardware run. Mitigation: no tower effects in R1; status shown on board.
- First-press-wins races across slow Wi-Fi: lock decided on the server by arrival order only; client clocks never used.
- Safari on iPad: WS reconnect and audio autoplay limits; fallback audio plays from the Mac only in R1.
- Scope creep from V2 rules (queue, replay, tabs) into R1. Mitigation: out-of-scope list; adversary-prd checks against it.

## Decisions (Bob, 2026-10-15)

- Q1: the app is `apps/bloodtower`, with packages `bloodtower-web`, `bloodtower-server`, `bloodtower-protocols` and `bloodtower-e2e`.
- Q2: reuse-guide option A. tower-poc runs as a sidecar service. No code moves into `packages/` in R1.
- Q3: packs live in a top-level `packs/` folder by default. The app reads the location from `packsDir` in `.wt.json`, overridable by the `PACKS_DIR` env var. The test pack is `packs/test/`.
- Q4: R1 loads the test pack only. The test pack is a long-lived proving ground for new ideas. The Dracula pack holds only proven work and comes in a later step.
- Q5: any joined iPad can connect and calibrate the tower, and the first press wins (the same lock as the other controls).
- Q6: the timing log schema matches the funeral POC's PRD-41 timing rows exactly, so one report can compare both.
- Q7: holdings change only from iPads. Already settled by Gamewright's rulings in PR #21.

## Results

(none yet)
