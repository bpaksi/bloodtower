Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 06-building-picks — Buildings: the menu, rally, cure, rest, virtue draw and Cleanse

- Brief: ./plan.md
- Mockup: none
- Risk: Med.

## Checks

### EV-01 — Every pick costs one move
- Requirement: DEC-078.
- Method: unit
- How: `encounter.test.ts`: a group with 3 moves rallies, then Cleanses.
- Pass evidence: 1 move left; Leave is free.
- Fails if: Enter costs a move, or a pick costs none.

### EV-02 — The first cure each chapter is free
- Requirement: DEC-700, DEC-170.
- Method: unit
- How: a hero with 2 corruptions cures twice in chapter 1, once in chapter 2.
- Pass evidence: cure 1: 0 gold; cure 2: the DEC-170/DEC-552 rising price; chapter 2's first: 0 gold.
- Fails if: the free cure is per party, or carries across chapters.

### EV-03 — Silver Tongue takes a quarter off
- Requirement: DEC-681.
- Method: unit
- How: rally with the Bard present.
- Pass evidence: price 4 (5 less a quarter, rounded as DEC-681/P-003 say).
- Fails if: no discount, or the discount applies without the Bard present.

### EV-04 — An unaffordable pick shows disabled
- Requirement: UI-043, DEC-693.
- Method: unit
- How: purse 3; open a citadel.
- Pass evidence: rally and virtue draw are offered disabled with their price; pressing does nothing.
- Fails if: they are hidden, or pressing spends gold below 0.

### EV-05 — Cleanse removes a skull and buys a day
- Requirement: DEC-377, DEC-686.
- Method: unit
- How: Cleanse a 2-skull building.
- Pass evidence: 1 skull left; supply +1; the day's effects data reads "+1 day".
- Fails if: the supply does not change.

### EV-06 — Skulls shrink the menu
- Requirement: DEC-093.
- Method: unit
- How: a citadel at 0, 1, 2, 3 skulls.
- Pass evidence: the menu shrinks per DEC-093; the quest marker stays first while present.
- Fails if: the menu is unchanged by skulls.

### EV-07 — Rest heals per move
- Requirement: +3 hit points a move, up to full (DEC-174, MEC-075).
- Method: unit
- How: rest 2 moves at 4/12.
- Pass evidence: 10/12; Back after opening still spends the pick's move.
- Fails if: Back refunds the move.

## Survival evals (one per survival invariant in plan.md)

### EV-08 — The free cure is remembered
- Requirement: DEC-700.
- Method: unit
- How: cure free, autosave, Continue, cure again in the same chapter.
- Pass evidence: the second costs the normal price.
- Fails if: Continue gives a second free cure.

## Assumptions surfaced

- Silver Tongue's rounding of a quarter off follows P-003 (5 → 4).

## OPEN questions

- Q-C3-13: which picks does each 1.0 building kind offer? DEC-158 lists a citadel potion and an audience; DEC-502 cuts NPCs and shops. Are the potion and audience out of 1.0?
- Q-C3-14: is there a 1.0 bazaar or village pick beyond rest and Cleanse, or are they Cleanse-only (P-003 gap 2 says "in 1.0 those sell nothing")?
