# C1 — Engine core: the loop stack on an event log (build plan)

**Status:** approved for build (G0 passed), 2026-10-23 ET. Nothing is built. B1 may start.
**Source:** spec §1a (D32 to D38), decisions [0004](../../../research/decisions/0004-tower-package.md) and [0005](../../../research/decisions/0005-seeded-rng-package.md), and the game-design cards: the loop stack (DEC-132 to DEC-147, MEC-032 to MEC-039), the session loop (DEC-152 to DEC-155), the event log (DEC-107), the day (DEC-077, DEC-078, DEC-085, DEC-108, DEC-109) and the names (DEC-186 to DEC-206). Continue-only autosave and the session screen are PR #186 (DEC-208 to DEC-217). The Proving Grounds day slice is PR #188 (AREA-077, DEC-218 to DEC-226).
**Goal:** replace R1's session engine with the reducer core, move the shell flow onto it, and play the Proving Grounds day slice (AREA-077) end to end. The exit is Continue-only: Quit story lands on the session screen (SCR-021), Done for tonight ends the sitting, and Continue resumes the autosave until a new game replaces it.
**Exit condition:** every `Done when` below passes in CI with the mock tower, and Bob signs off at G-C1 on the Mac, TV, an iPad and the real tower.

The milestone is called C1, not R2, because R2 already names the requirement set `R2-xx` (`research/game-design/r2-screen-flow.md`).

Process: `docs/sdlc.md`, Full tier. One branch, worktree and PR per step. The review loop is §4.

## Shape

```text
            iPads ──act──►┐                               ┌──► board view / iPad views (protocol v2)
  Story board ──report──► │   host (src/server)           │
          tower outcome ─►│   hub · event store · timers ─┤──► tower commands (@dark-tower/tower executor)
                          │            │  ▲               │──► checkpoint rows
                          ▼            ▼  │               │
                    events table ◄── core (src/engine): (state, event) → { state, effects }
                                       loop stack: session → game → chapter → day → group turn → encounter → quest | battle
```

- `src/engine` (`bloodtower-engine`): the reducer, the loop template runtime, one module per loop level, the view projection, and the simulator. No I/O, no clock, randomness only from `@dark-tower/rng`.
- `src/server`: the hub, the event store and checkpoints, the timers, the tower session, and the effects runner. It feeds events in and carries effects out, and holds no game rule.
- `src/protocols`: protocol v2 messages and views, and pack format v2.
- `src/web`: renders views and sends `act`. It holds no game rule.

## Transition

The app keeps working between steps. Until step 9, the host runs the R1 engine unless `ENGINE=core` is set, and the web picks its screens from the protocol version in `welcome`. Step 9 makes the core the only engine and deletes the R1 engine, the sidecar client and the v1 messages. v2 packs live in `packs-v2/` until then, so the R1 Pick Story list does not show them as greyed cards. Step 9 moves them to `packs/`.

## Out of scope

- Loops past the Proving Grounds day slice (AREA-077): events, the Grey Stair, quests, battles, skull effects, chapters past the first, and the outcome screens. This slice's encounter is Enter and Leave only. The skull drop is prompted and recorded, and changes nothing (DEC-222). Plan C2 builds the rest, one loop card at a time. The past-games list and Play again (DEC-213 to DEC-216) are later than this slice (DEC-219).
- Story content past `packs-v2/test`. The Dracula pack stays metadata only.
- Stats screens. C1 writes the events they will read.
- Tower cues past the move roll's one short cue (DEC-108), and the drum sync (DEC-103, DEC-104), which is prototyped in tower-poc first.
- Any change to `apps/burgomaster-funeral-poc`.

## Steps

### Step G0: Bob approves this plan
- Owner: Bob (gate G-plan)
- Depends on: none
- Touches: this file (Results)
- Deps change: no
- Bloodtower has no `intent/` folder. The Full tier asks for an intent per change, in Bob's words. Bob writes `apps/bloodtower/intent/0001-*.md` for this change, or rules that this plan and the architecture review stand in for it.

