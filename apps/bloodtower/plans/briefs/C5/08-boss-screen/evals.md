Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C5 / 08-boss-screen — The Warden on screen: phases and the tower show

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Done-when: EV-01 … EV-05; the survival eval is last (EV-05).

## Checks

### EV-01 — Phase painting changes (Gamewright pick, pending Bob)
- Requirement: Q-C5-02.
- Method: playwright
- How: cross 2/3.
- Pass evidence: painting 2.
- Fails if: same.

### EV-02 — Board-only show without tower (Gamewright pick, pending Bob)
- Requirement: Q-C5-08.
- Method: playwright
- How: no tower; cross a phase.
- Pass evidence: painting change, shake, board sound.
- Fails if: nothing.

### EV-03 — Tower show with tower
- Requirement: DEC-327.
- Method: playwright
- How: tower; arrival and each phase.
- Pass evidence: 3 shows sent.
- Fails if: missing.

### EV-04 — Screenshots match
- Requirement: UI-026.
- Method: screenshot
- How: mockup `#phase1`..`#phase3`.
- Pass evidence: matching.
- Fails if: differs.

## Survival evals (one per survival invariant in plan.md)

### EV-05 — Phase redrawn after Continue
- Requirement: DEC-675.
- Method: playwright
- How: phase 3, quit, Continue.
- Pass evidence: phase 3 painting.
- Fails if: phase 1.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C5-02 **[Bob taste call]**: The Warden's three phases (DEC-567): three paintings or one? Options: (a) three paintings, one per phase; (b) one painting, darkening at each phase. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C5-08: The boss's full tower show (DEC-567, DEC-327) with no tower connected: Options: (a) a board-only show: the painting change, a shake and the sound on the board speakers; (b) skip the show. Gamewright pick: (a) (Gamewright pick, pending Bob).
