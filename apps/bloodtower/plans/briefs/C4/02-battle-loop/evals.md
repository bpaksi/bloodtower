Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 02-battle-loop — The battle loop: horn, rounds, Fight or Retreat, one action each

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-11; survival evals last (EV-11).

## Checks

### EV-01 — Rounds follow MEC-038's order
- Requirement: MEC-038.
- Method: unit
- How: fixed seed, 2 heroes vs level-2 foe.
- Pass evidence: ordered log events: `battle.abilities`, `battle.stance`, `round.choice`, `round.actions`, `round.spells`, `round.card`, `round.result`.
- Fails if: any step out of order.

### EV-02 — Round cards never repeat before 8
- Requirement: DEC-649.
- Method: unit
- How: run 8 rounds.
- Pass evidence: 8 distinct cards, then a reshuffle.
- Fails if: a repeat in 8.

### EV-03 — A spell kill ends the round
- Requirement: DEC-643.
- Method: unit
- How: foe at 1 wound, a damage spell.
- Pass evidence: battle ends before the card draw.
- Fails if: card drawn.

### EV-04 — A hero at 0 sits out with a corruption
- Requirement: DEC-119.
- Method: unit
- How: hit a hero at 1 HP.
- Pass evidence: hero out of later rounds, one corruption gained.
- Fails if: still acts.

### EV-05 — No timer (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)
- Requirement: Q-C4-11.
- Method: unit
- How: one hero never picks.
- Pass evidence: round waits; no auto action.
- Fails if: auto attack.

### EV-06 — Headless battles finish
- Requirement: MEC-038.
- Method: sim
- How: 1,000 seeded battles.
- Pass evidence: every battle exits won, retreated or fallen; no hang.
- Fails if: a hang or crash.

### EV-07 — Foe abilities fire before round 1
- Requirement: DEC-553.
- Method: unit
- How: fixture foe with a start ability (−1 HP to each present hero).
- Pass evidence: each present hero −1 HP and log `battle.abilities` before the first `round.choice`.
- Fails if: the ability fires in round 1 or not at all.

### EV-08 — Bold and on guard apply before round 1
- Requirement: DEC-607.
- Method: unit
- How: enter bold; then a second run entered on guard.
- Pass evidence: bold: +1 strength in round 1 only; on guard: a lost round 1 hits no one.
- Fails if: either applies after round 1 or in every round.

### EV-09 — Retreat by the group ends the battle
- Requirement: DEC-118.
- Method: unit
- How: the group picks Retreat in round 2.
- Pass evidence: battle ends `retreated` with no `round.actions` in round 2; foe wounds kept.
- Fails if: actions are asked or the foe resets.

### EV-10 — A won round cuts, a lost round hits
- Requirement: MEC-024 step 5, DEC-703, DEC-563.
- Method: unit
- How: a level-2 foe, 1 hero present (8 wounds); seed with round 1 won at round strength 3 and round 2 lost; heroes at full.
- Pass evidence: after round 1 the foe has 6 wounds (cut = half of 3 rounded up = 2, at least 2); after round 2 exactly one present hero has lost 2 HP, the foe's level (0 if a guard virtue was used).
- Fails if: a won round hits a hero, or a lost round cuts the foe.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — Continue resumes mid-round
- Requirement: DEC-675.
- Method: playwright
- How: quit after 1 of 2 picks; Continue.
- Pass evidence: same round, foe wounds, the 1 pick kept.
- Fails if: restart or lost pick.

## Assumptions surfaced

- Picks marked "(Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C4-11 **[Bob taste call]**: Does a battle round have a timer on the iPads? Options: (a) no timer; the round waits for every present hero; (b) 30 seconds, then a missing pick becomes a normal attack (DEC-129). Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
