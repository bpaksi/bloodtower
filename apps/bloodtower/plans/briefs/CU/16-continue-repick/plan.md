Keep this a checklist; do not write a second design doc.

# Brief: CU / 16-continue-repick — Continue frees the heroes of iPads that are gone; the iPads joined now pick them

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (queue step 65, order 13a)
- Feature: 16-continue-repick
- Kind: fix (engine Continue and hold flow; the iPad-drop pause gets the Pick rows; no new copy)
- Owner: Gamewright (brief, evals); Hammer (build, inspect first)
- Related AREA/docs: Anvil's finding, relayed by Bob via Warden and Wright on 2026-11-20 6:38 AM ET (no issue yet; PR #557's body notes the held list read empty after Continue); AREA-047, AREA-100; rulings DEC-952 and DEC-953 (this brief); DEC-154, DEC-153, DEC-155, DEC-301, DEC-708, DEC-711, DEC-712
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (the pause reuses CU/08's approved Pick rows and the board's pause frame; see Open questions)
- Risk: High (restore and who acts for which hero). Negative, survival and restore evals are included.
- Depends on: its approval.md on main (normal brief approval). Build after C3/12 PR 2 (render) merges, which shares `web/components/device/**` and `CoreStoryBoard.tsx` (Overlaps).
- Builds: DEC-952 (Continue keeps a hold only for an iPad joined now); DEC-953 (Pick rows in DEC-154's pause; play goes on at the last pick)
- Deps change: no
- Runs: cloud

### The bug, from main (819454f)

- `server/core/session.ts` ~383 to ~405 (the Continue press, `continueRequested`): `state = { ...resumed.state, tower }`, then resets the Enter, the confirm, the tower choice and tonight's games from `live`. It keeps the saved `holdings` (hero id to device id) and the saved `devices` (the joined set) as they were when the game was saved.
- `resumeAutosave` (~907) does the same (`state = resumed.state`).
- After Save and quit, an iPad that left drops after the grace (`device-drop` clears its holds), but Continue brings the saved holds back. After a host restart, `restoreDevices` brings back the old tokens and a new iPad joins with a new id; the saved holds still name the old ids.
- No `device-drop` ever fires for a device id that is only in the save, so `pauseIfNeeded` (`engine/loops/session/stepShell.ts` ~228) sees every seated hero held and never pauses. A new iPad's `hero-hold` take (~357) is refused because the hero is held.
- Even when a hero does read unheld, the pause offers no Pick: `showHold` (`web/components/device/CoreDeviceScreen.tsx` ~882) is true only on `claim-heroes` and `begin`, and the board's pause frame says the tower has gone quiet (`CoreStoryBoard.tsx` ~81 to ~90) for every pause cause.

### Touches (checked against main 819454f)

**Continue (DEC-952)**
- `apps/bloodtower/src/engine/loops/session/continueSeats.ts` (new): `seatOnContinue(resumed, live)` sets `devices` to `live.devices`, keeps `holdings[hero]` only when its device is in `live.devices` (else `null`), then runs the pause check. Pure; no tower or store access.
- `apps/bloodtower/src/engine/loops/session/stepShell.ts`: export `pauseIfNeeded` (~228) for `continueSeats.ts`; no change to its rules. `hero-hold` (~357) is unchanged; it already unpauses the disconnect pause when every seated hero is held.
- `apps/bloodtower/src/server/core/session.ts`: the Continue branch (~383 to ~405) calls `seatOnContinue(state, live)` after the existing tower and reset lines; `resumeAutosave` (~907) does the same with the live state before it. `resumeSession` (~834, the lobby resume) is not changed.

**The pause gets the Pick rows (DEC-953)**
- `apps/bloodtower/src/engine/views/project.ts`: `claimFor` (~103) also applies on `screen === "pause"` with `pause.cause === "disconnect"` (~144), and the hero list there is the seated heroes only (`play.groups` hero ids).
- `apps/bloodtower/src/engine/loops/session/view.ts`: the screen line (~793) gives `${held} of ${seated} picked` on the disconnect pause, counting the seated heroes; the claim-heroes line is unchanged.
- `apps/bloodtower/src/web/components/device/CoreDeviceScreen.tsx`: `picking` (~852) and `showHold` (~882) are also true on the disconnect pause; the hero panels and Pick buttons (~1091 to ~1130) render as on Pick. The tower-lost pause (`TowerLostPause`, ~542, ~992) is unchanged.
- `apps/bloodtower/src/web/components/board/CoreStoryBoard.tsx`: in the pause frame (~81 to ~90), a disconnect pause shows the counter (the `claimCount` words from `web/lib/startupBoard.ts` ~180) in place of "The tower has gone quiet. The game waits."; the tower-lost frame is unchanged.

**Tests**
- `apps/bloodtower/src/engine/loops/session/continueSeats.test.ts` (new, EV-01 to EV-05, EV-12).
- `apps/bloodtower/src/engine/views/project.test.ts` or `engine/loops/session/shell.test.ts` (EV-06, EV-07; added cases only; the existing disconnect-pause tests at ~238 to ~290 stay as they are).
- e2e: `apps/bloodtower/src/e2e/tests/cu16-continue-repick.spec.ts` (new, EV-08 to EV-11), using `startAcceptanceHost` with the default `graceMs` 100.
- Cards: DEC-952 and DEC-953 (new, this brief).

### Overlaps and merge order

- **No D1 overlap.** CU/16 touches nothing in `loops/chapter/**`, `loops/group-turn/loop.ts` or `chapter.test.ts`.
- **C3/12 (step 07):** PR 1 (#556) is merged; CU/16 rebases on it (`session.ts`, `stepShell.ts`, `view.ts` are in its Touches, all merged). **OVERLAP C3/12 PR 2 (render):** `web/components/device/**` (CU/16: `CoreDeviceScreen.tsx` ~852, ~882, ~1091 to ~1130) and `web/components/board/CoreStoryBoard.tsx` (C3/12 PR 2 mounts EventScene and hides day panels; CU/16: the pause frame ~81 to ~90). **Build CU/16 after C3/12 PR 2 merges.** CU/16 is a separate fix; it does not join C3/12.
- **OVERLAP F1/02:** `loops/session/stepShell.ts` (F1/02: the marker reader at ~415 and ~761; CU/16: `export` on `pauseIfNeeded` ~228). Separate hunks; whichever lands second rebases.
- **OVERLAP D4, D5, D6:** `loops/session/view.ts` (D4 ~602, D5 ~528, D6 ~311; CU/16 ~793). D4 may touch `CoreDeviceScreen.tsx` ~1074 (only with a sibling flag); CU/16's hunks are ~852, ~882, ~1091 to ~1130. Separate hunks; whichever lands second rebases.
- **No D2, D3 or F1/01 overlap.**
- **Build order:** after C3/12 PR 2; any order with F1/02, D4, D5, D6 (second rebases); independent of D1. Hammer builds it once Bob approves.

## What it does

1. **Continue seats the saved party on the iPads joined now** (DEC-952). The joined set is the live one. A saved hold stays only if its iPad is joined at Continue; every other hold is cleared. Nothing else in the saved game changes.
2. **The game opens in DEC-154's pause** when a seated hero has no holder. Every joined iPad shows the Pick rows for the seated party: "Pick Hero A", "this iPad", "another iPad" or "unclaimed", and "N of N picked" (DEC-953). The board's pause frame shows the counter.
3. **Play goes on by itself** at the last pick. A lost tower still pauses after that (DEC-155, DEC-301).
4. **A mid-game drop** gets the same Pick rows in the same pause (DEC-953).

**Inspect first.** If part of this already conforms, that part lands as tests only. If a rule is contradicted, stop that case and report it. Do not invent a rule.

**Out of scope** (do not widen): the lobby resume (Pick restored after a restart before the game starts; W1, C2/04 EV-17 and CU/08 EV-10 keep it as it is); Play again (DEC-708); new copy; a seat change for an unseated pool hero mid-game; the gear's "Change who holds whom" panel.

## Cutover

Cutover: N

- Nothing dies or is renamed. `pauseIfNeeded` is exported as is.

## Survival invariants

- Continue, restore and restart must keep:
  - Every saved game fact but the holds: party and groups, gold, items, hit points, the chapter, the day and its clock, quests, positions, skulls, buildings (EV-03, EV-09, EV-10).
  - A hold whose iPad is joined at Continue (EV-02; C2/04 EV-12 keeps passing).
- A host restart in the middle of the re-pick pause loads the same seated party with every hold cleared but the joined ones, and the pause again (EV-11).
- The tower is not touched: no tower frame is sent by the seating or the picks (EV-05).

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 to EV-07 and EV-12 pass (verifier table on PR).
- [ ] EV-08 to EV-11 (e2e, Playwright) pass: start a game, pick heroes, Save and quit, Continue on new iPads, and every hero can be picked and the game state is intact (EV-08); the same after a host restart (EV-09); the old iPad, still joined, keeps its hero (EV-10).
- [ ] The approved tests named in AREA / DEC checklist pass unchanged.
- [ ] Hammer's report lists changed files, test commands and results, and any drift found.
- Not required: a physical Tower run; new art or copy.

## AREA / DEC checklist

- [ ] DEC-952 and DEC-953 read; this brief follows them.
- [ ] DEC-154 (Bob lock: a drop pauses until every hero is claimed again; another iPad may claim), DEC-153, DEC-155 (Bob lock: no play without the tower; a lost tower pauses), DEC-301, DEC-708, DEC-711, DEC-712, AREA-047, AREA-100 read. No lock is reversed: DEC-953 adds the claim control DEC-154 names, and the tower pause and the tower block before Continue stay.
- [ ] **Approved evals kept, unedited.** C2/04 EV-12 (the new holder survives a host restart and Continue) passes because DEC-952 keeps a joined iPad's hold. C2/04 EV-17 and CU/08 EV-10, and `w1-chrome.spec.ts` "a held hero, the Menu and a restart survive Continue", are lobby resumes, which CU/16 does not change. `shell.test.ts` disconnect-pause tests (~238 to ~290) pass unchanged.
- [ ] **The suggested ruling, changed (Bob's call).** "Clear every saved hold on Continue" would break C2/04 EV-12. DEC-952 clears only the holds of iPads not joined at Continue. With the old iPads gone, as in Anvil's finding, the result is the same: every hero is free.
- [ ] No provisional card (DEC-821, DEC-822, DEC-824, DEC-826) is touched.

## Copy

No new strings. Existing, locked words only:

| Where | Words | Source |
|---|---|---|
| iPad, each seated hero, in the disconnect pause | "Pick Hero A" (`Pick ${hero.name}`), "this iPad", "another iPad", "unclaimed" | the Pick screen (C2/05, CU/08) |
| iPad and board counter | "N of N picked" | the Pick screen (C2/05 EV) |
| iPad title | "Paused" | the existing pause title |

## Open questions

- None open for design: who keeps a hold (DEC-952, EV-01, EV-02), where the re-pick happens and when play goes on (DEC-953, EV-06, EV-07).
- **For Bob:** (1) accept DEC-952's change from the suggested ruling (keep the holds of iPads joined now, to keep C2/04 EV-12); (2) accept the same Pick rows on a mid-game drop pause (DEC-953), not only after Continue; (3) no mockup: the pause reuses CU/08's Pick rows and the board's pause frame with the counter in place of the tower line. Say if you want an Illusionist mockup first.
- **Left as is (say if you want it):** the lobby resume after a restart still shows a gone iPad's pick as "another iPad" until that iPad rejoins or someone goes Back (approved W1 and CU/08 EV-10).

## Eval approval

- See ./approval.md (must be filled before coding).
