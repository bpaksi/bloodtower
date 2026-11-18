Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: D3 / 01-ward-and-boss-deck — The Ward cancels the weakest spell once; a boss phase shuffles its Rend into the unrevealed cards

- Brief: ./plan.md
- Mockup: none
- Risk: High (battle state, seeded deck, restore). Negative and restore evals are included.

All fixtures: plain battle, no Advantage, companion, item or story effect unless named; spells as built (Lightning and Fireball cut a flat 4, once a battle; Magic Missile cuts 2, DEC-801); round outcomes and seeds injected; no new simulator. The Ward fixtures use the Striga (Ward); the halving fixture uses a test foe holding both Ward and Colossus, since no base foe has both. The deck fixtures drive a phase from a test trigger if C5-02's boss code is not on main. Tests are named `R04-D3-<EV>`. Source: DEC-908's example, DEC-909's R04 fixtures.

## Checks

### EV-01 — Two spells in one round: the smaller is cancelled
- Requirement: DEC-908, DEC-655.
- Method: unit
- How: `R04-D3-EV-01`. Striga at count 10; round 1, hero A casts Lightning (4), hero B casts Magic Missile (2). Run again with A and B's seats swapped, and again with B tapping first.
- Pass evidence: all three runs: foe count 6; the Missile is the cancelled spell; Lightning is spent for the battle; the Ward is marked used.
- Fails if: the foe takes 2 (the strongest was cancelled), 6 is not reached in every seat or tap order, or both spells land.

### EV-02 — One spell alone draws the Ward; a later spell lands in full
- Requirement: DEC-908: the Ward is used once, on the round it first meets a spell.
- Method: unit
- How: `R04-D3-EV-02`. Striga at count 10; round 1, Magic Missile alone; the round lost or won as injected; round 2, Lightning.
- Pass evidence: after round 1's spells the count is 10 (the Missile cancelled); after round 2's spells it is 6; the Ward is used after round 1.
- Fails if: round 2's Lightning is cancelled, the Ward comes back each round, or round 1's Missile lands.

### EV-03 — A cancelled once-a-battle spell is spent
- Requirement: DEC-908, DEC-801.
- Method: unit
- How: `R04-D3-EV-03`. Striga; round 1, Fireball alone; round 2, the same hero's action list.
- Pass evidence: round 1 count unchanged; in round 2 Fireball is not offered to that hero.
- Fails if: Fireball can be cast again after the Ward cancelled it.

### EV-04 — Equal cuts: the same result; the caption names the first seat
- Requirement: DEC-908, DEC-655.
- Method: unit
- How: `R04-D3-EV-04`. Striga at count 10; round 1, two Magic Missiles (2 and 2), in both seat orders.
- Pass evidence: count 8 in both runs; one Missile cancelled; the cancel caption's data names the hero in the first seat; the count does not depend on seat.
- Fails if: the count differs by seat, both Missiles land, or both are cancelled.

### EV-05 — Order: cancel, then flat cuts, then halving
- Requirement: DEC-908 (order at .8), DEC-655, DEC-553 (Colossus).
- Method: unit
- How: `R04-D3-EV-05`. Test foe with Ward and Colossus at count 10; round 1, Lightning (4) and Magic Missile (2).
- Pass evidence: the Missile is cancelled; Lightning is halved to 2; count 8.
- Fails if: the count is 7 (no cancel: 2 + 1 landed), 6 (no halving), 9 (the strong spell cancelled, the Missile halved), or 10.

### EV-06 — The Ward is per battle
- Requirement: DEC-908: "used once per battle".
- Method: unit
- How: `R04-D3-EV-06`. EV-02's battle, retreat after round 2 (foe kept, DEC-651); a new genuine battle with the same Striga; round 1, Magic Missile alone.
- Pass evidence: the new battle's Ward cancels the Missile (the Ward is fresh in a new battle).
- Fails if: the Ward stays used across battles.

### EV-07 — A phase shuffles its Rend into the draw pile only (R04 traces)
- Requirement: DEC-909, DEC-649, DEC-567.
- Method: unit
- How: `R04-D3-EV-07`. Boss deck of 8 (2 Rends, DEC-567), seeded; fire one phase when the draw pile holds 5 cards, again when it holds 1, and again when it holds 0, in three seeded runs. Snapshot the three piles before and after.
- Pass evidence: after each phase the draw pile has one more card, the added card is a Rend, the deck holds 9 cards and 3 Rends; the discards and the face-up card are identical to before; the face-up card resolves as before (lands only if the round is lost); the same seed gives the same draw order; at 0 the draw pile is exactly [Rend] and the next reveal is that Rend.
- Fails if: the Rend goes on top or into the discards, the discards or the face-up card change, or a seed gives two orders.

### EV-08 — Two phases in one round
- Requirement: DEC-909, DEC-658.
- Method: unit
- How: `R04-D3-EV-08`. A cut that crosses both phase lines in one round, draw pile at 4.
- Pass evidence: two Rends added, one shuffle each, in phase order; the deck holds 10 cards and 4 Rends; discards and face-up card unchanged.
- Fails if: one Rend, one shuffle for both, or only the deeper phase fires.

### EV-09 — The cycle counts every card; the panel counts are right
- Requirement: DEC-909, DEC-649.
- Method: unit
- How: `R04-D3-EV-09`. After EV-07's phase at 5, reveal until the draw pile is empty, then one more reveal; read the foe panel's view data each round.
- Pass evidence: 9 distinct reveals before any repeat; the reshuffle returns all 9 including the added Rend; each round the view data's cards-left and Rends-left equal the draw pile's actual counts.
- Fails if: a card repeats before 9 reveals, the added Rend is lost at the reshuffle, or the counts disagree with the pile.

### EV-10 — End to end through the session (R04)
- Requirement: R04's Ward and boss-deck cases; DEC-908, DEC-909.
- Method: unit
- How: one test that drives a seeded game through the session step shell by presses (as `towerLost.test.ts` does) into a battle with the Striga: (a) Lightning and Magic Missile in round 1; then a second seed (b) a boss-deck fixture battle where a won round crosses a phase line with 3 cards in the draw pile.
- Pass evidence: (a) the foe count drops by 4 and the Missile is the cancelled spell; (b) the next round's view data shows cards left 3 + 1 and Rends left one higher, and the card face-up when the phase fired was resolved, not replaced.
- Fails if: any step needs a direct state write after the start, the Ward cancels the strong spell, or the phase touches the face-up card.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — Continue after the Ward
- Requirement: survival invariant 1; DEC-675.
- Method: unit
- How: `R04-D3-EV-11`. EV-02; save after round 1's spells; restore; round 2 Lightning.
- Pass evidence: Ward used; count 6 after round 2's spells; same as an uninterrupted run.
- Fails if: the restored Ward cancels Lightning, or the spent spell returns.

### EV-12 — Continue after a phase
- Requirement: survival invariant 2; DEC-675.
- Method: unit
- How: `R04-D3-EV-12`. EV-07 at 5; save after the phase; restore; reveal to the reshuffle.
- Pass evidence: same draw order, discards, face-up card and Rend count as the uninterrupted run; no second Rend added.
- Fails if: the restore re-adds the Rend, reshuffles, or changes the order.

## Assumptions surfaced
- A test foe with both Ward and Colossus stands in for the order check; no base foe has both (DEC-553).
- The deck operation is built and tested with a test phase trigger if C5-02 is not on main; C5-02 calls it later.
- If the spells step or the round deck is not on main after F1 and D2, those EVs are blocked, not built from nothing.
- If the code already conforms, EV-01 to EV-12 land as tests with no code change.
