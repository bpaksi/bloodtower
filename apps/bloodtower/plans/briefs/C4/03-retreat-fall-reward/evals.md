Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 03-retreat-fall-reward — Battle ends: the reward, the retreat, the group's fall

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-05; the survival eval is last (EV-05).

## Checks

### EV-01 — Reward by level
- Requirement: DEC-120.
- Method: unit
- How: win vs level 3.
- Pass evidence: tuned gold and one card.
- Fails if: wrong amount or no card.

### EV-02 — Foe grows, capped at +2 (Gamewright pick, pending Bob)
- Requirement: DEC-016, Q-C4-13.
- Method: unit
- How: retreat 3 times from a level-2 foe.
- Pass evidence: levels 3, 4, 4.
- Fails if: 5 or no growth.

### EV-03 — A fall costs half the purse (Gamewright pick, pending Bob)
- Requirement: DEC-177, Q-C4-12.
- Method: unit
- How: purse 15, all fall.
- Pass evidence: purse 8.
- Fails if: any other value.

### EV-04 — A retreat that fells everyone is a fall
- Requirement: DEC-671.
- Method: unit
- How: retreat with all at 0.
- Pass evidence: fall result.
- Fails if: retreat result.

## Survival evals (one per survival invariant in plan.md)

### EV-05 — A grown foe survives Continue
- Requirement: DEC-016.
- Method: playwright
- How: grow a foe, quit, Continue.
- Pass evidence: same level on the board.
- Fails if: reset.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C4-12: A fallen group's gold loss (DEC-177): how much? Options: (a) half the purse, rounded down, as `battle.fall_gold_loss` = 0.5; (b) a flat 10 gold, never below 0. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-13: A foe that stays and grows (DEC-016): is the growth capped? Options: (a) capped at +2 levels over its start; (b) no cap. Gamewright pick: (a) (Gamewright pick, pending Bob).
