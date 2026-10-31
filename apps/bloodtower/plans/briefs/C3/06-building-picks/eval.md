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
- How: rally with the Bard present in the group; then rally with the Bard in another group.
- Pass evidence: Bard present: price 4 (5 less a quarter, rounded as DEC-681/P-003 say). Bard in another group: full price 5.
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
- Pass evidence: per DEC-093, each skull removes the last offer above Cleanse; Cleanse and Leave always stay, and the quest marker stays first while present. Citadel: 0 skulls Rally, Virtue draw, Cleanse; 1 skull Rally, Cleanse; 2 and 3 skulls Cleanse only (Gamewright proposal, pending Bob).
- Fails if: the menu is unchanged by skulls.

### EV-07 — Rest heals per move
- Requirement: +3 hit points a move, up to full (DEC-174, MEC-075).
- Method: unit
- How: rest 2 moves at 4/12.
- Pass evidence: 10/12; Back after opening still spends the pick's move.
- Fails if: Back refunds the move.

### EV-08 — Rally heals to full and takes the price from the purse
- Requirement: DEC-158, DEC-176, DEC-078; rally 5 gold + 1 move (Bob approved 2026-10-31).
- Method: unit
- How: hero at 4/12, purse 12, 3 moves left; rally at a citadel.
- Pass evidence: hero 12/12; purse 7 (−5); moves 2 (−1).
- Fails if: partial heal, the purse or a hero's share is not reduced by the tuning price, or no move is spent.

### EV-09 — Virtue draw adds one tile; a fifth forces a give-back
- Requirement: DEC-544; virtue draw 10 gold + 1 move (Bob approved 2026-10-31).
- Method: unit
- How: fixed seed; group holding 3 virtue tiles, purse 25; draw twice.
- Pass evidence: first draw: 4 tiles, purse 15, the drawn tile matches the seed. Second draw: purse 5; a give-back prompt opens and the group ends with exactly 4 tiles.
- Fails if: a draw adds 0 or 2 tiles, the fifth is kept, or the draw is unseeded.

### EV-10 — A fallen building offers nothing, not even Cleanse
- Requirement: DEC-093, plan "Cleanse on every standing building".
- Method: unit
- How: fell a citadel with its 4th skull; try to move there and to open its menu.
- Pass evidence: it is not a move target as a place; opening its menu is refused; no Cleanse is offered.
- Fails if: the fallen building can be entered or Cleansed.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — The free cure is remembered
- Requirement: DEC-700.
- Method: unit
- How: cure free, autosave, Continue, cure again in the same chapter.
- Pass evidence: the second costs the normal price.
- Fails if: Continue gives a second free cure.

### EV-12 — The free cure survives a restart
- Requirement: DEC-700.
- Method: unit
- How: cure free in chapter 1; restart the host; rebuild from the event log; cure again in chapter 1.
- Pass evidence: the second cure costs the normal price (10 gold (Bob approved 2026-10-31)).
- Fails if: the restart gives a second free cure.

## Assumptions surfaced

- Rest is the village's tavern rest (Bob approved 2026-10-31).
- The C3 menus and prices in plan.md are approved by Bob, 2026-10-31 (Q-C3-13, Q-C3-14).
- Silver Tongue's rounding of a quarter off follows P-003 (5 → 4).

## OPEN questions

- ANSWERED Q-C3-13 (Bob approved 2026-10-31): potion and audience are out of 1.0; citadel Rally (5 gold + 1 move, heals to full), Virtue draw (10 gold + 1 move) or Cleanse; sanctuary cure (10 gold + 1 move, first free per hero each chapter) or Cleanse. Was: which picks does each 1.0 building kind offer? DEC-158 lists a citadel potion and an audience; DEC-502 cuts NPCs and shops. Are the potion and audience out of 1.0?
- ANSWERED Q-C3-14 (Bob approved 2026-10-31): village = tavern rest (+3 HP per move) or Cleanse; bazaar = Cleanse only. Was: is there a 1.0 bazaar or village pick beyond rest and Cleanse, or are they Cleanse-only (P-003 gap 2 says "in 1.0 those sell nothing")?
