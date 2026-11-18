Keep this a checklist; do not write a second design doc.

# Brief: D1 / 01-skull-loss-dispatch — A skull that empties the supply or fells the fourth building loses the game at once

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (section "Nov 12 audit fold-in", decision D1)
- Feature: 01-skull-loss-dispatch
- Kind: fix (engine; the ruling is already on main)
- Owner: Gamewright (brief, evals); Anvil (build, inspect first)
- Related AREA/docs: issue #499; finding LC-01 and test R03 in [docs/audits/2026-11-12-dark-tower-consolidated-audit.md](../../../../../../docs/audits/2026-11-12-dark-tower-consolidated-audit.md); ruling DEC-905 (#509), amended by DEC-915 (4 buildings anywhere) and DEC-933 (freed skulls after Set the table); DEC-931 (the simulated night stops at the loss); index [research/game-design/audit-rulings-2026-11-13.md](../../../../../../research/game-design/audit-rulings-2026-11-13.md) section D1
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no screen change)
- Risk: High (game-loss state, restore)
- Depends on: its approval.md on main. No step dependency: everything it changes is on main at 9ccd052.
- Builds: DEC-905, DEC-931 (R03 fixtures b to e); MEC-033 .11 and .27, MEC-034 .19 and .36 as the cards now read
- Deps change: no
- Runs: cloud

### Touches (checked against main 9ccd052)