### Step 1: `packages/rng` (decision 0005)
- Depends on: G0
- Touches: `packages/rng/**`, `packages/README.md`, `apps/prototypes/src/web/lib/{rng.ts,rng.test.ts,batch.ts,batch.test.ts,README.md}`, `apps/prototypes/src/web/{package.json,next.config.ts}`, every prototypes import of `lib/rng.ts` (pages and the game, logic and data modules, with their tests), `pnpm-lock.yaml`, this file (Results). `batch.ts` and `batch.test.ts` change only the import of the moved generator. `next.config.ts` sets `transpilePackages` so Next can compile the TypeScript package.
- Deps change: yes
- Runs: cloud
- Model: sonnet
- Done when:
  - `@dark-tower/rng` holds the generator and dice notation, moved with `git mv`. The prototypes import it, and `apps/prototypes/src/web/lib/rng.ts` is gone.
  - `eventRng(seed, seq)` returns a generator that depends only on those two values. A test shows the same seed and seq give the same draws whatever was drawn before.
  - A test pins seed `"bloodtower"` to its first ten `roll("1d6")` results as they are on `main` today, so prototype findings still replay.
  - `pnpm check` passes.
  - Not required: a new generator algorithm.

### Step 2: `packages/tower` (decision 0004)
- Depends on: G0
- Touches: `packages/tower/**`, `packages/README.md`, `apps/tower-poc/src/{protocols,server}/**`, `apps/tower-poc/src/*/package.json`, `apps/tower-poc/docs/reuse-guide.md`, `apps/prototypes/src/web/lib/tower/drift.test.ts`, `pnpm-lock.yaml`
- Deps change: yes
- Runs: local
- Model: opus
- Done when:
  - The protocol and inventory, session, executor, state store and records, adapters with the mock, and `diagLog` are in `@dark-tower/tower`, moved with `git mv` with their tests. tower-poc imports them, and its own tests and e2e pass unchanged.
  - Opening a second tower session in one process throws an error with a code. A test proves it.
  - The prototypes' drift test reads the package instead of `apps/tower-poc`.
  - The tower library pins are unchanged and `scripts/check-pins.mjs` passes.
  - Hardware check by Bob: tower-poc connects, calibrates and plays one sound on the real tower from `main` after the merge.

