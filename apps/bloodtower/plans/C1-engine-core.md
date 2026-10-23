# C1 — Engine core: the loop stack on an event log (build plan)

**Status:** draft for Bob, 2026-10-23. Nothing is built. Waiting on G0.
**Source:** spec §1a (D32 to D38), decisions [0004](../../../research/decisions/0004-tower-package.md) and [0005](../../../research/decisions/0005-seeded-rng-package.md), and the game-design cards: the loop stack (DEC-132 to DEC-147, MEC-032 to MEC-039), the session loop (DEC-152 to DEC-155), the event log (DEC-107), the day (DEC-077, DEC-078, DEC-085, DEC-108, DEC-109) and the names (DEC-186 to DEC-206).
**Goal:** replace R1's session engine with the reducer core, move the shell flow onto it, and play one day of a test story end to end, with Save and quit and resume.
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

- Loops past the day slice: encounters beyond one building action, quests, battles, events, skulls, chapters past the first, the outcome screens. Plan C2 builds them, one loop card at a time.
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
- Touches: `packages/rng/**`, `packages/README.md`, `apps/prototypes/src/web/lib/{rng.ts,rng.test.ts}`, `apps/prototypes/src/web/package.json`, the prototype pages' imports of `lib/rng.ts`, `pnpm-lock.yaml`
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
  - `packs-v2/base` holds the hero pool (DEC-099, DEC-100) and the building types the day slice needs. `packs-v2/test` is a one-chapter test story.
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
  - The session loop (MEC-039) runs Connect Tower and calibrate once, then one game per pass, and returns to Pick Story after a game ends, not to Connect Tower (DEC-152).
  - The game loop's setup runs Pick Story, Game settings, Claim Heroes (DEC-098: a claimed hero greys out for others) and the pack's setup steps, with the Back rules of D31.
  - A dropped iPad pauses until every hero is claimed again (DEC-154). A lost tower pauses until a Reconnect press, or Save and quit (DEC-155). Nothing reconnects by itself.
  - There is no "Play without tower" path.
  - Engine tests cover each screen's forward and Back moves and both pauses.

### Step 7: Event store and checkpoints
- Depends on: 3
- Touches: `apps/bloodtower/src/server/events/**`, `apps/bloodtower/src/server/db/{schema.ts,migrations.ts}`, `apps/bloodtower/src/server/scripts/timingReport.ts`
- Deps change: no
- Runs: local
- Model: opus
- Done when:
  - An `events` table and a `checkpoints` table as D37 describes. Rows are only ever inserted, and a test fails on any update or delete statement in `src/server/events`.
  - Resume loads the last checkpoint and replays later events. With the same versions the state equals the live state. With a different engine version it loads the checkpoint, logs a `version-changed` event and goes on.
  - The timing report rebuilds a run from events, with the same totals rules as today (D6).

### Step 8: Day slice
- Depends on: 6
- Touches: `apps/bloodtower/src/engine/loops/{chapter,day,group-turn,encounter}/**`, `apps/bloodtower/src/engine/sim/**`, `apps/bloodtower/src/server/scripts/simulate.ts`, `apps/bloodtower/src/server/package.json` (script entry only)
- Deps change: no
- Runs: local
- Model: opus
- Done when:
  - One chapter loops on days (DEC-135). A day rolls every group's moves (DEC-102, DEC-108), plays each group's turn (moves spent on spaces and one building action, DEC-078), loses unspent moves (DEC-149), and ends with a checkpoint effect.
  - `pnpm --dir apps/bloodtower simulate --games 1000 --days 10 --seed s` plays headless and prints moves per day and actions per group. The same seed prints the same report.
  - Not required: events, quests, battles, skulls, chapter exits.

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
  - New e2e: Save and quit at the end of day 2, restart the host, resume, and day 3 starts with the same purse, positions and seed.
  - The old-names check of D38 runs in `pnpm check` over `src/engine`, `src/protocols/v2` and `packs/`.
  - This step may exceed 400 lines. If its review finds it too large, it splits into "server on the core" and "web on v2 views" before round 2.

### Step G-C1: Bob plays it
- Owner: Bob (gates G-playtest and G-signoff)
- Depends on: 9
- On the Mac with the TV, one iPad and the real tower: connect, calibrate, pick the test story, claim heroes, play two days, Save and quit, restart, resume, play a third day. Notes go in `docs/playtests/`.

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

(none yet)
