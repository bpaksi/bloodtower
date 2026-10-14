# M1 — Burgomaster's Funeral POC (build plan)

**Status:** G0 approved by Bob, 2026-10-14 3:54 PM ET, with one condition (app layout, below). Nothing is built yet. Batch B1 may start.
**Source:** `docs/PRD.md` rev 5 (R5-1 timing, PRD-41..43, AT-31..32, 2026-10-14 16:15 ET), with rev 4 (R4-1..R4-3), which keeps the rev 3 rulings R3-1..R3-12. The PRD is this app's intent (G0). Where this plan and the PRD differ, the PRD wins until the spec (step 2) is approved.
**Goal:** the scene `n2-burgomasters-funeral` plays end to end on the Mac host, the Dashboard and 1+ devices holding all 4 hunters, **with no tower**: every cue plays its screen half plus its fallback audio, and the Dashboard runs the E16 ambient bed. SC-1..SC-5 are met in that form.
**Exit condition:** every POC acceptance test in PRD §11 passes (AT-18 by Bob's notes), and Bob signs off at G3.

Process: `docs/sdlc.md`. Each build step is one branch and one PR on `bpaksi/bloodtower`, built by a Cursor cloud agent that Wright launches (local Claude Code agents use `pnpm wt`). On every PR the verifier posts its run and the two adversaries (`adversary-bugs`, `adversary-prd`) post findings; the developer fixes them, for at most 3 rounds. Wright squash-merges PRs one at a time once the required `check` is green and both adversaries report `Blocking: none`. A PR still blocked after round 3 is labelled `needs-bob`, its step stops, and Bob is told; steps that depend on it wait. Steps marked **Owner: Bob** are gates: the next batch depends on them.

**No tower in M1 (R4-1).** The POC opens no tower connection and sends no tower command. It does not link or import `apps/tower-poc`. Tower control is Phase 2 (PRD §13), a later milestone that maps the same cue IDs to the tower (R4-3, PRD-40). PRD-5, PRD-6, PRD-28, AT-13, AT-29, AT-30 and the tower halves of PRD-1, -2, -11, -12, -13, -24, -29, AT-1, AT-2, AT-15 and AT-26 are out of M1.

## App layout (G0 condition, Bob)

The app uses the same source layout as `apps/tower-poc`:

```text
apps/burgomaster-funeral-poc/
  package.json        # "burgomaster-funeral-poc": dev / start / build / e2e for its parts
  README.md
  spec.md             # step 2
  docs/               # PRD.md, playtest-notes.md (G1, G2)
  plans/              # this file
  data/               # SQLite files in the main checkout (gitignored); a worktree uses .wt.json dataDir
  assets/             # exists; stays exactly where it is (manifest.json, cues/, script/, stills/, ...)
  src/
    web/              # "burgomaster-funeral-poc-web": Next.js App Router, Dashboard + device views
    server/           # "burgomaster-funeral-poc-server": Node host: game logic, WS hub, SQLite, cue scheduler
    protocols/        # "burgomaster-funeral-poc-protocols": shared types, Zod schemas, messages
    e2e/              # "burgomaster-funeral-poc-e2e": Playwright
```

Tests sit next to the files they cover (`foo.ts` + `foo.test.ts`), as in tower-poc; e2e tests live in `src/e2e/tests/`. The game logic (state, scene runner, rules, readiness) is pure TypeScript inside `src/server/`, one folder per concern, with no I/O, so it is unit-tested without a server.

Stack (R-ENG-9, repo conventions): Next.js + React, pnpm workspace, SQLite through better-sqlite3 + Drizzle (as in tower-poc), `ws`, Zod, Vitest, Playwright, Biome, exact pins. Ports and the SQLite folder come from `.wt.json` in a worktree and default to 4767 (dev) / 4768 (e2e) and `data/` otherwise, so the app never collides with tower-poc's 4747/4748.

## Steps

### Step G0: Bob approves this plan
- Owner: Bob (gate G-plan)
- Depends on: none
- Touches: this file (Results)
- Deps change: no
- **Done:** approved 2026-10-14 3:54 PM ET. The PRD is the intent. Condition: the tower-poc source layout above.

### Step 1: Scaffold the app and the protocols contract
- Depends on: G0
- Touches: `apps/burgomaster-funeral-poc/{package.json,README.md}`, `apps/burgomaster-funeral-poc/src/*/{package.json,tsconfig.json}`, `src/server/vitest.config.ts`, `src/protocols/vitest.config.ts`, `src/web/vitest.config.ts`, `src/protocols/{index.ts,types.ts,types.test.ts,messages.ts,messages.test.ts}`, `src/server/{index.ts,server.ts,server.test.ts,config.ts,config.test.ts,adapters/.gitkeep,db/.gitkeep,scripts/.gitkeep}`, `src/web/{next.config.ts,postcss.config.mjs,app/layout.tsx,app/page.tsx,app/globals.css,lib/door.ts,lib/door.test.ts,components/ui/.gitkeep}`, `src/e2e/{playwright.config.ts,tests/smoke.spec.ts}`, `.gitignore` (`apps/burgomaster-funeral-poc/data/`), `pnpm-lock.yaml`, this plan (the deviation below)
- Deps change: **yes** (the only one in this plan; every dependency later steps need is added here)
- Deviation: the G0 layout and the step brief also name `server.ts`, `adapters/`, `db/`, `scripts/`, `components/ui/` and `lib/`, plus the CSS and PostCSS the Next shell needs to build. This step does not add `spec.md`. Step 2 creates that file in the same batch, and a stub here is an add/add conflict with that PR. The README says step 2 writes the spec. `server.ts` only serves the static export and `GET /health`. The cue sheet is untouched (step 3 is deferred). No tower code. The protocols contract also carries what later steps need so `types.ts` and `messages.ts` stay closed: a pause list for every hunter with no connected holder, a device roster with connection, a per-hunter device view that does not require a private moment, `forewarnedCard`, `spendHolyWater`, an optional join code on `hello`, dashboard `stage` and a public `summary`, and `private_undelivered`.
- Scope: the four packages in the layout above. `config.ts` reads `.wt.json` for ports and `dataDir`. The Next.js shell shows the "Burgomaster's Funeral POC" door (flow step 1). `protocols` holds the shared contract from PRD §6–§8: hunter ids, per-hunter state, story items, moment ids and targets (`dashboard` | `ipad:<hunter>`), cue ids, event types and payloads, and the WS messages with Zod schemas. Later steps add their own modules only; changing `protocols/types.ts` or `messages.ts` after this step is a plan deviation.
- Covers: PRD-1 (structure), R-ENG-9, G0 layout condition. SC: none directly.
- Proof: `pnpm check` and `pnpm build` green; smoke e2e passes on the configured port.

### Step 2: Write `spec.md` with a decision log
- Depends on: G0
- Touches: `apps/burgomaster-funeral-poc/spec.md`
- Deps change: no
- Scope: the spec from PRD rev 4, its rulings (R3-*, R4-*), and the G0 layout condition, with a traceability table (PRD id → step → test) and a decision log. Phase 2 items listed as out of M1. Docs only.
- Covers: all POC PRD IDs and SC-1..SC-5 (mapping).

### Step 3: Cue sheet contract
- Depends on: G0
- Touches: `apps/burgomaster-funeral-poc/assets/cues/**`
- Deps change: no
- Scope: PRD-40. The cue sheet (`assets/cues/cue-sheet.json`, the file the asset kit already has; the PRD calls it `shared/tower/cues.json`, see note) is the contract. One entry per cue id used by the scene: `dim-all`, `heartbeat`, `skull-drop`, the investigation seal flicker (`seal-sequence`), and the E16 bed and accent ids. Each entry has its **screen half** (effect, duration) and its **fallback audio** (asset id from the manifest), plus an empty `tower` slot that Phase 2 fills without renaming the id. No colour, no waiting on a sound to end; all audio from the Mac (PRD-13 POC form). Data only.
- Covers: PRD-12, PRD-13, PRD-39 (data), PRD-40, R4-2, R4-3. SC-1.

### Step 2b: Timing contract follow-up (rev 5)
- Owner: Wright
- Depends on: 1, 2
- Touches: `apps/burgomaster-funeral-poc/src/protocols/timing.ts`, `src/protocols/timing.test.ts`, `src/protocols/index.ts` (export only), `apps/burgomaster-funeral-poc/spec.md` (PRD-41/42 sections)
- Deps change: no
- Scope: adds the PRD-41 timing event types to `protocols` (phase, moment, investigation pick, table talk, battle screen, cue start/end; pause start/end with cause; monotonic + wall time) as an agreed deviation from step 1's frozen contract, and writes the PRD-41 and PRD-42 sections in `spec.md`. Steps 7, 11, 12 and 14 build the rows, summary and tests on these types.
- Covers: PRD-41, PRD-42 (contract). PRD-43 is docs only (formula in the PRD; nothing built).

### Step 4: Party, presence and holdings state
- Depends on: 1
- Touches: `apps/burgomaster-funeral-poc/src/server/state/**`
- Deps change: no
- Scope: pure reducers for party state; device holdings (take / release / Dashboard change); start gate (all 4 held); presence lock at scene start (≥1 present; later changes ignored); pause when a hunter has no connected holder, resume by Dashboard reassignment or rejoin, no force-continue (R3-2); present-only item counting.
- Covers: PRD-1, PRD-32, PRD-33, PRD-34, PRD-36, PRD-37, E15, R3-2. AT-19, AT-22, AT-23, AT-25. SC-3 (state side).

### Step 5: Scene runner and variant resolution
- Depends on: 1
- Touches: `apps/burgomaster-funeral-poc/src/server/scene/**`
- Deps change: no
- Scope: the moment sequence `.01 → … → .10`, event moments (`.lid-choice`), the E17 investigation round (one pick per present hunter, unique picks, private until all lock, host Continue, then the seal sequence; R3-6), variant choice (`~no-<hunter>`, combined variants first, cut when the stand-in is absent, `.04~holy-symbol`, `.07~fight-lost~no-wren` narrator only, R3-12), no E15a exemption in this scene (R3-5), the `.06` flag, the end-of-scene `end.private.<hunter>` moments (R3-9), night 2 → 3, seeded determinism.
- Covers: PRD-7, PRD-8, PRD-9, PRD-17, PRD-21, PRD-29, R3-5, R3-6, R3-9, R3-12. AT-11, AT-12, AT-12b, AT-15 (logic). SC-1, SC-4 (inputs).

### Step 6: Choice, fight and cost rules
- Depends on: 1
- Touches: `apps/burgomaster-funeral-poc/src/server/rules/**`
- Deps change: no
- Scope: lid choice (Nail only with a present stake carrier; stake −1); foe count (base, nailed −1, mother bars the window −1, min 1); fight-lost costs by lid choice; corruption victim from present hunters with the instant-loss guard and `~blocked`; item loss (each stake one item; spent holy water removed at once, R3-7); `cost_unpayable`; skull drop cap 2 per night and supply < 6 conversion; win/loss check; investigation advantages with the +2 cap (carried holy water counts, R3-7); Forewarned choice with forced sit-out at 2 corruption (R3-8); the battle-status values the Dashboard shows (R3-1). No battle simulation.
- Covers: PRD-10, PRD-14, PRD-15, PRD-16, PRD-22, PRD-37, E9, E14, R3-1, R3-7, R3-8. AT-6, AT-7, AT-8, AT-9, AT-10, AT-28. SC-5 (mechanics).

### Step 7: SQLite event log and stats tables
- Depends on: 1
- Touches: `apps/burgomaster-funeral-poc/src/server/db/**`
- Deps change: no
- Scope: Drizzle schema and migrations for the §8 tables (`events` append-only, the source of truth); writers for every POC §8 event type (no `tower_*` events, Phase 2), including `cue_fired` with result `fallback` / reason `no_tower`, E16 accents, `forewarned.choice` (R3-8) and per-hunter fun ratings and end lines stored per hunter + device (R3-9). UTC, nulls for unknowns, seed and pack version. File under the configured data folder.
- Covers: PRD-23, PRD-24 (POC), PRD-38, R3-8, R3-9. SC-4.

### Step 8: Cue player and Dashboard ambient bed
- Depends on: 1, 3
- Touches: `apps/burgomaster-funeral-poc/src/server/cues/**`, `apps/burgomaster-funeral-poc/src/web/lib/cues/**`
- Deps change: no
- Scope: replaces the old tower client. Server side: fires each moment's cues automatically from the cue sheet with no per-cue confirm, and logs every cue as `fallback` / `no_tower`; schedules the E16 ambient bed per phase and seeded one-shot accents every 20–60 s, suppressed during speech, choices and pauses, overridden by scene cues, quiet gap ≤10 s, all logged (PRD-39, R3-4). Web side: plays a cue's screen half and its fallback audio on the Dashboard, always both (R4-2). No tower code and no tower-poc dependency.
- Covers: PRD-11 (POC), PRD-12, PRD-13 (POC), PRD-24 (cue rows), PRD-39, PRD-40, R4-2. AT-2, AT-26 (POC). SC-1.

### Step 9: Channels, privacy routing and rejoin
- Depends on: 1
- Touches: `apps/burgomaster-funeral-poc/src/server/channels/**`
- Deps change: no
- Scope: the WS hub: one Dashboard channel and one private channel per held hunter; `ipad:<hunter>` fans out to every holder, only while that hunter is present; the server refuses any `.private.*` payload (including `end.private.*`) on the Dashboard channel; device tokens bound to (session, device); rejoin restores holdings, private moments, status and pending choice; connected-holder tracking for the R3-2 pause; QR join token rotation.
- Covers: PRD-3 (token), PRD-4 (join), PRD-18, PRD-19, PRD-20, PRD-35 (payload), R3-2. AT-3, AT-4, AT-5, AT-20, AT-24, AT-27. **SC-2, SC-3.**

### Step 10: Readiness check against the asset index
- Depends on: 1, 3
- Touches: `apps/burgomaster-funeral-poc/src/server/readiness/**`
- Deps change: no
- Scope: before play, every reachable moment id resolves in `assets/manifest.json` (`@dashboard` / `@ipad`, `@phone` → `@ipad` → text), every private and `end.private.<hunter>` moment has a line per joined hunter, every `~no-<hunter>` variant (including `.07~fight-lost~no-wren`) has voice and render, every cue id in the scene resolves in the cue sheet with a screen half and fallback audio, and no private moment targets the Dashboard. Draft renders and placeholders allowed; `.08` resolves to the `.07` still (R3-11).
- Covers: PRD-26, PRD-27, PRD-40 (ids resolve), R3-9, R3-11, R3-12. AT-17. SC-1 (precondition), SC-2 (static).

### Step 11: Session orchestrator and host actions
- Depends on: 4, 5, 6, 7, 8, 9, 10
- Touches: `apps/burgomaster-funeral-poc/src/server/session/**`, `apps/burgomaster-funeral-poc/src/server/server.ts`
- Deps change: no
- Scope: the single authoritative game state; wires state, scene, rules, event log, cue scheduler and channels; host actions (Next, presence, party kit, investigation Continue, lid choice, Won/Lost, victim and item picks, skull Done, reassign hunter, End for now, Concede); mini summary from stored stats only. No tower init step (R4-1).
- Covers: PRD-1, PRD-11, PRD-25 (server), PRD-31, PRD-34. AT-1, AT-5 (server). SC-1, SC-4.

### Step 12: Dashboard UI
- Depends on: 4, 5, 6, 7, 8, 9, 10
- Touches: `apps/burgomaster-funeral-poc/src/web/app/dashboard/**`, `apps/burgomaster-funeral-poc/src/web/components/dashboard/**`
- Deps change: no
- Scope: 1080p 16:9 play view with the POC zones (phase/night, story items, corruption, skulls; no tower chip); ≥28 px text, ≥48 px numbers; QR + numeric join; roster and start gate; "Who is at the Sanctuary"; party kit; moment player (stills, clips, Mac audio) using step 8's cue player; investigation status and Continue; lid choice; battle status screen (R3-1) with Won/Lost; skull-drop prompt into the unpowered tower; neutral `.09` line; unheld-pause banner with reassign; D8 phase card; mini summary; End for now / Concede.
- Covers: PRD-2 (POC), PRD-3, PRD-14, PRD-25, PRD-31, PRD-33, PRD-39 (screen), R3-1, R3-2. SC-1, SC-2.

### Step 13: Player device UI (iPad and phone)
- Depends on: 4, 5, 6, 7, 8, 9, 10
- Touches: `apps/burgomaster-funeral-poc/src/web/app/play/**`, `apps/burgomaster-funeral-poc/src/web/components/device/**`
- Deps change: no
- Scope: join and hunter picker (names and portraits only, shared-secret notice); one card per held hunter; private moments, status and pending choice per hunter; investigation pick with taken cards greyed (R3-6); Forewarned choice, first answer wins for a shared hunter (R3-8); carried items, stake first; phone view with one decision at a time, hunter switcher and haptic tap; ≥44 pt targets; per-hunter end line and fun rating (R3-9); rejoin by token.
- Covers: PRD-4, PRD-25 (device), PRD-30, PRD-35, R3-6, R3-8, R3-9. AT-16, AT-21. SC-3 (UI).

### Step 14: End-to-end acceptance suite
- Depends on: 11, 12, 13
- Touches: `apps/burgomaster-funeral-poc/src/e2e/tests/**`
- Deps change: no
- Scope: Playwright runs of every POC acceptance test except AT-18, with no tower: AT-1 and AT-2 (rev 4: screen half visible and fallback audio played at each cue, every cue row `fallback` / `no_tower`), AT-3 payload capture, AT-4 / AT-5 / AT-25 reload and network kill, AT-26 (rev 4: Dashboard ambient gaps ≤10 s), and the rest; screenshots at Dashboard, iPad and phone sizes.
- Covers: AT-1..AT-28 except AT-13 (Phase 2) and AT-18. SC-1, SC-2, SC-3.

### Step 15: Reconstruct-from-log script and determinism check
- Depends on: 11
- Touches: `apps/burgomaster-funeral-poc/src/server/scripts/**`
- Deps change: no
- Scope: a script that rebuilds the moment sequence, investigation picks, lid choice, fight result, costs, skull outcome, cue rows, ambient accents and device holdings from the `events` table alone; a test that two runs with the same seed, party, choices and results give identical payloads, including E16 accent timing and choice, apart from times and ids (AT-15 rev 4).
- Covers: PRD-23, PRD-29 (POC). AT-14, AT-15. **SC-4.**

### Step G1: Bob playtests the first end-to-end run, without the tower
- Owner: Bob (gate G-playtest)
- Depends on: 14, 15
- Touches: `apps/burgomaster-funeral-poc/docs/playtest-notes.md`
- Deps change: no
- Bob plays the whole scene with no tower connected, on the test default (2 iPads, wren + agnes present): every cue plays its screen half and fallback audio, the ambient bed runs, and the skull drop is a table step into the unpowered tower. He writes notes. Covers: **SC-1** (rev 4), AT-1, AT-2.

### Step 16+: Fixes from the playtest
- Depends on: G1
- Touches: set per step when the plan is updated after G1
- Deps change: no (a dependency change needs its own step and a plan update)
- Wright turns G1's notes into numbered steps with their own `Touches`, in one plan-update PR, before any fix starts. Bugs follow `/bugfix`.

### Step G2: Bob records the fight-tension judgement
- Owner: Bob (gate G-judgement)
- Depends on: 16+ (all merged)
- Touches: `apps/burgomaster-funeral-poc/docs/playtest-notes.md`
- Deps change: no
- After a playtest with other players, Bob records whether they called the fight branch tense, with their words. Covers: **SC-5**, AT-18.

### Step G3: Bob's final POC sign-off
- Owner: Bob (gate G-signoff)
- Depends on: G2, and a green run of step 14's suite on `main`
- Touches: this file (Results)
- Deps change: no
- Bob confirms SC-1..SC-5 and closes M1. Phase 2 (tower control, PRD §13) is planned as a separate milestone.

## Local demo slice

- Owner: Wright (adds it); Bob runs it locally
- Depends on: 1
- Touches: `apps/burgomaster-funeral-poc/src/web/**`, `apps/burgomaster-funeral-poc/src/server/**`, `apps/burgomaster-funeral-poc/src/e2e/**`, `apps/burgomaster-funeral-poc/package.json`, `apps/burgomaster-funeral-poc/README.md`, and this plan section. Not `src/protocols/**`. Not `apps/tower-poc/**`.
- Deps change: no
- Deviation: built in the existing web, server and e2e packages, because the launch required that layout. `src/demo/**` is not added. Protocols are unchanged. No new dependencies. The demo script is the one local command (`pnpm -F burgomaster-funeral-poc demo`, which builds the static UI and starts the host). The slice locks all four hunters present when the host begins (there is no sanctuary step). E16 accents pulse the screen; the asset kit has no separate accent audio, so none is substituted (the accent id is `screen-pulse`). Spoken captions strip the script's emphasis asterisks.
- Scope: an extra PR that shows join by QR, one device holding all 4 hunters, the opening moments with captions and the ambient pulse, and the investigation picks with one private finding. A throwaway slice for feel; the batched steps replace it, and nothing depends on it.

## Batches

Every batch waits for all of its dependencies. Steps in a batch touch disjoint paths, and only step 1 changes dependencies. Wright runs at most three developers at once inside a batch; the merge order is the order listed.

| Batch | Steps | Depends on | Merge order | Why it is grouped this way |
|---|---|---|---|---|
| G0 | Bob approves the plan | — | — | Gate. **Done 2026-10-14 3:54 PM ET** |
| B1 | 1, 2, 3, 2b | G0 | 1, 3, 2, 2b | Everything that needs no app package yet. Step 1 is the only `Deps change: yes`; 2 is docs; 3 is data |
| Demo | Local demo slice | 1 | after 1 | Extra PR for Bob to run locally; not a gate |
| B2 | 4, 5, 6, 7, 8, 9, 10 | B1 | 4, 6, 5, 10, 7, 9, 8 | Server logic folders and the cue player, each in its own folder, built against `protocols` |
| B3 | 11, 12, 13 | B2 | 11, 12, 13 | Integration on the server, and the two UIs in separate folders |
| B4 | 14, 15 | B3 (15 needs only 11) | 15, 14 | Acceptance suite and log reconstruction |
| G1 | Bob playtests without the tower | B4 | — | Gate: SC-1 |
| B5 | 16+ | G1 | set after G1 | Fixes from the playtest |
| G2 | Bob records the SC-5 judgement | B5 | — | Gate: SC-5 |
| G3 | Bob's final sign-off | G2 | — | Gate |

Batch 1 cannot be wider: every code step needs step 1's package files and lockfile, and a second `Deps change: yes` step in a batch is not allowed.

## Coverage (PRD rev 4)

| Criterion | Steps | Acceptance tests |
|---|---|---|
| SC-1 full run with no tower, cues as screen half + fallback audio | 3, 5, 8, 10, 11, 12, 14, **G1** | AT-1, AT-2, AT-12, AT-12b, AT-26 |
| SC-2 nothing private on the Dashboard | 9, 10, 12, 14 | AT-3, AT-20, AT-24, AT-27 |
| SC-3 rejoin restores held hunters' private state | 4, 9, 13, 14 | AT-4, AT-5, AT-21, AT-25 |
| SC-4 stats rows reconstruct the run | 5, 7, 11, 15 | AT-14, AT-15 |
| SC-5 fight is tense | 6, **G2** | AT-18 |

PRD → steps (POC IDs): PRD-1 (1, 4, 11), PRD-2 (12), PRD-3 (9, 12), PRD-4 (9, 13), PRD-7 (5), PRD-8 (5), PRD-9 (5), PRD-10 (6), PRD-11 (8, 11), PRD-12 (3, 8), PRD-13 (3, 8), PRD-14 (6, 12), PRD-15 (6), PRD-16 (6), PRD-17 (5), PRD-18 (9), PRD-19 (9), PRD-20 (9), PRD-21 (5), PRD-22 (6), PRD-23 (7, 15), PRD-24 (7, 8), PRD-25 (11, 12, 13), PRD-26 (10), PRD-27 (10), PRD-29 (5, 15), PRD-30 (13), PRD-31 (11, 12), PRD-32 (4), PRD-33 (4, 12), PRD-34 (4, 11), PRD-35 (9, 13), PRD-36 (4), PRD-37 (4, 6), PRD-38 (7), **PRD-39 (3, 8, 12)**, **PRD-40 (3, 8, 10)**, **PRD-41 (2b, 7, 11, 15)**, **PRD-42 (2b, 12)**, PRD-43 (docs only, nothing built). AT-31 (14), AT-32 (14).

Phase 2, not in M1: PRD-5, PRD-6, PRD-28, the §13 tower halves of PRD-1, -2, -11, -12, -13, -24, -29, R3-3 suppression, R3-10 self-test, host tower mode, and AT-1 / AT-2 / AT-15 / AT-26 (tower), AT-13, AT-29, AT-30.

## Rulings (PRD rev 3 and rev 4): all resolved

All questions this plan raised are answered in the PRD. Nothing is pending for Gamewright.

| Ruling | Answer, in short | Steps |
|---|---|---|
| R3-1 | No in-app battle; the Dashboard battle status screen shows present hunters, foes after modifiers (min 1), advantages by trait with the +2 cap, Forewarned card; host taps Won / Lost | 6, 12 |
| R3-2 | Pause when a hunter has no connected holder; no force-continue; resume by reassignment or rejoin | 4, 9, 11, 12 |
| R3-3 | Screen half always plays. Fallback-audio suppression with a working tower is Phase 2; in the POC fallback audio always plays (R4-2) | 8 |
| R3-4 | Accents seeded and logged, part of determinism (POC: Dashboard accents; tower mode is Phase 2) | 7, 8, 15 |
| R3-5 | E15a applies to no funeral moment | 5 |
| R3-6 | Investigation: one unique pick per present hunter, private until all lock, host Continue | 5, 6, 13 |
| R3-7 | Each stake is one item; spent holy water removed at once; carried holy water counts toward +2 | 6 |
| R3-8 | Forewarned chosen on the device, first answer wins, forced sit-out at 2, logged | 6, 7, 13 |
| R3-9 | One end line and fun rating per held hunter, stored per hunter + device | 5, 7, 10, 13 |
| R3-10 | Self-test: Phase 2 | — |
| R3-11 | `.08` reuses the `.07` still | 10 |
| R3-12 | `.07~fight-lost~no-wren` plays narrator only | 5, 10 |
| R4-1 | Tower control is Phase 2; the POC drives no tower | all (no tower code) |
| R4-2 | Every cue plays screen half + fallback audio; E16 is a Dashboard ambient bed | 3, 8, 12 |
| R4-3 | Cue IDs unchanged; the cue sheet is the contract | 3, 8, 10 |

Script status: Loremaster's five moments (`.07~fight-lost~no-wren` and `end.private.<hunter>` ×4) are written in `assets/stories/dracula/scripts/n2-burgomasters-funeral.md`. The app's copy (`assets/script/n2-burgomasters-funeral.md`) and the manifest entries for them still need voice, renders and entries; the readiness check (step 10) reports them until then.

Note on the cue sheet path: PRD-40 names `shared/tower/cues.json`; the asset kit already has `assets/cues/cue-sheet.json`, and assets stay where they are (G0). Step 3 uses the existing file and the spec (step 2) records the mapping.

## Results

- **G0** — approved by Bob, 2026-10-14 3:54 PM ET. The PRD (rev 3 at approval, rev 4 now) is the intent. Condition: the funeral POC uses the `apps/tower-poc` source layout (`src/{web,server,protocols,e2e}`, tests beside their files, `data/`, `docs/`, `plans/`, `spec.md`, `README`; `assets/` unchanged).
- **Step 1** — scaffold and the protocols contract. `spec.md` is left for step 2 (this step does not add it). The cue sheet was not changed (step 3 is deferred). No tower code.
