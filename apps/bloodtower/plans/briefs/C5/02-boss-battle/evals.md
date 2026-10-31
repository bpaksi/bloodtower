Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C5 / 02-boss-battle — The Warden: his own deck and three phases

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-06; survival evals last (EV-06).

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

### EV-03 — Inventive cannot end it
- Requirement: DEC-549.
- Method: unit
- How: The Warden in phase 3 at 2 wounds; a hero plays Inventive.
- Pass evidence: The Warden still has 2 wounds and the battle continues; log `inventive.blocked`.
- Fails if: the battle ends or wounds change.

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

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C5-02 **[Bob taste call]**: The Warden's three phases (DEC-567): three paintings or one? Options: (a) three paintings, one per phase; (b) one painting, darkening at each phase. Gamewright pick: (a) (Gamewright pick, pending Bob).
