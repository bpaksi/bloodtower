# C2 audit: the C1 code against the cards

- Plan step: C2 step 1 ([plan](../../plans/C2-session-shell.md))
- Read on: `main` at `fcdb2490`, 2026-10-31
- By: Claude, for Bob at gate G-A
- Method: the line counts and the importers of every module in `apps/bloodtower/src`, then the session shell read against MEC-039, SCR-021 and AREA-100. It reads the code; it changes nothing.

## Answer to Bob's question 1

"Do we create new and treat existing code as a POC?" **No rewrite.** The loop runtime, the event log, protocol v2 and pack format v2 already follow the decided design, and nothing about them depends on which story ships. Two parts need real rework: the session shell, which C2 rebuilds, and the v1 pack and story-card code, which C3 replaces when The Ruined Keep pack lands. Five small files have no live importer (three to delete, two for the volume test to wire in), and Goodbye's two files serve a screen parked for 1.1.

## Verdicts

Lines include tests; the tests' share is in brackets.

### Engine (`src/engine`, 5.7k)

| Folder | Lines | Verdict | Why |
|---|---|---|---|
| `loop/` | 246 | keep | The DEC-143 loop template runtime. Every level runs on it |
| `loops/session/` | 2,817 (1,205) | **rework (C2)** | `stepShell.ts` (545) routes presses with a chain of `promptId` checks rather than MEC-039's nodes. It still has the C1 flow: a splash with Continue / Connect Tower, Pick Game, no base board setup (it is a pack step), no volume test, a Reconnect-or-Quit pause (DEC-155), and Goodbye (parked by DEC-628). C2 features 05 to 08 rebuild it as MEC-039 |
| `loops/game/` | 459 (0) | **rework (C2)** | The game loop's setup still holds Tower connect (MEC-039 moves it to the session's Enter). It has no Play again or Continue track (DEC-283, DEC-708). It has no tests of its own; `session/shell.test.ts` covers it |
| `loops/{chapter,day,group-turn,encounter,play}/` | 1,128 (330) | keep | The day slice (AREA-077). C3 extends these levels |
| `sim/` | 270 | keep | Headless simulator |
| `views/` | 376 | keep | `project(state, audience)`. Each C2 feature adds its screens |
| `step.ts`, `events.ts`, `effects.ts`, `state.ts` | 187 | keep | Core reducer and its schemas |

### Server (`src/server`, 11.8k)

| Folder | Lines | Verdict | Why |
|---|---|---|---|
| `core/` | 1,187 | keep, small rework (C2) | `goodbyeIdle` sends the tower to idle at Goodbye; in 1.0 it is Done for tonight, back to the landing painting (DEC-713). Feature 06 |
| `events/`, `db/` | 1,779 | keep | Append-only event log, checkpoints, the one autosave (D37, DEC-208) |
| `hub/` | 1,162 | keep | The host. `host.ts` (759) keeps a volume-test wait option that nothing in the core flow uses; feature 05 wires it to SCR-006 |
| `tower/` | 681 | keep, small rework (C2) | `volumeTest.ts` (71) has no importer outside its test. SCR-006 says "built in the POC", but the core flow never runs the volume test. Feature 05 wires it in |
| `pack/` (v1 loader) | 2,644 (1,190) | **rework (C3)** | `load.ts`, `assets.ts`, `camera.ts`, `audio.ts` still load v1 story metadata and its assets, and the host serves them. C3 moves story loading to pack v2 with The Ruined Keep, and A1's asset adapter takes the asset half |
| `pack/v2/` | 647 | keep | Pack format v2 loader and lint |
| `log/` | 776 | keep | Host log (decision 0003) |
| `timing/` | 388 | partly dead | `log.ts` (91) and `stats.ts` (34) have no importer outside tests: **delete**. `clock.ts` stays |
| `control/` | 91 | dead | `lock.ts` (63) has no importer outside its test: **delete** |
| `scripts/` | 1,589 | keep | `packLint`, `playtest` and `simulate` are package scripts. `timingReport` reads the event log |

### Protocols (`src/protocols`, 3.9k)

