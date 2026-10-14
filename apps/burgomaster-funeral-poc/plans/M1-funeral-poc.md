# M1 — Burgomaster's Funeral POC (build plan)

**Status:** draft for Bob's review, 2026-10-14. Nothing is built. No step starts before gate G0.
**Source:** `docs/PRD.md` rev 2, including "Decisions after review (2026-10-14)" (OQ-12 resolved, E15a, E16, E17, investigation advantages). Where this plan and the PRD differ, the PRD wins until the spec (step 2) is approved.
**Goal:** the scene `n2-burgomasters-funeral` plays end to end on the Mac host, the Dashboard and 1+ devices holding all 4 hunters, with and without the tower, and every success criterion SC-1..SC-5 is met.
**Exit condition:** AT-1..AT-28 pass (AT-18 by Bob's notes), and Bob signs off at G3.

Process: `docs/sdlc.md` "Parallel work". Each build step is one worktree (`pnpm wt`), one branch and one PR; the coordinator runs each batch. On every PR the verifier posts its run and the two adversaries (`adversary-bugs`, `adversary-prd`) post findings; the developer fixes them, for at most 3 rounds. The coordinator squash-merges PRs one at a time once CI is green and both adversaries report `Blocking: none`. A PR still blocked after round 3 is labelled `needs-bob`, its step stops, and the coordinator reports it to Bob; steps that depend on it wait. Steps marked **Owner: Bob** are gates: the next batch depends on them and nothing after a gate starts until Bob records his sign-off in the Results section below.

**`apps/tower-poc` is a black box** (PRD §2, §3). This app talks to the running tower-poc service over its existing WebSocket protocol (`command{capabilityId, params}`) as a client. It does not import from `apps/tower-poc` (cross-app imports fail `pnpm check`), does not change it, and declares the few message shapes it sends and reads itself. Tests use tower-poc's mock mode, run as a separate process.

## App layout (made in step 1)

```text
apps/burgomaster-funeral-poc/
  package.json                 # "burgomaster-funeral-poc": dev / start / build / e2e for the parts
  spec.md                      # step 2
  src/engine/                  # "burgomaster-funeral-poc-engine": pure TypeScript, no I/O. Rules, scene runner, readiness
    src/types.ts               # the contract every later step builds against (state, moments, events, messages)
  src/server/                  # "burgomaster-funeral-poc-server": Node host: WS hub, session, SQLite, tower client
  src/web/                     # "burgomaster-funeral-poc-web": Next.js App Router: Dashboard + device views
  src/e2e/                     # "burgomaster-funeral-poc-e2e": Playwright, ports from .wt.json
  assets/                      # exists: manifest.json, script, stills, audio, cards, cues
```

Stack (R-ENG-9, repo conventions): Next.js + React, pnpm workspace, SQLite through better-sqlite3 + Drizzle (as in tower-poc), `ws`, Zod, Vitest, Playwright, Biome. Exact pins. Ports and the SQLite folder come from `.wt.json` in a step worktree and default to 4767 (dev) / 4768 (e2e) and `apps/burgomaster-funeral-poc/data/` in the main checkout, so this app never collides with tower-poc's 4747/4748.

## Steps

### Step G0: Bob approves this plan
- Owner: Bob (gate G-plan)
- Depends on: none
- Touches: this file (the sign-off line in Results)
- Deps change: no
- Bob reviews the steps, batches, `Touches` and the open questions, and decides which open questions need Gamewright's answer before batch 2. Covers: process gate (sdlc G-plan).

### Step 1: Scaffold the app parts and the type contract
- Depends on: G0
- Touches: `apps/burgomaster-funeral-poc/package.json`, `apps/burgomaster-funeral-poc/README.md`, `apps/burgomaster-funeral-poc/src/*/package.json`, `src/*/tsconfig.json`, `src/*/vitest.config.ts`, `src/engine/src/types.ts`, `src/engine/src/index.ts`, `src/server/index.ts`, `src/server/config.ts`, `src/web/next.config.ts`, `src/web/app/layout.tsx`, `src/web/app/page.tsx`, `src/e2e/playwright.config.ts`, `src/e2e/tests/smoke.spec.ts`, `.gitignore` (`apps/burgomaster-funeral-poc/data/`), `pnpm-lock.yaml`
- Deps change: **yes** (the only one in this plan; every dependency later steps need is added here)
- Scope: the four parts with their package.json files and pinned deps; `config.ts` reads `.wt.json` for ports and `dataDir`; the Next.js shell with the "Burgomaster's Funeral POC" door (flow step 1); a smoke e2e test. `types.ts` holds the shared contract from PRD §6–§8: hunter ids, per-hunter state (`corruption`, `holders`, `location`, `present`, `carried_items`), story items, moment ids and targets (`dashboard` | `ipad:<hunter>`), cue names, event types and payloads from §8, and the WS message envelope. Later steps may add to their own modules only; a change to `types.ts` after this step is a plan deviation.
- Covers: PRD-1 (structure), R-ENG-9. SC: none directly.
- Proof: `pnpm check` and `pnpm build` green; smoke e2e passes on the `.wt.json` e2e port.

### Step 2: Write `spec.md` with a decision log
- Depends on: G0
- Touches: `apps/burgomaster-funeral-poc/spec.md`
- Deps change: no
- Scope: the spec the sdlc loop requires for a Full-tier app, drafted from PRD rev 2 and the post-review decisions. Records each open question below as "assumed default, pending Gamewright" and flags PRD conflicts. Docs only; no code.
- Covers: all PRD IDs (traceability table), SC-1..SC-5 (acceptance mapping).

### Step 3: Tower cue map data
- Depends on: G0
- Touches: `apps/burgomaster-funeral-poc/assets/cues/**`
- Deps change: no
- Scope: the cue map (`cues.json`) entries `dim-all`, `heartbeat`, `skull-drop` (physical step, not a tower command), the investigation `seal-flicker` risky cue, the self-test pair, and the E16 ambient beds (dusk breathe, wake flicker, accents). Each entry: name, capability id, params, status (Verified / Library / GAP), and its screen + Mac-audio fallback. No colour, no looping tower audio, no waiting on sound end. Data only.
- Covers: PRD-12, PRD-13, E13, E16. SC-1 (fallback half).

### Step 4: Party, presence and holdings state
- Depends on: 1
- Touches: `apps/burgomaster-funeral-poc/src/engine/src/state/**`
- Deps change: no
- Scope: pure reducers for party state; device holdings (take / release / dashboard change); start gate (all 4 held); presence lock at scene start (≥1 present; later changes ignored); unheld pause and resume, including the resolved OQ-12 (a sole holder disconnecting pauses play); present-only item counting.
- Covers: PRD-1, PRD-32, PRD-33, PRD-34, PRD-36, PRD-37, E15, OQ-12 decision. AT-19, AT-22, AT-23, AT-25 (revised). SC-3 (state side).

### Step 5: Scene runner and variant resolution
- Depends on: 1
- Touches: `apps/burgomaster-funeral-poc/src/engine/src/scene/**`
- Deps change: no
- Scope: the moment sequence from the script (`.01 → … → .10`), event moments (`.lid-choice`), the E17 investigation round before `.lid-choice`, variant choice (`~no-<hunter>`, combined variants first, cut when the stand-in is absent too, `.04~holy-symbol`), E15a presence exemption, the `.06` story flag, the night 2 → 3 phase step, seeded determinism.
- Covers: PRD-7, PRD-8, PRD-9, PRD-17, PRD-21, PRD-29, E15a, E17. AT-11, AT-12, AT-12b, AT-15 (engine side). SC-1, SC-4 (inputs).

### Step 6: Choice, fight and cost rules
- Depends on: 1
- Touches: `apps/burgomaster-funeral-poc/src/engine/src/rules/**`
- Deps change: no
- Scope: lid choice (Nail offered only with a present stake carrier; stake −1); foe count (base, nailed −1, Mother bars the window −1, min 1); fight-lost costs by lid choice; corruption victim from present hunters with the instant-loss guard and `~blocked` redirect; item loss from present carriers; `cost_unpayable`; skull drop cap 2 per night and supply < 6 conversion to a night-5 ledger foe; win/loss check after each change; investigation advantages and the +2 per hunter cap.
- Covers: PRD-10, PRD-14, PRD-15, PRD-16, PRD-22, PRD-37, E9, E14. AT-6, AT-7, AT-8, AT-9, AT-10, AT-28. SC-5 (mechanics behind the tension).

### Step 7: SQLite event log and stats tables
- Depends on: 1
- Touches: `apps/burgomaster-funeral-poc/src/server/db/**`
- Deps change: no
- Scope: Drizzle schema and migrations for `games`, `sessions`, `devices`, `game_heroes`, `clock_ticks`, `events` (append-only, the source of truth), `encounters`, `combats`, `resource_snapshots`, `inventory_changes`, `tower_activity`, `flags`, `outcomes`; writers for every §8 event type; UTC times, nulls for unknowns, seed and pack version. Database file under the configured data folder.
- Covers: PRD-23, PRD-24, PRD-38. SC-4.

### Step 8: Tower client and cue dispatcher
- Depends on: 1, 3
- Touches: `apps/burgomaster-funeral-poc/src/server/tower/**`
- Deps change: no
- Scope: a WS client to the tower-poc service (black box): explicit connect, calibrate, self-test, battery, skull-drop events; "Play without tower" at every step; no command while calibrating (cue → rejected → fallback); automatic cues per moment with the fallback always resolved; disconnect pauses cues and offers manual Reconnect + recalibrate; nothing automatic or retried; E16 ambient bed with seeded accents, suppressed during speech, choices and calibration. Tested against tower-poc in mock mode and a fake WS server.
- Covers: PRD-5, PRD-6, PRD-11, PRD-12, PRD-13, PRD-24, PRD-28, E16. AT-13, AT-26. SC-1.

### Step 9: Channels, privacy routing and rejoin
- Depends on: 1
- Touches: `apps/burgomaster-funeral-poc/src/server/channels/**`
- Deps change: no
- Scope: the WS hub: one Dashboard channel and one private channel per held hunter; `ipad:<hunter>` fans out to every holder, only while that hunter is present; the server refuses any `.private.*` payload on the Dashboard channel; device tokens bound to (session, device); rejoin restores holdings, current private moments, status line and pending choice; join token rotation for the QR.
- Covers: PRD-3 (token side), PRD-4 (join side), PRD-18, PRD-19, PRD-20, PRD-35 (payload side). AT-3, AT-4, AT-20, AT-24, AT-27. **SC-2, SC-3.**

### Step 10: Readiness check against the asset index
- Depends on: 1, 3
- Touches: `apps/burgomaster-funeral-poc/src/engine/src/readiness/**`
- Deps change: no
- Scope: before play, every moment id the joined party can reach resolves in `assets/manifest.json` (`@dashboard` / `@ipad`, `@phone` → `@ipad` → text fallback), every private moment has a line per joined hunter, every `~no-<hunter>` variant has voice and render, every cue has a fallback, and no private moment targets the Dashboard. Reports what is missing; draft renders are allowed.
- Covers: PRD-26, PRD-27. AT-17. SC-1 (precondition), SC-2 (static check).

### Step 11: Session orchestrator and host actions
- Depends on: 4, 5, 6, 7, 8, 9, 10
- Touches: `apps/burgomaster-funeral-poc/src/server/session/**`, `apps/burgomaster-funeral-poc/src/server/server.ts`
- Deps change: no
- Scope: the single authoritative game state on the Mac; wires state, scene runner, rules, event log, tower client and channels; host actions (Next, presence step, party kit confirm, lid choice, Won/Lost, victim and item picks, skull Done, override, End for now, Concede); computes the mini summary from stored stats only.
- Covers: PRD-1, PRD-11, PRD-25 (server), PRD-28, PRD-31, PRD-34. AT-1, AT-2, AT-5 (server). SC-1, SC-4.

### Step 12: Dashboard UI
- Depends on: 4, 5, 6, 7, 8, 9, 10
- Touches: `apps/burgomaster-funeral-poc/src/web/app/dashboard/**`, `apps/burgomaster-funeral-poc/src/web/components/dashboard/**`
- Deps change: no
- Scope: 1080p 16:9 play view with the fixed zones (phase/night, story items, corruption, skulls, tower chip); ≥28 px text, ≥48 px numbers; QR + numeric join overlay; roster with holders and the start gate; "Who is at the Sanctuary"; party kit; tower init stub with the calibration cover; moment player (stills, clips, Mac audio); lid-choice, fight and skull-drop panels; the neutral `.09` line; unheld-pause banner; D8 phase card; mini summary; End for now / Concede. Built against `types.ts` messages with a fake server in tests.
- Covers: PRD-2, PRD-3, PRD-5 (UI), PRD-14 (UI), PRD-25, PRD-31, PRD-33 (UI). SC-1, SC-2 (shows nothing private).

### Step 13: Player device UI (iPad and phone)
- Depends on: 4, 5, 6, 7, 8, 9, 10
- Touches: `apps/burgomaster-funeral-poc/src/web/app/play/**`, `apps/burgomaster-funeral-poc/src/web/components/device/**`
- Deps change: no
- Scope: join page and hunter picker (names and portraits only, shared-secret notice); one card per held hunter with name and portrait; private moments, status and pending choice per hunter; investigation pick; carried items with the stake first; phone view (R-LF-10) with one decision at a time, hunter switcher and haptic tap; ≥44 pt targets; personal summary line and 1–5 fun rating; rejoin by token.
- Covers: PRD-4, PRD-30, PRD-35, PRD-25 (device). AT-16, AT-21. SC-3 (UI side).

### Step 14: End-to-end acceptance suite
- Depends on: 11, 12, 13
- Touches: `apps/burgomaster-funeral-poc/src/e2e/tests/**`
- Deps change: no
- Scope: Playwright runs of AT-1..AT-28 (except AT-18) with the tower-poc service in mock mode and in "Play without tower"; Dashboard payload capture for AT-3; device reload and network kill for AT-4, AT-5, AT-25; screenshots at Dashboard, iPad and phone sizes.
- Covers: all ATs except AT-18. SC-1 (mock), SC-2, SC-3.

### Step 15: Reconstruct-from-log script and determinism check
- Depends on: 11
- Touches: `apps/burgomaster-funeral-poc/src/server/scripts/**`
- Deps change: no
- Scope: a script that rebuilds the moment sequence, lid choice, fight result, costs, skull outcome, cue results and device holdings from the `events` table alone, and a test that two runs with the same seed, party, choices and results give identical payloads apart from times and ids.
- Covers: PRD-23, PRD-29. AT-14, AT-15. **SC-4.**

### Step G1: Bob playtests the first end-to-end run
- Owner: Bob (gate G-playtest)
- Depends on: 14, 15
- Touches: `apps/burgomaster-funeral-poc/docs/playtest-notes.md`
- Deps change: no
- Bob plays the whole scene once with the physical tower connected and once in "Play without tower", on the test default (2 iPads, wren + agnes present), and writes notes: what broke, what felt wrong, and the cue rows seen. Only Bob connects the real tower. Covers: **SC-1** (hardware), AT-1, AT-2 on hardware.

### Step 16+: Fixes from the playtest
- Depends on: G1
- Touches: set per step when the plan is updated after G1
- Deps change: no (a dependency change needs its own step and a plan update)
- The coordinator turns G1's notes into numbered steps with their own `Touches`, in one plan-update PR, before any fix starts. Bugs follow `/bugfix` (failing test first).

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
- Bob confirms SC-1..SC-5 and closes M1. Covers: SC-1..SC-5.

## Batches

Every batch waits for all of its dependencies. Steps in a batch touch disjoint paths, and only step 1 changes dependencies. The coordinator runs at most three developers at once inside a batch (docs/sdlc.md); the merge order is the order listed.

| Batch | Steps | Depends on | Merge order | Why it is grouped this way |
|---|---|---|---|---|
| G0 | Bob approves the plan | — | — | Gate |
| B1 | 1, 2, 3 | G0 | 1, 3, 2 | Everything that needs no app package yet. Step 1 is the only `Deps change: yes`; 2 is docs; 3 is data |
| B2 | 4, 5, 6, 7, 8, 9, 10 | B1 | 4, 6, 5, 10, 7, 9, 8 | Pure engine modules and server modules, each in its own folder, all built against `types.ts` |
| B3 | 11, 12, 13 | B2 | 11, 12, 13 | Integration on the server, and the two UIs in separate folders |
| B4 | 14, 15 | B3 (15 needs only 11) | 15, 14 | Acceptance suite and the log reconstruction |
| G1 | Bob playtests, with and without the tower | B4 | — | Gate: SC-1 |
| B5 | 16+ | G1 | set after G1 | Fixes from the playtest |
| G2 | Bob records the SC-5 judgement | B5 | — | Gate: SC-5 |
| G3 | Bob's final sign-off | G2 | — | Gate |

Batch 1 cannot be wider: every code step needs step 1's package.json files and lockfile to install, typecheck and test, and a second `Deps change: yes` step in the same batch is not allowed.

## Coverage

| Criterion | Steps | Acceptance tests |
|---|---|---|
| SC-1 full run, with and without tower | 3, 5, 8, 10, 11, 12, 14, **G1** | AT-1, AT-2, AT-12, AT-12b, AT-13, AT-26 |
| SC-2 nothing private on the Dashboard | 9, 10, 12, 14 | AT-3, AT-20, AT-24, AT-27 |
| SC-3 rejoin restores held hunters' private state | 4, 9, 13, 14 | AT-4, AT-5, AT-21, AT-25 |
| SC-4 stats rows reconstruct the run | 5, 7, 11, 15 | AT-14, AT-15 |
| SC-5 fight is tense | 6, **G2** | AT-18 |

Every PRD requirement maps to at least one step: PRD-1 (1, 4, 11), PRD-2 (12), PRD-3 (9, 12), PRD-4 (9, 13), PRD-5 (8, 12), PRD-6 (8), PRD-7 (5), PRD-8 (5), PRD-9 (5), PRD-10 (6), PRD-11 (8, 11), PRD-12 (3, 8), PRD-13 (3, 8), PRD-14 (6, 12), PRD-15 (6), PRD-16 (6), PRD-17 (5), PRD-18 (9), PRD-19 (9), PRD-20 (9), PRD-21 (5), PRD-22 (6), PRD-23 (7, 15), PRD-24 (7, 8), PRD-25 (11, 12, 13), PRD-26 (10), PRD-27 (10), PRD-28 (8, 11), PRD-29 (5, 15), PRD-30 (13), PRD-31 (11, 12), PRD-32 (4), PRD-33 (4, 12), PRD-34 (4, 11), PRD-35 (9, 13), PRD-36 (4), PRD-37 (4, 6), PRD-38 (7).

## Open questions for Gamewright

The PRD's own assumptions (OQ-1..OQ-14) stand as defaults unless listed here. These are places where the PRD is ambiguous or contradicts itself; the build does not guess at them. Step 2 records each one as pending.

1. **In-app battle vs table battle.** OQ-1 says there is no in-app battle engine and the host enters Won/Lost, but the investigation advantages (+1 Undead, +1 Wild per present hunter in round 1, Forewarned revealing the first battle card) and AT-28 ("advantage totals shown on the battle screen") need battle rounds and battle cards. What does the battle screen show, and where does "the first battle card" come from?
2. **Disconnects: pause or not.** The OQ-12 decision says a sole holder disconnecting pauses play, but PRD-20 ("shared play never blocks on a disconnected device"), §9 ("a disconnected device keeps its holdings, so it doesn't trigger the unheld pause") and AT-5 (kill a device's network at `.05`, shared play continues) were not updated. Does AT-5 hold only when the device is not a sole holder? Can the host override the pause?
3. **Heartbeat and skull-drop sound with the tower on.** The post-review decision says these play only without the tower, while §7 says the screen half of each cue (pulse plus heartbeat sfx from the Mac) always plays (R-UI-8). Does the screen pulse still play with the tower on, without the sound?
4. **Ambient accents vs determinism.** E16's random accents every 20–60 s: are they seeded and part of the deterministic run (PRD-29, AT-15), or outside it and left out of the comparison?
5. **E15a presence exemption.** Which moments of this scene count as "dusk and night-start"? Is `.01` one, so that it ignores presence? Is anything in the investigation round?
6. **Investigation round (E17) content.** The actions and findings are still being written. How many picks does each present hunter get, can two hunters pick the same action, does an absent hunter pick, and how does the table-talk beat end (host Next)?
7. **What counts as a story item for costs.** Is each stake one item, so that losing "1 story item" can mean one stake? If holy water is spent for +1 Undead, is it gone before fight-lost costs are picked? Does a spent holy water count toward the +2 cap?
8. **Forewarned cost.** "1 corruption or sit out the fight": who chooses, does that corruption go through the instant-loss guard, and does it count as a fight-lost corruption for stats?
9. **Fun rating and personal line, per player or per hunter.** PRD-25 says per player; the `fun_rating` event is keyed by hunter. A device holding several hunters: one rating or one per hunter? Where does the "personal line" text come from?
10. **Self-test pair (OQ-7).** Which sound and which light does the self-test use until a Verified pair exists?
11. **`.08` still.** Reuse `.07` or a new group still? Asset choice blocks the readiness check.
12. **`.07~fight-lost` with wren absent (OQ-5).** Confirm "narrator only" and whether Loremaster will write `~fight-lost~no-wren`.

Process note for Bob (not Gamewright): the app has a PRD but no `intent/` file. The sdlc loop starts from an intent in Bob's words. Bob may write `intent/0001-funeral-poc.md` (or name the PRD as the intent) at G0; step 2 then drafts the spec from it.

## Results

_None yet. Gate sign-offs go here with the date._
