Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 02-battle-loop — The battle loop: horn, rounds, Fight or Retreat, one action each

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-07; the survival eval is last (EV-07).

## Checks

### EV-01 — Rounds follow MEC-038's order
- Requirement: MEC-038.
- Method: unit
- How: fixed seed, 2 heroes vs level-2 foe.
- Pass evidence: ordered log: abilities, choice, actions, spells, card, result.
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

### EV-05 — No timer (Gamewright pick, pending Bob)
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

## Survival evals (one per survival invariant in plan.md)

### EV-07 — Continue resumes mid-round
- Requirement: DEC-675.
- Method: playwright
- How: quit after 1 of 2 picks; Continue.
- Pass evidence: same round, foe wounds, the 1 pick kept.
- Fails if: restart or lost pick.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C4-11 **[Bob taste call]**: Does a battle round have a timer on the iPads? Options: (a) no timer; the round waits for every present hero; (b) 30 seconds, then a missing pick becomes a normal attack (DEC-129). Gamewright pick: (a) (Gamewright pick, pending Bob).