| Part | Lines | Verdict | Why |
|---|---|---|---|
| `v2/`, `pack-v2/` | 1,726 | keep | Protocol v2 and pack format v2 |
| `pack.ts`, `storyCard.ts`, `control.ts` (v1 pack and its control shapes) | 882 | **rework (C3)** | The engine's session state still reads the v1 story card from `pack.ts`. It goes once stories load from pack v2 (C3) |
| `timing.ts`, `keeper.ts`, `opening.ts`, `devices.ts`, `hostLog.ts`, `towerStatus.ts`, `volumeProtocol.ts` | 372 | keep | Live shapes the engine, host and web read |

### Web (`src/web`, 6.9k)

| Part | Lines | Verdict | Why |
|---|---|---|---|
| `components/board/` | 2,008 (558) | keep, rework in places (C2) | `StartupBoard.tsx` (314) draws the splash pair and Pick Game (features 05, 06). `DialogFrame` lets the connect dialog fill the height (DEC-705, feature 03) |
| `components/device/` | 1,078 (162) | keep, rework in places (C2) | `ChromeBar.tsx` has no Close in the Menu and offers only Quit (DEC-707, feature 04). `IpadCorners.tsx` crops the move-map mock (DEC-706, waits for ART-080) |
| `components/title/` | 187 | keep, rework (C2) | `TitleScreen` is the only place that creates `BoardAudio`, so the ambient bed stops off `/` (DEC-704, feature 02) |
| `components/GoodbyeTeardown.tsx`, `lib/goodbye.ts` | 38 | **delete (C2)** | Goodbye is parked for 1.1 (DEC-628). Feature 06 |
| `lib/volumeTest.ts` | 50 | dead today | No importer. Feature 05 uses it for SCR-006, or deletes it |
| `lib/audio/` | 693 | keep | Mixer, levels, loop points |
| the rest of `lib/`, `app/`, `components/errors/` | 2,900 | keep | |

### End-to-end (`src/e2e`, 8k)

Keep the harness (`support/`). These specs test screens C2 removes or moves, and each feature that changes a screen updates them: `area-077`, `acceptance`, `startup-shell`, `opening-screens`, `w3-pick-story` (Pick Game), `w4-party`, `w5-setup` (the board setup step).

### Packs

| Pack | Verdict | Why |
|---|---|---|
| `packs/base` | keep | Hero pool, building types, board graph |
| `packs/test` | keep, small rework (C2) | Its `lay-out-board` setup step becomes the base board setup (SCR-022) in the session's Enter. Feature 05 |
| `packs/dracula` | keep as metadata | Long goes (DEC-502, DEC-508). Feature 01. Its 1.0 rewrite is after 1.0 (DEC-691) |

## Where the code and the cards disagree

| Card says | Code does | Fixed in |
|---|---|---|
| SCR-005, DEC-275: one prompt, Connect Tower or Play without Tower, before any game | The splash shows Connect Tower beside a button labelled Continue, and Connect Tower also follows Game settings | C2 feature 05 |
| SCR-006: the volume test, "built in the POC" | Not in the core flow | C2 feature 05 |
| SCR-022: base board setup once per session | A pack setup step in every game | C2 feature 05 |
| SCR-021, DEC-709: Continue on the session screen | Continue sits on Pick Game | C2 feature 06 |
| DEC-628, DEC-713: Done for tonight returns to the landing painting | Goes to Goodbye | C2 feature 06 |
| DEC-301: a tower lost mid-game offers Reconnect, Go on without, or Quit | Reconnect or Quit only (DEC-155) | C2 feature 08 |
| DEC-704: ambient bed on every board screen | Plays only on `/` | C2 feature 02 |
| DEC-705, DEC-706, DEC-707 | GC1-02 to GC1-04 | C2 features 03, 04, and corners once ART-080 lands |

## Lines for the C3 plan

- Move story loading from the v1 loader (`server/pack/load.ts` and its helpers) and `protocols/pack.ts` to pack format v2, with The Ruined Keep (AREA-097) as the first v2 story.
- Give `engine/loops/game` its own tests once its Continue and Play again tracks exist.
- Delete `server/timing/{log,stats}.ts` and `server/control/lock.ts` with their tests, if no C2 feature has already done it.
