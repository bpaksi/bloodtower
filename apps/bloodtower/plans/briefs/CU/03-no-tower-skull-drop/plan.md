Keep this a checklist; do not write a second design doc.

# Brief: CU / 03-no-tower-skull-drop — A no-tower skull lands on the standing building with the fewest skulls

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (queue step 50)
- Feature: 03-no-tower-skull-drop
- Kind: engine
- Owner: Gamewright (brief, evals); a Wright developer, runner anvil (build)
- Related AREA/docs: GitHub issue #476; PT-07 in `research/game-design/playtests/2026-11-12-paper-playtest-v1-v1.2.md`; `plans/catchup/design-freeze.md` section H (PT-07); DEC-305, DEC-092; C2/08 eval EV-04 and its "A skull falls on <building>" line; C3-04 (merged)
- Evals: ./eval.md
- Screen spec: none
- Mockup: ./mockup.html (a Gamewright draft for the Illusionist to replace)
- Risk: Med
- Depends on: its approval.md on main; step 43 (#469) and step 44 (#470) merged; C3-04 merged (it is)
- Touches: `apps/bloodtower/src/engine/loops/day/skull.ts` (`simulateSkullDrop`), `apps/bloodtower/src/engine/loops/day/loop.ts` (`simulateDrops`), `apps/bloodtower/src/engine/loops/session/view.ts` (`simulatedSkullLine`), `apps/bloodtower/src/engine/loops/day/day.test.ts`, `apps/bloodtower/src/engine/loops/session/towerLost.test.ts`, `apps/bloodtower/src/web/components/board/DayPanels.tsx` (stack the lines), `apps/bloodtower/src/e2e/tests/c3-day.spec.ts` or a new spec beside it, plus these, added by Bob's "Widen both" ruling (2026-11-14) after the build found the brief could not be built inside the list:
  - `apps/bloodtower/src/protocols/v2/views.ts` and `apps/bloodtower/src/engine/views/state.ts`: the optional `lines: string[]` (max 16, each up to 120 characters) on the skull view. The wire had no field for one line per skull, and `waitingFor` is capped at 120 characters.
  - `apps/bloodtower/src/engine/loops/session/effects.ts` and `apps/bloodtower/src/server/core/session.ts`: the distinct error code `skull-no-building` for EV-15, so the host log and the Story-board toast name it instead of `invalid-state`.
  - `apps/bloodtower/src/server/core/skullNoBuilding.test.ts` (new test): EV-15's logged error with its code, in the shape the Story-board toast carries.
  - `apps/bloodtower/src/web/components/board/DayPanels.tsx` also drops the kingdom headline and building list from the skull-sim panel (heading "Night falls" and the lines only, as the mockup).
  - `apps/bloodtower/src/e2e/tests/c3-skull-lines.spec.ts` (new spec) and its one-line edit of `c3-day.spec.ts`: the board no longer shows the skull line in a second waiting box, so the old `[data-waiting]` check reads the panel's lines.
- Builds: PT-07 (issue #476)
- Deps change: no
- Runs: cloud

## What it does

Without the tower the app draws where a skull lands (DEC-305). Today `simulateSkullDrop` draws the kingdom by the d4, then picks a seeded building among the standing buildings of that kingdom (or any standing building when the kingdom has none), and `simulatedSkullLine` joins the lines into one string cut at 120 characters. PT-07 and design-freeze section H ask for this instead:

- Kingdom by the d4, as now (`tuning skulls.simulated_drop.kingdom_die`).
- Building = the standing building in that kingdom with the fewest skulls; ties go to a seeded pick from the playtest's play stream, so a replay of the log lands the same.
- If no building in that kingdom stands, reroll the kingdom once. If the rerolled kingdom also has nothing standing, drop no skull and log an error (Q3.1, below); never fall back to another standing building.
- Skull counts are read again after each skull in a night (Q3.2).
- One line per skull, "A skull falls on <building>.", stacked, never cut short.

The tower-on path (the table places each skull, DEC-092) is untouched.

## Cutover

Cutover: N

- Nothing dies or is renamed. The "any standing building when the kingdom has none" fallback in `simulateSkullDrop` is replaced by the one reroll, and after a failed reroll by no skull and a logged error.
- Old logs: the extra kingdom draw changes the RNG stream for a log recorded before this step (Q3.3, accepted).

## Survival invariants

- Continue, restore, and restart must keep:
  - The same seed and event log lands the same skulls on the same buildings (C2/08 EV-04, EV-12 stay true).
  - Skull counts per building, the supply and fallen buildings are the same after Continue.
  - A building never takes a skull when it is fallen (`isFallen`).
  - The tower-on skull placement prompts (DEC-092) are unchanged.
  - Nothing physical happens: no tower command goes out on the simulated path.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-09, EV-11 … EV-14 and EV-15 all pass (verifier table on PR).
- Not required: the P-006 probe re-run (parked with PT-05, 1.1); Dracula's earth box and Warden arrival.

## AREA / DEC checklist

- [ ] PT-07 ruling recorded as a DEC by step 43 (#469); closed before coding. The brief does not invent its id.
- [ ] DEC-305 (simulated drop) and DEC-092 (the table picks the building on the tower path): read, no change to the tower path. Closed before coding.
- [ ] Rulings Q3.1 to Q3.3 below written into the step-43 DEC; closed before coding. Step 43 must also amend DEC-905, whose body says "every building of one kingdom (DEC-044)", for PT-02.

## Rulings (Bob, 2026-11-14, adopted)

- Q3.1 Bob, 2026-11-14, adopted: if the rerolled kingdom has nothing standing, drop NO skull and log an error. Never fall back to any standing building (a kingdom has 4 buildings and the loss limit is 4, so the game is already lost). Open for Gamewright: whether this step should also stop the night at the loss.
- Q3.2 Bob, 2026-11-14, adopted: skull counts are read again after each skull in a night.
- Q3.3 Bob, 2026-11-14, adopted: the RNG-stream change for old logs is accepted.
- Note for step 43: DEC-905's body says "every building of one kingdom (DEC-044)"; step 43 amends it for PT-02.

## Eval approval

- See ./approval.md (must be filled before coding).
