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
- How: one case per card at its trigger and one off it.
- Pass evidence: gold lost only on the card's trigger (village pick, bazaar pick, turn ending on a building, in the home kingdom, every buy), by the tuned amount.
- Fails if: a loss fires off trigger, or the amount is hard-coded.

### EV-06 — Which corruption a hero gets
- Requirement: MEC-080 and the corruption cards.
- Method: unit
- How: give a hero two corruptions under a fixed seed.
- Pass evidence: the named corruption is drawn as the card says (see OPEN Q-C3-15), stored by ID.
- Fails if: a named corruption is shown but has no effect.

## Survival evals (one per survival invariant in plan.md)

### EV-07 — Corruptions survive Continue
- Requirement: MEC-080.
- Method: unit
- How: autosave with a hero holding Feral; Continue; end the turn on a building.
- Pass evidence: Feral still fires.
- Fails if: the named corruption is lost on reload.

## Assumptions surfaced

- Cursed's effect needs a battle round and is built in C4. Bob: OK?

## OPEN questions

- Q-C3-15: how is the named corruption picked when a hero takes one: a seeded draw from the 1.0 set, the story's choice (MEC-059), or the group's? And can a hero draw the same one twice?
- Q-C3-16: the gold amounts for Cruel, Greedy, Feral, Lost and Tempted are not in DEC-703's table. Which numbers?
