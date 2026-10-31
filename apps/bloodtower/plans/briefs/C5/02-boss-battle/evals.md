Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C5 / 02-boss-battle — The Warden: his own deck and three phases

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-05; the survival eval is last (EV-05).

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
- How: Inventive at phase 3.
- Pass evidence: not ended.
- Fails if: ended.

### EV-04 — Falls at 0
- Requirement: DEC-567.
- Method: unit
- How: cut to 0.
- Pass evidence: won; no false death.
- Fails if: revives.

## Survival evals (one per survival invariant in plan.md)

### EV-05 — Phase survives Continue
- Requirement: DEC-675.
- Method: playwright
- How: phase 2, quit, Continue.
- Pass evidence: phase 2.
- Fails if: phase 1.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C5-02 **[Bob taste call]**: The Warden's three phases (DEC-567): three paintings or one? Options: (a) three paintings, one per phase; (b) one painting, darkening at each phase. Gamewright pick: (a) (Gamewright pick, pending Bob).
