Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 10-round-picker — The round picker on the iPad: Fight or Retreat, then one action

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Done-when: EV-01 … EV-05; the survival eval is last (EV-05).

## Checks

### EV-01 — Fight or Retreat first
- Requirement: UI-027, DEC-118.
- Method: playwright
- How: start a round.
- Pass evidence: both buttons; no actions yet.
- Fails if: actions first.

### EV-02 — All pick at once (Gamewright pick, pending Bob)
- Requirement: Q-C4-16.
- Method: playwright
- How: 3 iPads.
- Pass evidence: all three pickers open together; board ticks each.
- Fails if: serial.

### EV-03 — A sat-out hero gets no picker
- Requirement: DEC-119.
- Method: playwright
- How: hero at 0.
- Pass evidence: that iPad shows `[COPY: sitting out = "You are sitting out this battle. Watch the board."]` and no buttons.
- Fails if: picker shown.

### EV-04 — Screenshots match
- Requirement: UI-027.
- Method: screenshot
- How: iPad 768×1024 portrait, mockup `#choice`, `#actions`.
- Pass evidence: matching.
- Fails if: differs.

## Survival evals (one per survival invariant in plan.md)

### EV-05 — Pick survives Continue
- Requirement: DEC-675.
- Method: playwright
- How: pick, quit, Continue.
- Pass evidence: pick still ticked.
- Fails if: lost.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C4-16 **[Bob taste call]**: Round actions on the iPads (DEC-129): all at once or in turn? Options: (a) all at once; the board ticks each hero who has picked, and the round runs when all have; (b) in turn order, one iPad at a time. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-11 **[Bob taste call]**: Does a battle round have a timer on the iPads? Options: (a) no timer; the round waits for every present hero; (b) 30 seconds, then a missing pick becomes a normal attack (DEC-129). Gamewright pick: (a) (Gamewright pick, pending Bob).
