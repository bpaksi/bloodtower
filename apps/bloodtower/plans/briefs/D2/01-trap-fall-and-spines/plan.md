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
- Depends on: its approval.md on main (normal brief approval); F1 (#505) merged
- Builds: DEC-906, DEC-907 (the CB-06 part; F1 builds the entry part), DEC-939, DEC-940, DEC-941; MEC-026 .12 to .15 and .18, MEC-038 .11 and .16 to .25 as the cards now read
- Deps change: no
- Runs: cloud

### Touches

**Not on main at 9ccd052.** `apps/bloodtower/src/engine/` has no battle or Tomb loop today. C4-02 (#445) names `loops/battle/**` and `rules/battle/**`; C4-06 (#449) names `loops/tomb/**`; F1 (in flight) works in the same code. Anvil lists the exact files after F1 merges, as F1 does.

- OVERLAP F1: `apps/bloodtower/src/engine/loops/tomb/**` (the trap step, MEC-026 .12 to .15, and the result at .18).
- OVERLAP F1: `apps/bloodtower/src/engine/loops/battle/**` (the won round, MEC-038 .11: cut, then the DEC-907 gate, then Spines only if the foe stands).
- OVERLAP F1: `apps/bloodtower/src/engine/rules/battle/**` (Spines, if the foe abilities live there).
- OVERLAP F1: new unit tests beside the battle and Tomb tests (F1 adds TB-01 to TB-14 there). D2's tests are `R04-*` (names in eval.md), in their own `describe` blocks.
- **Files touched (Anvil, after F1 ruled cards-only and C4/02's engine level landed in #584):** `apps/bloodtower/src/engine/rules/trap/index.ts` and `trap.test.ts` (new: the trap loss and fall rule, EV-01 to EV-08, EV-16); `apps/bloodtower/src/engine/loops/battle/loop.ts` (Spines in the won round: `wonRoundAbility`, `round.spines`) and `loops/battle/spines.test.ts` (new: EV-10, EV-11, EV-12, EV-14, EV-18).
- **Scope (Bob, 2026-11-22, "Yes, option (a)"):** D2 builds the trap rule (`rules/trap`) and Spines in the battle loop. The Tomb clauses go to C4-06 (see its eval EV-19 to EV-21): the next-room prompt of EV-01, 02 and 05; the Tomb result, quest fail, return to the board and nothing-after of EV-06, 07 and 16; EV-13, 15 and 17. C4-06 must call `springTrap` and honour `allFell`, `gameLost` and `roomCleared`.
- Read only, on main: `apps/bloodtower/src/engine/rules/corruption/index.ts` (`gainCorruption`, the third-corruption outcome), `apps/bloodtower/src/engine/loops/day/clock.ts` (hero `hp`, `isCorruptionLoss`), `apps/bloodtower/src/engine/loops/quest/quest.ts` (DEC-714's plain-scene floor, which D2 must not change).
- Cards: none. #509 already edited MEC-026 .15, MEC-038 .11, DEC-553, DEC-606 and DEC-119.

### Merge order

- **Sequencing (Wright, 2026-11-18):** D2 builds as its own step after F1 merges, ahead of C4-02 (#445) and C4-06 (#449); if either of those lands first, it rebases on D2. D2 does not join them: that would reopen evals Bob has approved. Its approval goes through the normal brief approval (./approval.md).
- D2 starts from main after F1, so it builds on F1's single stance owner and its terminal gate.
- D2 does not touch any D1 file. The D1 and D2 patches can merge in either order.

## What it does

1. **Trap fall (DEC-906).** The trap's loss is its number after on guard halves it (DEC-607). A hero whose hit points are at or below it falls: exactly one corruption and 1 hit point, at once. Exact zero and a shortfall are the same case. No sit-out in the Tomb; the hero plays the next room.
2. **Every hero falls to a trap.** The Tomb result is failed, the quest fails (DEC-642, MEC-037 .6), and the group leaves the Tomb to its board space. No gold is lost (no foe level, DEC-177). The corruptions stay.
3. **A trap's third corruption** loses the game at once through the existing game-loss path (DEC-676).
4. **Final cut and Spines (DEC-907).** A won round cuts first. If the cut leaves the foe gone, the battle is won at once and Spines does not fire. If the foe still stands, Spines fires (DEC-553: the hero with the highest fight number takes 1); if that fells the last standing hero, the battle is fallen with the foe standing.
5. **Falling Rocks is one effect** (DEC-939): all heroes pay, then the loss check. **A paid trap room is cleared**, even after a total fall (DEC-940). **A Spines tie** is a seeded pick (DEC-941).
6. **Close once.** Reward, fall penalties and the battle-ends hook each happen once (DEC-907).

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

- [ ] EV-01 to EV-12, EV-14, EV-16 and EV-18 pass at the rule and battle level, less the Tomb clauses moved to C4-06 (verifier table on PR).
- Moved to C4-06 (Bob 2026-11-22): the Tomb clauses of EV-01, 02, 05, 06, 07, 16; EV-13, 15 and 17.
- [ ] Anvil's report lists changed files, test commands and results, and any drift found.
- Not required: the Tomb or battle screens; Advantages on traps; companions; balance claims.

## AREA / DEC checklist

- [ ] DEC-906, DEC-907, DEC-939, DEC-940 and DEC-941 read; this brief follows them; no rule is changed here.
- [ ] DEC-606, DEC-496 (shortfall), DEC-119 (fall in battle: corruption, sit out, back at 1), DEC-607 (on guard halves), DEC-642 and MEC-037 .6 (a fall fails the quest), DEC-177 (gold loss is by foe level), DEC-676 (third corruption), DEC-714 (plain-scene floor), DEC-553 (Spines), DEC-671 read.
- [ ] MEC-026 (.12 to .15, .18) and MEC-038 (.11, .16, .17 to .25) read; no card edit is needed (#509 already made them).
- [ ] C4/06 EV-06 (approved) says a short hero "pays what they can and takes a corruption". DEC-906 adds "and is back at 1 hit point at once". C4/06's eval.md is not edited; D2's EV-03 holds the addition.
- [ ] No AREA or DEC card reverses a Bob lock; none is needed from Bob beyond the eval approval.

## Open questions

- None open. Answered:
  - Sequencing: its own step after F1, ahead of C4-02 and C4-06 (Wright, 2026-11-18; see Merge order).
  - Falling Rocks is one effect: every hero pays, every fall applies, then the loss check (DEC-939; EV-16).
  - A paid trap room is cleared even when every hero falls; battle rooms keep F1's rule (DEC-940; EV-06, EV-17).
  - A Spines tie is a seeded pick among the tied standing heroes, no prompt (DEC-941; EV-18).

## Eval approval

- See ./approval.md (must be filled before coding).
