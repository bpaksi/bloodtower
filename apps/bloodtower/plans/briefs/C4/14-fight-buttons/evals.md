Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 14-fight-buttons — Fight on the event and quest scenes

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Done-when: EV-01 … EV-05; the survival eval is last (EV-05).

## Checks

### EV-01 — Fight on foes and disasters (Gamewright pick, pending Bob)
- Requirement: Q-C4-02.
- Method: playwright
- How: each event type.
- Pass evidence: Fight on both.
- Fails if: missing.

### EV-02 — Fight hands to the battle
- Requirement: MEC-038.
- Method: playwright
- How: pick Fight.
- Pass evidence: horn, foe panel, round picker.
- Fails if: nothing.

### EV-03 — The Ambush: two options
- Requirement: DEC-662.
- Method: playwright
- How: reach The Ambush.
- Pass evidence: Fight, pay the toll.
- Fails if: one.

### EV-04 — Screenshots match
- Requirement: UI-041.
- Method: screenshot
- How: iPad 768×1024; mockup `#foes`, `#ambush`.
- Pass evidence: matching.
- Fails if: differs.

## Survival evals (one per survival invariant in plan.md)

### EV-05 — Fight survives Continue
- Requirement: DEC-675.
- Method: playwright
- How: quit at a foes event; Continue.
- Pass evidence: Fight still shown.
- Fails if: gone.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C4-02: Where does Fight show once `fight_enabled` is on? Options: (a) on every foes and disaster event and on every plain-scene option that holds a battle, always enabled; (b) on foes events only; disasters stay Go around / Pay them off until C5. Gamewright pick: (a) (Gamewright pick, pending Bob).
