Keep this a checklist; do not write a second design doc.

# Brief: D2 / 01-trap-fall-and-spines — A trap fall is one corruption and 1 hit point; Spines never fires on the final cut

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (section "Nov 12 audit fold-in", decision D2)
- Feature: 01-trap-fall-and-spines
- Kind: fix (engine; the rulings are already on main)
- Owner: Gamewright (brief, evals); Anvil (build, inspect first)
- Related AREA/docs: issue #500; findings QD-05 and CB-06, test R04 in [docs/audits/2026-11-12-dark-tower-consolidated-audit.md](../../../../../../docs/audits/2026-11-12-dark-tower-consolidated-audit.md); rulings DEC-906 (QD-05) and DEC-907 (CB-06), both #509; index [research/game-design/audit-rulings-2026-11-13.md](../../../../../../research/game-design/audit-rulings-2026-11-13.md) section D2
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no screen change)
- Risk: High (fall, corruption and game-loss state; restore)
- Depends on: its approval.md on main; F1 (#505) merged; a battle loop and a Tomb loop on main (see Touches)
- Builds: DEC-906, DEC-907 (the CB-06 part; F1 builds the entry part); MEC-026 .12 to .15 and .18, MEC-038 .11 and .16 to .25 as the cards now read
- Deps change: no
- Runs: cloud

### Touches

**Not on main at 9ccd052.** `apps/bloodtower/src/engine/` has no battle or Tomb loop today. C4-02 (#445) names `loops/battle/**` and `rules/battle/**`; C4-06 (#449) names `loops/tomb/**`; F1 (in flight) works in the same code. Anvil lists the exact files after F1 merges, as F1 does.

- OVERLAP F1: `apps/bloodtower/src/engine/loops/tomb/**` (the trap step, MEC-026 .12 to .15, and the result at .18).
- OVERLAP F1: `apps/bloodtower/src/engine/loops/battle/**` (the won round, MEC-038 .11: cut, then the DEC-907 gate, then Spines only if the foe stands).
- OVERLAP F1: `apps/bloodtower/src/engine/rules/battle/**` (Spines, if the foe abilities live there).
- OVERLAP F1: new unit tests beside the battle and Tomb tests (F1 adds TB-01 to TB-14 there). D2's tests are `R04-*` (names in eval.md), in their own `describe` blocks.
- Read only, on main: `apps/bloodtower/src/engine/rules/corruption/index.ts` (`gainCorruption`, the third-corruption outcome), `apps/bloodtower/src/engine/loops/day/clock.ts` (hero `hp`, `isCorruptionLoss`), `apps/bloodtower/src/engine/loops/quest/quest.ts` (DEC-714's plain-scene floor, which D2 must not change).
- Cards: none. #509 already edited MEC-026 .15, MEC-038 .11, DEC-553, DEC-606 and DEC-119.

### Merge order

- F1 merges first. D2 starts from main after F1, so it builds on F1's single stance owner and its terminal gate.
- If the Tomb or battle loop still is not on main after F1, D2 waits for C4-02 (#445) and C4-06 (#449), or its EVs move into those steps by an eval amendment that Bob approves (OQ-D2-1).
- D2 does not touch any D1 file. The D1 and D2 patches can merge in either order.

## What it does

1. **Trap fall (DEC-906).** The trap's loss is its number after on guard halves it (DEC-607). A hero whose hit points are at or below it falls: exactly one corruption and 1 hit point, at once. Exact zero and a shortfall are the same case. No sit-out in the Tomb; the hero plays the next room.
2. **Every hero falls to a trap.** The Tomb result is failed, the quest fails (DEC-642, MEC-037 .6), and the group leaves the Tomb to its board space. No gold is lost (no foe level, DEC-177). The corruptions stay.
3. **A trap's third corruption** loses the game at once through the existing game-loss path (DEC-676).
4. **Final cut and Spines (DEC-907).** A won round cuts first. If the cut leaves the foe gone, the battle is won at once and Spines does not fire. If the foe still stands, Spines fires (DEC-553: the hero with the highest fight number takes 1); if that fells the last standing hero, the battle is fallen with the foe standing.
5. **Close once.** Reward, fall penalties and the battle-ends hook each happen once (DEC-907).

**Inspect first.** If the loops already conform, D2 is tests only. A contradicted rule: stop that case and report it. Do not invent a rule.

**Out of scope** (do not widen): F1's entry gate and TB tests; Advantage cut sizes on traps (DEC-493, Q-214, Q-312; fixtures hold no Advantages); companions (DEC-800, 1.1); the Ward and the boss deck (D3, #501); Shield wall beyond "it changes the cut itself"; any screen.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - A save after a trap fall resumes with that hero at 1 hit point and the same corruption count; the trap is not paid again (EV-13).
  - A save after a won round whose cut left the foe standing and whose Spines has landed resumes at the next node; Spines does not fire again (EV-14).
  - The trap or Spines third-corruption loss goes through the one existing unwind, once (EV-07, EV-12).
- The tower is not touched.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 to EV-12 pass (verifier table on PR).
- [ ] EV-15 (e2e, R04 through the session) passes.
- [ ] EV-13 to EV-14 (survival) pass.
- [ ] Anvil's report lists changed files, test commands and results, and any drift found.
- Not required: the Tomb or battle screens; Advantages on traps; companions; balance claims.

## AREA / DEC checklist

- [ ] DEC-906 and DEC-907 read; this brief follows them; no rule is changed here.
- [ ] DEC-606, DEC-496 (shortfall), DEC-119 (fall in battle: corruption, sit out, back at 1), DEC-607 (on guard halves), DEC-642 and MEC-037 .6 (a fall fails the quest), DEC-177 (gold loss is by foe level), DEC-676 (third corruption), DEC-714 (plain-scene floor), DEC-553 (Spines), DEC-671 read.
- [ ] MEC-026 (.12 to .15, .18) and MEC-038 (.11, .16, .17 to .25) read; no card edit is needed (#509 already made them).
- [ ] C4/06 EV-06 (approved) says a short hero "pays what they can and takes a corruption". DEC-906 adds "and is back at 1 hit point at once". C4/06's eval.md is not edited; D2's EV-03 holds the addition.
- [ ] No AREA or DEC card reverses a Bob lock; none is needed from Bob beyond the eval approval.

## Open questions (not ruled here)

- **OQ-D2-1 (Wright):** the battle and Tomb loops are not on main. Does D2 build as its own step after F1 (and after C4-02 and C4-06 if F1 does not land the loops), or do its EVs join C4-02 and C4-06 by an eval amendment that Bob re-approves?
- **OQ-D2-2 (Gamewright):** Falling Rocks hits every hero. If one hero's fall is a third corruption, do the other heroes still take their loss before the stop? DEC-906 says the loss comes "before anything else resolves" but does not order the heroes. EV-07 asserts only the one loss and nothing after the Tomb step.
- **OQ-D2-3 (Gamewright):** when a trap fells every hero, is that trap room marked cleared? MEC-026 .18 and C4/06 EV-06 mark a trap room cleared; F1 says a room clears only on won (for battle rooms). EV-06 does not assert it.
- **OQ-D2-4 (Gamewright):** Spines' target when two heroes tie for the highest fight number is not on any card. Fixtures avoid ties.

## Eval approval

- See ./approval.md (must be filled before coding).
