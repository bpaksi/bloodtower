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
- How: one case per card at its trigger and one off it, amounts (Bob approved 2026-10-31):
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
- Pass evidence: each is a seeded draw from the C3 set (Bob approved 2026-10-31); the same seed gives the same two IDs; the second is never the first; both are stored by ID.
- Fails if: a named corruption is shown but has no effect, the draw is unseeded, or a hero draws one they hold.

### EV-07 — Selfish blocks giving a card
- Requirement: DEC-476.
- Method: unit
- How: 2 present heroes; the Selfish holder tries to give a virtue tile (and an item) to the other; then the other hero gives one to the Selfish holder.
- Pass evidence: the holder's give is refused and nothing moves; the other hero's give to the holder succeeds.
- Fails if: the holder can give a card, or Selfish also blocks receiving.
- Note (Gamewright, 2026-11-12, DEC-894): 1.0 has no hero-to-hero give action and DEC-544 forbids tile trades, so this runs against a stand-in pass rule in test code that would move a tile and an item. It tests the engine's `may this hero give?` guard, which every card-passing rule must call. No give action ships.

### EV-08 — Corruptions outside C3 are never drawn
- Requirement: DEC-466 (C4), DEC-467 and DEC-469 (1.1, DEC-718).
- Method: unit
- How: fixed seed; 1,000 corruption draws in C3.
- Pass evidence: DEC-466, DEC-467 and DEC-469 never appear; every draw is in the C3 set.
- Fails if: any of the three is drawn.

### EV-11 — Price order: free cure, Silver Tongue, then Tempted once
- Requirement: DEC-896, DEC-477, DEC-700.
- Method: unit
- How: (a) two Tempted holders in one group; a rally; (b) a Tempted holder's first cure of the chapter; (c) a Tempted holder's second cure; (d) a Silver Tongue holder buying at a village or bazaar price with a Tempted holder in the group.
- Pass evidence: (a) 5 + 2 = 7, not 9; (b) 0, with no surcharge; (c) the cure price for the hero's corruption count plus 2; (d) the quarter off is taken before the +2 and never cuts the +2.
- Fails if: Tempted stacks per holder, a free cure takes a surcharge, or the surcharge is discounted.
- Added by Gamewright 2026-11-12 under Bob's 11/1 small-tweak rule; no amount changes.

### EV-12 — Gold losses fire per holder from their own part
- Requirement: DEC-896, DEC-176, DEC-470, DEC-472.
- Method: unit
- How: two heroes both hold Cruel, with 5 and 1 gold in their own parts; the group takes a village pick. Then an Uncertain holder picks at a building and also holds Feral.
- Pass evidence: the first hero loses 2 and the second loses 1, down to 0, and nothing is taken from another hero. The Uncertain holder's turn ends after the pick, and Feral then fires once: the order is pay, pick-triggered losses, Uncertain's end of turn, turn-end losses.
- Fails if: a loss is shared, a loss goes below 0 or takes from another hero's part, or Feral does not fire after Uncertain.
- Added by Gamewright 2026-11-12 under Bob's 11/1 small-tweak rule; no amount changes.

### EV-13 — A save from before this feature is refused; the tuning keys are required
- Requirement: DEC-895, DEC-703.
- Method: unit
- How: Continue on a count-only fixture taken from `main` before this feature; then load a base tuning file with one of the five corruption keys removed.
- Pass evidence: Continue refuses the save as unreadable and offers a new game, with no corruption invented; the tuning load fails with the missing key named, and `pnpm pack:lint:all` fails on it.
- Fails if: the save loads with counts and no IDs, a corruption is backfilled, or a missing key falls back to a default.
- Added by Gamewright 2026-11-12 under Bob's 11/1 small-tweak rule.

## Survival evals (one per survival invariant in plan.md)

### EV-09 — Corruptions survive Continue
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

- Cursed is deferred to C4 and is never drawn in C3 (no C3 scene cost or deck can give it) (Bob 10:38 via Warden: Cursed corruption deferred to C4).

## OPEN questions

- ANSWERED Q-C3-15 (Bob approved 2026-10-31): a seeded draw from the C3 set, never one the hero already holds. Was: how is the named corruption picked when a hero takes one: a seeded draw from the 1.0 set, the story's choice (MEC-059), or the group's? And can a hero draw the same one twice?
- ANSWERED Q-C3-16 (Bob approved 2026-10-31): Cruel, Greedy and Feral −2 gold on their trigger; Lost −1; Tempted +2 on each buy. Was: the gold amounts for Cruel, Greedy, Feral, Lost and Tempted are not in DEC-703's table. Which numbers?
