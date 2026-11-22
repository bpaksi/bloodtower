Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: D2 / 01-trap-fall-and-spines — A trap fall is one corruption and 1 hit point; Spines never fires on the final cut

- Brief: ./plan.md
- Mockup: none
- Risk: High (fall, corruption and game-loss state; restore). Negative and restore evals are included.

All fixtures: own-turn Tomb visit or plain battle as named; no Advantage, companion, guard, item or story effect unless named; zero corruptions unless set; trap type and loss forced (Pit 4 on the group's picked hero, Falling Rocks 2 on each hero); bold unless "on guard" is named (on guard halves: Pit 2, Rocks 1). Round outcomes, cards and RNG are injected; no new simulator. Test files sit beside the battle and Tomb tests (Anvil names them after F1); each test is named `R04-<EV>`. Source of the cases: DEC-906's examples and DEC-907's CB-06 paragraph; the audit's R04.

## Checks

### EV-01 — Pit on a hero above the loss
- Requirement: DEC-906: a hero above the loss pays it and does not fall.
- Method: unit
- How: `R04-EV-01`. Solo hero at 5 HP; Pit (4) picks that hero.
- Pass evidence: hero 1 HP; corruptions 0; the next room prompt (MEC-026 .4) is offered; the Tomb result is unset.
- Fails if: a corruption is taken, or the hero is treated as fallen.

### EV-02 — Pit to exactly 0
- Requirement: DEC-906, DEC-606: exact zero is a fall: one corruption, back at 1 at once.
- Method: unit
- How: `R04-EV-02`. Two heroes at 4 and 6 HP; Pit picks the hero at 4.
- Pass evidence: that hero 1 HP and corruptions 1; the other hero 6 HP; the next room prompt is offered with both heroes in the group.
- Fails if: the hero stays at 0, takes 2 corruptions, sits out, or takes no corruption.

### EV-03 — Pit with a shortfall
- Requirement: DEC-906, DEC-496: a shortfall is the same case as exact zero.
- Method: unit
- How: `R04-EV-03`. Two heroes at 3 and 6 HP; Pit picks the hero at 3.
- Pass evidence: that hero 1 HP and corruptions 1 (not 2); the other hero 6 HP; the Tomb goes on.
- Fails if: 2 corruptions (one for the shortfall, one for the zero), a hero left at 0 or below, or no corruption.

### EV-04 — On guard halves, then the same rule
- Requirement: DEC-906, DEC-607.
- Method: unit
- How: `R04-EV-04`. On guard, Pit picks a hero at 2 HP; again with a hero at 3 HP.
- Pass evidence: the hero at 2 ends at 1 HP with corruptions 1; the hero at 3 ends at 1 HP with corruptions 0.
- Fails if: the loss is not halved (the hero at 3 falls), or the hero at 2 does not fall.

### EV-05 — Falling Rocks fells one of two: no sit-out
- Requirement: DEC-906: no sit-out in the Tomb; the fallen hero plays the next room.
- Method: unit
- How: `R04-EV-05`. Two heroes at 2 and 5 HP; Falling Rocks (2 each).
- Pass evidence: first hero 1 HP and corruptions 1; second hero 3 HP and corruptions 0; the next room prompt is offered; both heroes are present for the next room (a battle there lists both as standing).
- Fails if: the fallen hero is benched, kept at 0, or the Tomb ends.

### EV-06 — A trap fells every hero: the Tomb fails, no gold lost
- Requirement: DEC-906, DEC-940, DEC-642, MEC-037 .6, DEC-177.
- Method: unit
- How: `R04-EV-06`. (a) Two heroes at 2 and 1 HP; Falling Rocks. (b) Solo hero at 4 HP; Pit. Group purse 30.
- Pass evidence: Tomb result `failed`; the quest is failed; the group is back on the Tomb's board space; purse 30; each hero 1 HP with corruptions +1; no further room prompt; no gold-loss line; the trap room is marked cleared in the kept tomb layout (DEC-940).
- Fails if: gold is taken, the result is `left` or unset, a hero is left at 0, another room is offered, or the trap room stays live.

### EV-07 — A trap's third corruption loses the game at once
- Requirement: DEC-906, DEC-676.
- Method: unit
- How: `R04-EV-07`. Solo hero at 3 HP and 2 corruptions; Pit.
- Pass evidence: the existing game-loss unwind runs once (outcome `corruption`); corruptions 3, counted once; no Tomb result, room prompt or quest result after it.
- Fails if: the Tomb closes as failed, a further room or prompt follows, or the corruption counts twice.

### EV-08 — Never 0, never two corruptions (sweep)
- Requirement: DEC-906: never two corruptions, never a hero left at 0.
- Method: unit
- How: `R04-EV-08`. Every combination of start HP 1 to 6, start corruptions 0 or 1, Pit or Falling Rocks, bold or on guard.
- Pass evidence: after the trap every hero has HP of at least 1; the corruption change is 0 or 1; it is 1 exactly when start HP was at or below the loss after halving.
- Fails if: any case ends at 0 HP or below, gains 2 corruptions, or the fall test uses "below" instead of "at or below".

### EV-09 — The plain-scene floor is unchanged
- Requirement: DEC-714 (plain scenes only; DEC-906 "not a plain scene").
- Method: unit
- How: the existing `scene.test.ts` "EV-03: a hit-point cost stops at 1", unchanged; `quest.ts` `payCost` unchanged.
- Pass evidence: the test passes; a plain-scene hit-point cost still stops at 1 with no corruption.
- Fails if: the trap rule leaks into plain scenes (a corruption, or a hero at 0).

### EV-10 — Spines does not fire on the final cut
- Requirement: DEC-907 (CB-06), DEC-553.
- Method: unit
- How: `R04-EV-10`. Plain battle, Spine Fiends at count 1; solo hero at 1 HP, 0 corruptions; inject a won round (cut 1).
- Pass evidence: result won; hero 1 HP and corruptions 0; Spines not logged as fired; the battle reward paid once; no fall penalty and no gold loss; no Fight/Retreat after the cut.
- Fails if: Spines fires after the cut, the battle closes fallen or as both, or the reward is paid twice or not at all.

### EV-11 — Spines on a non-final cut
- Requirement: DEC-907, DEC-553, DEC-119, DEC-177.
- Method: unit
- How: `R04-EV-11`. Spine Fiends at count 3, foe level L. (a) Solo hero at 1 HP, 0 corruptions; inject a won round (cut 1). (b) Two heroes, fight numbers 3 and 1 (no tie), the first at 1 HP, the second at 5 HP; inject a won round (cut 1).
- Pass evidence: (a) foe count 2; Spines fires once; the hero falls (corruptions 1); the battle closes fallen once: foe count 2 kept, gold loss by level L once, no reward; the hero is back at 1 HP at battle end. (b) Spines hits the hero with fight number 3 only; that hero sits out with corruptions 1; the other hero is still 5 HP; the battle goes on to the next Fight/Retreat with one standing hero.
- Fails if: Spines does not fire while the foe stands, hits the wrong hero, the battle closes as won, the fall penalty runs twice, or (b) ends the battle.

### EV-12 — Spines' third corruption loses the game first
- Requirement: DEC-907 (game loss first), DEC-676.
- Method: unit
- How: `R04-EV-12`. EV-11 (a) with the hero at 2 corruptions.
- Pass evidence: the existing game-loss unwind runs once (outcome `corruption`); no battle close: no fall penalty, no gold loss, no reward, no battle-ends hook.
- Fails if: the battle closes as fallen, or any close step runs before or after the loss.

### EV-16 — Falling Rocks is one effect, then the loss check
- Requirement: DEC-939, DEC-906, DEC-676.
- Method: unit
- How: `R04-EV-16`. Two heroes: A at 2 HP with 2 corruptions, B at 2 HP with 0; Falling Rocks (2 each). Run again with the heroes in the other group order.
- Pass evidence: both runs: A 1 HP with 3 corruptions, B 1 HP with 1 corruption; the game-loss unwind runs once (outcome `corruption`); no Tomb result, room prompt or quest result after it; the HP and corruption counts are the same in both orders.
- Fails if: B does not pay (the trap stopped at A), the loss fires before B pays, the unwind runs twice, or the counts depend on hero order.

### EV-17 — A paid trap room is spent; a battle room keeps F1's rule
- Requirement: DEC-940, DEC-491, F1 EV-09 (battle rooms).
- Method: unit
- How: `R04-EV-17`. (a) EV-05's trap room (one hero fell), then a new genuine entry into the same room. (b) EV-06 (a)'s trap room (every hero fell): read the kept tomb layout, then a fixture entry into that room on a later visit. (c) Regression: F1's TB-09 fixture (retreat from a battle room).
- Pass evidence: (a) and (b): the room is marked cleared; the entry is an empty room: no trap drawn, no HP lost, no corruption. (c) the battle room is still uncleared with the foe's count kept.
- Fails if: a spent trap is drawn or paid again, a total fall leaves the trap room live, or the battle room clears on retreat.

### EV-18 — A Spines tie is a seeded pick, no prompt
- Requirement: DEC-941, DEC-553, DEC-011.
- Method: unit
- How: `R04-EV-18`. Spine Fiends at count 9; two standing heroes, both fight number 3, both at 5 HP; inject a won round (cut 3, so the foe stands and the tie is reached). Run 20 seeds, and run each seed twice.
- Pass evidence: each run: exactly one hero loses 1 HP, and it is one of the two tied heroes; no prompt is offered; the same seed gives the same hero both times; across the 20 seeds each tied hero is hit at least once.
- Fails if: both heroes are hit, a prompt opens, the same seed gives different heroes, or the pick follows seat or tap order (one hero every time).

## Survival evals (one per survival invariant in plan.md)

### EV-13 — Continue after a trap fall
- Requirement: survival invariant 1; DEC-675.
- Method: unit
- How: `R04-EV-13`. EV-02's fixture; save after the trap is paid; restore; resume.
- Pass evidence: that hero 1 HP and corruptions 1; the trap is not paid again; the next room prompt is offered; state equals an uninterrupted run.
- Fails if: the trap is paid twice, the corruption repeats, or HP resets.

### EV-14 — Continue after Spines lands
- Requirement: survival invariant 2; DEC-675.
- Method: unit
- How: `R04-EV-14`. EV-11 (b) with Spine Fiends at count 4 (the cut of 2 leaves the foe at 2); save after Spines lands; restore; resume.
- Pass evidence: foe count 2; Spines fired once in the log; the felled hero still sits out; the next node is Fight/Retreat; card and deck position equal an uninterrupted run.
- Fails if: Spines or the cut repeats, or the sit-out is lost.

### EV-15 — End to end through the session (R04)
- Requirement: R04's trap and Spines cases, DEC-906, DEC-907.
- Method: unit
- How: one test that drives a seeded game through the session step shell by presses (as `towerLost.test.ts` does) into a Tomb: (a) a Falling Rocks room fells one of two heroes, then (b) a battle room with Spine Fiends at count 1 is won on a forced won round. Then a second seed: (c) a Pit fells a solo hero (Tomb failed).
- Pass evidence: (a) the fallen hero is offered in the next room's prompt; (b) the battle shows won with no Spines line and the hero's HP unchanged by it; (c) the group is back on the board with the quest failed and the purse unchanged.
- Fails if: any step needs a direct state write after the start, a fallen hero is benched in the Tomb, Spines fires on the final cut, or gold is lost to a trap.

## Assumptions surfaced
- Falling Rocks is one effect; every hero pays before the loss check → DEC-939 (EV-16).
- A paid trap room is cleared even after a total fall; battle rooms keep F1's rule → DEC-940 (EV-06, EV-17).
- A Spines tie is a seeded pick among the tied standing heroes → DEC-941 (EV-18); other fixtures use distinct fight numbers.
- No Advantages in any fixture; their cut size is Q-214 and Q-312, not this brief.
- If the loops already conform, EV-01 to EV-18 land as tests with no code change.
