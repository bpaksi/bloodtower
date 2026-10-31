Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 08-corruption — Corruption: gaining it, its 1.0 effects, the third one loses

- Brief: ./plan.md
- Mockup: none
- Risk: High. Restore evals included.

## Checks

### EV-01 — The third corruption loses at once
- Requirement: DEC-676.
- Method: unit
- How: a hero at 2 takes a scene cost corruption mid-quest.
- Pass evidence: the quest, encounter, turn and day loops stop; the game hands up lost with reason `corruption`; no later node (drop, event) runs.
- Fails if: the loss waits for the day's end.

### EV-02 — Uncertain ends the turn after a building pick
- Requirement: DEC-468.
- Method: unit
- How: Uncertain holder's group picks rally with 3 moves left.
- Pass evidence: the turn ends; the 2 moves are lost.
- Fails if: the group keeps moving.

### EV-03 — Feeble adds nothing to the move roll
- Requirement: DEC-474.
- Method: unit
- How: Feeble holder with a helping virtue.
- Pass evidence: that virtue's +1 is not added.
- Fails if: the +1 still applies.

### EV-04 — Feverish blocks Cleanse at 3 skulls
- Requirement: DEC-475.
- Method: unit
- How: a 3-skull building with a Feverish holder present.
- Pass evidence: Cleanse offered disabled; at 2 skulls it is enabled.
- Fails if: Cleanse works at 3.

### EV-05 — Each gold-loss corruption fires on its trigger only
- Requirement: DEC-470, DEC-471, DEC-472, DEC-473, DEC-477.
- Method: unit
- How: one case per card at its trigger and one off it, amounts (Gamewright proposal, pending Bob):
  - Cruel (DEC-470) ↔ after a village pick: −2; off: a citadel pick, 0.
  - Greedy (DEC-471) ↔ after a bazaar pick (Cleanse): −2; off: a village pick, 0.
  - Feral (DEC-472) ↔ the group's turn ends on a building's space: −2; off: ends in the wild, 0.
  - Lost (DEC-473) ↔ the turn ends in the holder's home kingdom: −1; off: another kingdom, 0.
  - Tempted (DEC-477) ↔ every buy the group makes: rally costs 5+2 = 7; off: Cleanse (no gold price), 0 extra.
  Then repeat Cruel with its tuning key set to 3 in a test copy.
- Pass evidence: each listed amount exactly, only on its own trigger; the test copy gives −3.
- Fails if: a loss fires off trigger, or the amount is hard-coded.

### EV-06 — Which corruption a hero gets
- Requirement: MEC-080 and the corruption cards.
- Method: unit
- How: give a hero two corruptions under a fixed seed; repeat with the same seed.
- Pass evidence: each is a seeded draw from the C3 set (Gamewright proposal, pending Bob); the same seed gives the same two IDs; the second is never the first; both are stored by ID.
- Fails if: a named corruption is shown but has no effect, the draw is unseeded, or a hero draws one they hold.

### EV-08 — Selfish blocks giving a card
- Requirement: DEC-476.
- Method: unit
- How: 2 present heroes; the Selfish holder tries to give a virtue tile (and an item) to the other; then the other hero gives one to the Selfish holder.
- Pass evidence: the holder's give is refused and nothing moves; the other hero's give to the holder succeeds.
- Fails if: the holder can give a card, or Selfish also blocks receiving.

### EV-09 — Corruptions outside C3 are never drawn
- Requirement: DEC-466 (C4), DEC-467 and DEC-469 (1.1, DEC-718).
- Method: unit
- How: fixed seed; 1,000 corruption draws in C3.
- Pass evidence: DEC-466, DEC-467 and DEC-469 never appear; every draw is in the C3 set.
- Fails if: any of the three is drawn.

## Survival evals (one per survival invariant in plan.md)

### EV-07 — Corruptions survive Continue
- Requirement: MEC-080.
- Method: unit
- How: autosave with a hero holding Feral; Continue; end the turn on a building.
- Pass evidence: Feral still fires.
- Fails if: the named corruption is lost on reload.

### EV-10 — Corruptions survive a restart
- Requirement: MEC-080.
- Method: unit
- How: a hero holds Feral and Lost; restart the host; rebuild from the event log; end the turn on a building in the holder's home kingdom.
- Pass evidence: the hero still holds Feral and Lost by ID; both fire (−2 and −1).
- Fails if: a corruption or its ID is lost on restart.

## Assumptions surfaced

- Cursed's effect needs a battle round and is built in C4. Bob: OK?

## OPEN questions

- Q-C3-15: how is the named corruption picked when a hero takes one: a seeded draw from the 1.0 set, the story's choice (MEC-059), or the group's? And can a hero draw the same one twice? Gamewright proposal, pending Bob: seeded draw from the C3 set, no repeats per hero.
- Q-C3-16: the gold amounts for Cruel, Greedy, Feral, Lost and Tempted are not in DEC-703's table. Which numbers? Gamewright proposal, pending Bob: Cruel/Greedy/Feral 2, Lost 1, Tempted +2 per buy.
