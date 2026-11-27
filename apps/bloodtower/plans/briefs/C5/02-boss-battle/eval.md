Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C5 / 02-boss-battle — The Warden: his own deck and three phases

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-09; survival evals last (EV-08).
- Amended 2026-11-27 (Bob, via Warden): EV-03 allows a retreat and keeps damage; EV-09 moved here from C4/04 and is not required there.

## Checks

### EV-01 — Deck shape
- Requirement: DEC-567.
- Method: unit
- How: build the deck.
- Pass evidence: 8 cards, 2 Rends, no Falter.
- Fails if: other.

### EV-02 — Phase at 2/3 and 1/3
- Requirement: DEC-567.
- Method: unit
- How: cut wounds.
- Pass evidence: phase 2 then 3; +1 Rend each.
- Fails if: missed.

### EV-03 — Wounds end him; a retreat keeps the damage (Bob, 2026-11-27, via Warden)
- Requirement: DEC-567, DEC-361, DEC-360. (Inventive, DEC-549, is 1.1: no potions in 1.0, DEC-502, DEC-581. Its block returns with 1.1. Changed 2026-11-12 by Gamewright under Bob's 11/1 small-tweak rule; the original check cannot run in 1.0.)
- Method: unit
- How: (a) The Warden in phase 3 at 2 wounds; the group takes every round action the 1.0 engine offers. (b) The same battle after a Fight cut has lowered his wounds; the group Retreats with a move left.
- Pass evidence: (a) his wounds change only by a Fight cut; he falls only at 0 wounds; a fall of every hero ends the battle; there is no Inventive card in the 1.0 pool (DEC-581). (b) Retreat is offered and ends the battle; the wounds already cut stay cut.
- Fails if: an action other than a Fight cut, a total fall, or a retreat ends the battle or changes his wounds; a retreat is refused; or a retreat restores wounds.

### EV-04 — Falls at 0
- Requirement: DEC-567.
- Method: unit
- How: cut to 0.
- Pass evidence: won; no false death.
- Fails if: revives.

### EV-05 — His ability grows at each phase
- Requirement: DEC-567.
- Method: unit
- How: The Warden's real Crushing blow (DEC-688); lose a Claw round in each phase against 1 hero.
- Pass evidence: the hit is 5 + 1 = 6 in phase 1, 7 in phase 2, 8 in phase 3; a phase-3 Rend hits 2 × 5 + 3 = 13.
- Fails if: the same in every phase.

### EV-06 — The Warden is level 5 with 20 wounds for 1 hero, 21 for 2
- Requirement: DEC-703, DEC-563.
- Method: unit
- How: start the boss battle with 1 hero, then with 2.
- Pass evidence: level 5; wounds 20, then 21.
- Fails if: any other level or count.

### EV-07 — Strength stays 5 in every phase
- Requirement: DEC-567, DEC-688.
- Method: unit
- How: drive the battle through phases 1, 2 and 3.
- Pass evidence: the round-odds level reads 5 in each phase.
- Fails if: any change.

## Survival evals (one per survival invariant in plan.md)

### EV-08 — Phase survives Continue
- Requirement: DEC-675.
- Method: playwright
- How: phase 2, quit, Continue.
- Pass evidence: phase 2.
- Fails if: phase 1.

### EV-09 — Ward and boss deck end to end through the session (moved from C4/04 EV-09; Bob, 2026-11-27, via Warden)
- Requirement: R04's Ward and boss-deck cases; DEC-908, DEC-909. Not required by C4/04.
- Method: unit
- How: one test that drives a seeded game through the session step shell by presses (as `towerLost.test.ts` does) into the Warden's battle: (a) Lightning and Magic Missile in round 1; (b) a second seed where a won round crosses a phase line with 3 cards in the draw pile.
- Pass evidence: (a) the foe count drops by 4 and the Missile is the cancelled spell; (b) the next round's view data shows cards left 3 + 1 and Rends left one higher, and the card face-up when the phase fired was resolved, not replaced.
- Fails if: any step needs a direct state write after the start, the Ward cancels the strong spell, or the phase touches the face-up card.

## Assumptions surfaced

- Picks marked "(Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- Resolved Q-C5-02 **[Bob taste call]**: The Warden's three phases (DEC-567): three paintings or one? Options: (a) three paintings, one per phase; (b) one painting, darkening at each phase. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
