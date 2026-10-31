Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C5 / 07-tower-screens — The Tower on screen: level map, room view, the iPad's doors

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Done-when: EV-01 … EV-05; the survival eval is last (EV-05).

## Checks

### EV-01 — Two halves (Gamewright pick, pending Bob)
- Requirement: Q-C5-01.
- Method: playwright
- How: enter the Tower.
- Pass evidence: map left, view right.
- Fails if: one half.

### EV-02 — Three iPad choices
- Requirement: DEC-566.
- Method: playwright
- How: a cleared room with a shrine.
- Pass evidence: Open, Rest, Retreat.
- Fails if: other.

### EV-03 — The level shown
- Requirement: DEC-364.
- Method: playwright
- How: climb.
- Pass evidence: basement, main, tower named.
- Fails if: missing.

### EV-04 — Screenshots match
- Requirement: MEC-076.
- Method: screenshot
- How: mockup `#basement`, `#stair`, `#top`.
- Pass evidence: matching.
- Fails if: differs.

## Survival evals (one per survival invariant in plan.md)

### EV-05 — Map survives Continue
- Requirement: DEC-360.
- Method: playwright
- How: quit on main; Continue.
- Pass evidence: same.
- Fails if: reset.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C5-01 **[Bob taste call]**: The Tower has no screen cards. What does the board show in the Tower (MEC-076)? Options: (a) reuse the Tomb's two halves (DEC-583): the level's room map left, the room view right; Gamewright files UI cards for it in a design session; (b) the room map only, full width. Gamewright pick: (a) (Gamewright pick, pending Bob).