- `apps/bloodtower/src/engine/loops/day/clock.ts`: one loss check after each skull leaves the supply or lands (`recordBuildingDrop`, `recordHeldSkull`), using the existing `checkChapter` order (supply, then buildings) and never overwriting a `corruption` outcome; a general "game is lost" read beside `isCorruptionLoss`. Keep `isCorruptionLoss` exported and unrenamed.
- `apps/bloodtower/src/engine/loops/day/skull.ts`: `simulateSkullDrop` and `applySkullRecord` refuse a skull once the game is lost.
- `apps/bloodtower/src/engine/loops/day/loop.ts`: `simulateDrops` stops at the loss (no later draw); the `skull-place` phase offers no further placement; the stop at line ~353 and the effects-panel guard at line ~479 cover any loss, not only `corruption`; `resultUp` still hands up `lost` with the reason.
- `apps/bloodtower/src/engine/loops/day/press.ts`: a `skull-record` press after the loss is refused.
- `apps/bloodtower/src/engine/loops/chapter/loop.ts`: after a freed skull loses (`handleChapterPress`, `placeStep`), no further freed-skull prompt; the chapter hands up `lost` with the reason; the next chapter's enter never runs.
- `apps/bloodtower/src/engine/loops/group-turn/loop.ts`, `apps/bloodtower/src/engine/loops/encounter/loop.ts`: only if the build swaps their `isCorruptionLoss` stop for the general read (no 1.0 skull path reaches them on main today; keep the change to that swap).
- Tests: `apps/bloodtower/src/engine/loops/day/skullLoss.test.ts` (new, EV-01 to EV-08, EV-10 to EV-12); `apps/bloodtower/src/engine/loops/day/day.test.ts` (the C3/04 `EV-05` test's `.11 after .19` node assertion, only if the stop changes it); `apps/bloodtower/src/engine/loops/chapter/chapter.test.ts` (EV-05, EV-11); `apps/bloodtower/src/engine/loops/game/loop.test.ts` (EV-07).
- e2e: `apps/bloodtower/src/e2e/tests/d1-skull-loss.spec.ts` (new, EV-09), using the existing `~test-skulls:` and `~test-kingdom:` seed markers through `src/e2e/tests/support/acceptance.ts` (read only).

### F1 overlap and merge order

- **No file in this Touches list is in F1's Touches** (F1: MEC-026, MEC-038, the battle and Tomb loop code and fixtures, TB tests, one e2e spec). D1 touches no battle or Tomb file.
- **POSSIBLE OVERLAP F1: `apps/bloodtower/src/engine/loops/day/clock.ts`**, only if F1's game-loss gate (TB-07) edits it rather than reading `isCorruptionLoss`. D1 adds, it does not rename. The later of the two PRs rebases.
- **Interface, not a file overlap:** the battle trait drops (DEC-559 Magic, Humanoid) live in `apps/bloodtower/src/engine/loops/battle/**` (F1 / C4-02 #445), which is not on main. They must drop through `recordBuildingDrop` / `simulateSkullDrop` so they get D1's check. R03 fixture (a) is not an EV here (see Open questions).
- **Not F1, but overlaps C3/15 (#438):** `apps/bloodtower/src/engine/loops/chapter/**`. C3/15 moves the freed-skull picks after Set the table's Done (DEC-929, DEC-933). D1 does not reorder; it only adds the check after each freed skull lands.
- **Merge order:** F1 first (in flight). D1 may merge before or after F1; whichever lands second rebases on `loops/day/clock.ts`. D1 before C3/15; C3/15 keeps D1's check (EV-05, EV-11) when it reorders the close.

## What it does

1. **Check after each skull.** The moment a skull leaves the supply or lands on a building (the day's drop, with the tower or simulated, a skull that stays inside the tower, a freed skull at the chapter close), the game is lost if the supply is 0 or 4 buildings anywhere are destroyed (DEC-905, DEC-915).
2. **DEC-676's stop.** Every open loop ends; no later step of the interrupted loop runs: no later skull is drawn, offered or placed, no effects panel, no next chapter. The loss goes up through the existing game end (MEC-032 .43 to .49) once.
3. **The line that did it still shows** (DEC-931): the fatal simulated skull's "A skull falls on <building>." line shows, then the loss.
4. **One reason.** If several are true: third corruption, then empty supply, then fallen buildings (DEC-905).
5. **MEC-033 .11 stays** as the backstop exit check.

**Inspect first.** If part of this already conforms, that part lands as tests only. A contradicted rule: stop that case and report it. Do not invent a rule.

**Out of scope** (do not widen): battle trait drops (no battle loop on main), D2 to D6, the chapter-close order (C3/15, C4/13), the drop schedule (DEC-912, F3), Dracula's DEC-885 order (1.2), any loss scene copy or art.

## Cutover

Cutover: N

- Nothing dies or is renamed. `checkChapter` keeps its order; `isCorruptionLoss` stays.

## Survival invariants

- Continue, restore, and restart must keep:
  - A save taken mid-night before the fatal skull resumes, and the loss fires at the same skull, once (EV-10).
  - A save taken mid-placement of freed skulls (C3/09 EV-12 path) resumes, and a fatal freed skull loses with the rest never asked (EV-11).
  - The event-log rebuild of supply and skulls never logs a drop after the supply is empty (EV-12).
  - A game lost this way clears the autosave; Continue is not offered (C3/10 EV-08; EV-09).
- The tower is not touched beyond today's placement prompts.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 to EV-08 pass (verifier table on PR).
- [ ] EV-09 (e2e, Playwright) passes.
- [ ] EV-10 to EV-12 (survival) pass.
- [ ] Anvil's report lists changed files, test commands and results, and any drift found.
- Not required: R03 fixture (a) in a live battle; a physical Tower run; loss scene copy.

## AREA / DEC checklist

- [ ] DEC-905 (with the DEC-915 and DEC-933 amendments) and DEC-931 read; this brief follows them; no rule is changed here.
- [ ] DEC-676 (the stop), DEC-686 (trimmed by DEC-905), DEC-559 (Magic and Humanoid drops), DEC-092, DEC-093, DEC-919, DEC-929 read.
- [ ] MEC-033 (.11, .25 to .29), MEC-034 (.19, .33, .36), MEC-032 (.43 to .49) read; no card edit is needed (#509 already made them).
- [ ] C3/04 EV-05 and EV-12 say the loss is reported "at MEC-033 .11". DEC-905 moved the moment to the skull. Their approved eval.md is not edited; the day still hands up `lost` with the same reason, so they still pass. Bob's approval of this eval.md covers the timing change.
- [ ] No AREA or DEC card reverses a Bob lock; none is needed from Bob beyond the eval approval.

## Open questions (not ruled here)

- **OQ-D1-1 (Wright):** who carries R03 fixture (a) and the Humanoid skull in a live battle: an F1 follow-up, a C4-02 (#445) eval amendment with Bob's re-approval, or a D1 follow-up after the battle loop is on main?
- **OQ-D1-2 (Gamewright):** when a freed skull loses after a won chapter, which chapter does the game record name: the chapter that closed, or the next one whose card has already shown under DEC-929? EV-05 does not assert it.

## Eval approval

- See ./approval.md (must be filled before coding).