### Step 3: Core runtime
- Depends on: 1
- Touches: `apps/bloodtower/src/engine/**`, `apps/bloodtower/package.json`, `pnpm-lock.yaml`, `scripts/check-imports.mjs` (the engine's import rule), `apps/bloodtower/spec.md` (§1a D32 traceability)
- Deps change: yes (new workspace package)
- Runs: local
- Model: opus
- Done when:
  - `bloodtower-engine` exports `step(state, event) → { state, effects }`, the event and effect types (Zod schemas), and a loop runtime that runs any level written against the loop template (DEC-143): Enter, Start point, Body, Exit checked after a pass (DEC-137), Close, Result up, End point.
  - A test loop of two nested levels proves the order of every row of the template, including an End point that sees the result (DEC-142).
  - A prompt accepts the first press. A second press on the same prompt returns a `winner: false` press event and no state change.
  - `pnpm check` fails if `src/engine` imports `ws`, a SQLite package, `node:*`, `react`, or uses `Math.random`, `Date` or `crypto`.
  - Replaying the events of a run from its first event gives a state equal to the live one (a property test over 200 seeded random runs of the test loop).

### Step 4: Pack format v2 and the base content pack
- Depends on: G0
- Touches: `apps/bloodtower/src/protocols/pack-v2/**`, `apps/bloodtower/src/server/pack/v2/**`, `packs-v2/**`, `apps/bloodtower/spec.md` (§4 v2)
- Deps change: no
- Runs: local
- Model: opus
- Done when:
  - Pack format v2 has the story and base-content shapes of D34: identity and settings, chapters with their kingdoms and timed beats, entry points as lists of effects from the fixed set, conditions on flags and counters, quests by quest type, and asset ids. It uses the D38 names.
  - `packs-v2/base` holds the hero pool (DEC-099, DEC-100), the building types the day slice needs, and the RtDT board graph (DEC-221): printed space names (DEC-225) and kingdoms Arisilon (N), Brynthia (E), Durnin (S), Zenon (W), with data IDs keeping the direction letter (DEC-226). Claude drafts the graph from Bob's photo; Bob checks it before the day slice uses it. `packs-v2/test` is the one-chapter Proving Grounds story (AREA-077): one hero per kingdom at its citadel (DEC-223), and a 2d4 move roll with a floor of 2 and no modifiers (DEC-224).
  - The v2 lint refuses code in a pack (any key or value the schema does not know), an effect outside the fixed set, and a flag read that is never set. One bad pack per rule proves it.
  - `pnpm --dir apps/bloodtower pack:lint packs-v2/test` passes.
  - Not required: quest-type details beyond their names, which C2 fills.

### Step 5: Protocol v2
- Depends on: 3
- Touches: `apps/bloodtower/src/protocols/v2/**`, `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/spec.md` (§3 v2)
- Deps change: no
- Runs: local
- Model: opus
- Done when:
  - v2 has `hello`, `welcome`, `error`, `act{promptId, actionId, args}`, `narration-ended`, `log` (decision 0003), `boardView` and `deviceView`, in a strict envelope with `v: 2`.
  - The board view schema refuses everything §3 refuses today: a `.private.` id, any `ipad:` string, and the keys `bytes`, `raw`, `packet`, `capabilityId` and `params`.
  - `project(state, audience)` in the engine returns each view. A test over every setup screen shows an iPad view carries only its own heroes' private lines.
  - Each offered action carries a prompt id, action id, label, and `open` or a reason it is closed.

### Step 6: Session and game setup on the core
- Depends on: 3, 4
- Touches: `apps/bloodtower/src/engine/loops/{session,game}/**`
- Deps change: no
- Runs: local
- Model: opus
- Done when:
  - The session loop (MEC-039) runs Connect Tower and calibrate once, then one game per pass. After a game ends, including Quit story, the table lands on the session screen (SCR-021), not on Connect Tower (DEC-152, DEC-214).
  - For this slice SCR-021 offers New game and Done for tonight (DEC-219). New game goes to Pick Story. Done for tonight goes to Goodbye (SCR-020) and ends the session. The past-games list and Play again (DEC-213, DEC-215, DEC-216) come later. Seeds stay internal (DEC-217): there is no seed field and no fortune card.
  - The game loop's setup runs Pick Story, Game settings, Claim Heroes (DEC-098: a claimed hero greys out for others) and the pack's setup steps, with the Back rules of D31. Setup keeps the seals and skulls step (DEC-110, DEC-222) so the tower has skulls to drop. There is no Save button. The only stored game is the running autosave (DEC-208).
  - A dropped iPad pauses until every hero is claimed again (DEC-154). A lost tower pauses until a Reconnect press, or Quit story (DEC-155, DEC-208, DEC-218). Nothing reconnects by itself.
  - Quit story, from the pause, ends the game as quit (neither won nor lost), writes its record, keeps the autosave, and lands on SCR-021 (DEC-218). Pick Game shows Continue while that autosave exists; a new game replaces it. Continue runs the tower check (MEC-018).
  - There is no "Play without tower" path and no Save-and-quit exit.
  - Engine tests cover each screen's forward and Back moves, both pauses, Quit story onto the session screen, and Done for tonight.

### Step 7: Event store and checkpoints
- Depends on: 3
- Touches: `apps/bloodtower/src/server/events/**`, `apps/bloodtower/src/server/db/{schema.ts,migrations.ts}`, `apps/bloodtower/src/server/scripts/timingReport.ts`
- Deps change: no
- Runs: local
- Model: opus
- Done when:
  - An `events` table and a `checkpoints` table as D37 describes. Rows are only ever inserted, and a test fails on any update or delete statement in `src/server/events`.
  - Continue (DEC-208) loads the last checkpoint and replays later events. With the same versions the state equals the live state. With a different engine version it loads the checkpoint, logs a `version-changed` event and goes on. There is one autosave and no save slots.
  - The timing report rebuilds a run from events, with the same totals rules as today (D6).

### Step 8: Day slice
- Depends on: 6
- Touches: `apps/bloodtower/src/engine/loops/{chapter,day,group-turn,encounter}/**`, `apps/bloodtower/src/engine/sim/**`, `apps/bloodtower/src/server/scripts/simulate.ts`, `apps/bloodtower/src/server/package.json` (script entry only)
- Deps change: no
- Runs: local
- Model: opus
- Done when:
  - One chapter loops on days (DEC-135). The playable target is the Proving Grounds slice (AREA-077).
  - A day rolls every group's moves as 2d4 with a floor of 2 and no modifiers (DEC-102, DEC-108, DEC-224). The test story starts one hero per kingdom, alone at that kingdom's citadel; groups do not split or join (DEC-223).
  - A group's turn spends moves on spaces (1 move each). Enter and Leave are free. The only building action in this slice is Leave, and a group may walk through a building space without entering (DEC-078, DEC-220). Unspent moves are lost (DEC-149). After the last group's turn the app prompts the skull drop and the players record where it landed and on which building (DEC-064, DEC-222). The skulls have no effect. The day ends with a checkpoint effect.
  - The move map reads the RtDT board graph from base content (`packs-v2/base`, DEC-221). Spaces show their printed names (DEC-225). A kingdom shown to players is Arisilon (N), Brynthia (E), Durnin (S) or Zenon (W); data IDs keep the direction letter (DEC-226).
  - `pnpm --dir apps/bloodtower simulate --games 1000 --days 10 --seed s` plays headless and prints moves per day and actions per group. The same seed prints the same report.
  - Not required: events, the Grey Stair, quests, battles, skull effects, chapter exits. No villain, lieutenants or caravans run, so the chapter does not end on its own; Quit story is the way out (DEC-218, DEC-222).

### Step 9: Host switch-over
- Depends on: 2, 5, 7, 8
- Touches: `apps/bloodtower/src/server/**`, `apps/bloodtower/src/web/**`, `apps/bloodtower/src/e2e/**`, `apps/bloodtower/src/protocols/{index.ts,messages.ts,messages.test.ts,control.ts}`, `packs/**`, `packs-v2/**`, `apps/bloodtower/{README.md,spec.md}`
- Deps change: no
- Runs: local
- Model: opus
- Done when:
  - The host runs the core through the effects runner and the event store, and the tower through `@dark-tower/tower`. `src/server/session/`, `src/server/tower/sidecar.ts`, `TOWER_URL` and the v1 messages are gone. `packs-v2/` has moved to `packs/`.
  - The board and iPad render v2 views for every setup screen and the day slice, at the e2e suite's three viewports.
  - The e2e suite passes on the core, rewritten from AC-1 to AC-9 where they still apply: board display only, one winner per press, private lines only to their holders, the pauses, and a run rebuilt from events.
  - New e2e: at the end of day 2, Quit story from the pause ends the game as quit and lands on the session screen (SCR-021), which offers New game and Done for tonight. Done for tonight reaches Goodbye. Restart the host: Pick Game offers Continue (DEC-208), and day 3 starts with the same purse, positions and seed. The seed is not shown (DEC-217).
  - The old-names check of D38 runs in `pnpm check` over `src/engine`, `src/protocols/v2` and `packs/`.
  - This step may exceed 400 lines. If its review finds it too large, it splits into "server on the core" and "web on v2 views" before round 2.

### Step G-C1: Bob plays it
- Owner: Bob (gates G-playtest and G-signoff)
- Depends on: 9
- On the Mac with the TV, one iPad and the real tower: connect, calibrate, pick the test story, claim heroes, play two days. Quit story from the pause lands on the session screen (SCR-021); Done for tonight goes to Goodbye. Restart the host, Continue from Pick Game, and day 3 starts with the same purse, positions and seed. Notes go in `docs/playtests/`.

## Batches

- G0
- B1: 1, 4 (merge order: 1, 4)
- B2: 3
- B3: 2, 5, 6, 7 (merge order: 5, 7, 6, 2). Step 2 is this batch's only dependency change.
- B4: 8
- B5: 9
- G-C1

## Risks

- **Rules spread back into the host or the web.** Steps 5 and 9 review for any game decision outside `src/engine`. The views carry offered actions so the web never has to work out what is legal.
- **The event schema is the new frozen contract.** An event kind that changes shape breaks replay of old games. Event kinds are versioned from step 3, and a changed kind is a new kind.
- **Checkpoint state grows with the game.** One checkpoint a day keeps replay short. If a checkpoint is slow to write, compress it; the event log stays the source.
- **The tower move touches an app Bob uses for hardware experiments.** Step 2 is local, and its gate is a real-tower check.
- **The intent gap.** If Bob wants an intent first, G0 waits on it.

## Results

- G0 (2026-10-23 ET): Approved by Wright under Bob's process handoff (Wright+Warden own day-to-day gates). Plan + architecture review stand in for intent. Weekend slice = AREA-077 move+Enter/Leave+exit only; no Tower play / Keeper / combat. B1 may start (Step 1, then Step 4).
- Step 1 (2026-10-23): `@dark-tower/rng` holds the generator and dice notation, moved with `git mv`, plus `eventRng(seed, seq)`. Prototypes import the package and `lib/rng.ts` is gone. Seed `bloodtower` stays pinned to its first ten `1d6` totals from main: 3, 3, 5, 2, 5, 4, 2, 1, 1, 5. `pnpm check` exit 0 (Biome 636 files, repo tests 270, `@dark-tower/rng` 13, prototypes-web 118). Deviation: the deletion also rewrites imports in the game, logic and data modules and in `batch.ts` / `batch.test.ts`, updates `lib/README.md`, and sets `transpilePackages` in `next.config.ts` so Next can compile the TypeScript package. The batch runner stays in prototypes.
- Step 3 (2026-10-23): `bloodtower-engine` exports `step(state, event) → { state, effects }`, Zod event/effect schemas, and the DEC-143 loop runtime (`advanceLoops`, nested test loops). Prompt loser on a closed prompt leaves state unchanged. `checkEngineConstraints` in `scripts/check-imports.mjs`. Tests: nested template order, prompt winner, 200-seed replay. `pnpm check` exit 0. R1 `session/engine.ts` untouched; host still defaults to R1 until step 9.
- Step 4 (2026-10-23): Pack format v2 (`src/protocols/pack-v2`, `src/server/pack/v2`), `packs-v2/base` and `packs-v2/test`. `pnpm --dir apps/bloodtower pack:lint packs-v2/test` OK. Board graph drafted from `research/game-design/board-map.md`; uncertain adjacencies omitted — Bob workbench check still pending.
- Step 5 (2026-10-23): Protocol v2 (`src/protocols/v2`, envelope `v: 2`): `hello`, `welcome`, `error`, `act`, `narration-ended`, `log`, `boardView`, `deviceView`. The board view refuses a `.private.` id, an `ipad:` string, and the keys `privateMoment`, `bytes`, `raw`, `packet`, `capabilityId` and `params`. `project(state, audience)` in `src/engine/views` returns each view. On `pick-story`, `game-settings`, `tower-connect`, `claim-heroes`, `setup` and `begin`, an iPad view carries only its own heroes' private lines. Each offered action has a prompt id, an action id, a label, and `open` or a closed reason. `pnpm check` exit 0 (Biome 671 files, repo tests 272, bloodtower-protocols 77, bloodtower-engine 5). Deviation: the projection state is not on the step 3 reducer, and the engine imports the v2 schemas by a relative path so this step adds no dependency. v1 stays the host protocol.
- Step 7 (2026-10-23): `events`, `checkpoints` and `autosave` tables (D37) with append-only writers in `src/server/events`. `continueFromCheckpoint` loads the last checkpoint, logs `version-changed` when pack or engine version differs, then replays later `engine` events. One autosave row (DEC-208). `timingReport.ts` rebuilds presses and timing marks from the event log when an autosave game has rows. `pnpm check` exit 0 (bloodtower-server 258 tests, including append-only guard, continue replay, and event-log timing parity). R1 `control_presses` / `timing_marks` / `stat_events` stay until step 9; the host still writes them today.
- Step 6 (2026-10-23): Session loop (MEC-039) and game setup loops in `src/engine/loops/{session,game}` with `stepShell` reducer, multi-action `offered` prompts, tower connect/calibrate once per session, pick-game (Continue / New game), full setup (pick-story through begin with D31 Back rules, DEC-098 claims, DEC-110 seals-and-skulls before pack steps), play pause for dropped iPad (DEC-154) and lost tower (DEC-155), Quit story to SCR-021 with autosave kept (DEC-208, DEC-218), session screen (New game / Done for tonight, DEC-219), and goodbye. No play-without-tower or save-and-quit. Engine tests in `loops/session/shell.test.ts` (20 cases). Review fix: reclaiming heroes after an iPad drop re-applies tower-lost pause when the tower is still down; Reconnect offered only for tower-lost. Host still uses R1 `session/engine.ts` until step 9; `step.ts` unchanged.
- Step 8 (2026-10-23): Proving Grounds day slice (AREA-077) on the core: `chapter` → `day` → `group-turn` → `encounter` loops under `src/engine/loops/{chapter,day,group-turn,encounter}/`, board graph from `packs-v2/base` (DEC-221, DEC-225, DEC-226), 2d4 move roll floor 2 (DEC-102, DEC-224), walk / Enter / Leave (DEC-078, DEC-220), skull drop record (DEC-064, DEC-222), checkpoint effect at day end. Headless sim in `src/engine/sim/**` and `pnpm --dir apps/bloodtower simulate`. `pnpm check` exit 0 (bloodtower-engine 24 tests including `sim/sim.test.ts`; shell tests unchanged count). Host still R1 until step 9.
- Step 8 review fix (2026-10-23): Skull placement offers every building space plus stayed-inside (`skull-record` / `record`); `lastSkull` is set only on that press (DEC-064, DEC-222). Move-roll cue (DEC-108, CUE-006) queues `sound.play-stateful` via `requestTowerCommand` when a day enters. Group turn keeps a free Enter offer when the last walk lands on a building with no moves left (DEC-220). `pnpm check` exit 0.
