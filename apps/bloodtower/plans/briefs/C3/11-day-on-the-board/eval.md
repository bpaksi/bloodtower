Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 11-day-on-the-board — The day on the board: day roll, days left, threat bar, effects panel

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Risk: Med.

## Checks

### EV-01 — The day roll panel
- Requirement: UI-021, DEC-615.
- Method: playwright
- How: new `c3-day.spec.ts`, seeded game, day 1.
- Pass evidence: "Day 1" and each group's moves with modifiers, e.g. "5 (+1 virtue)".
- Fails if: modifiers are missing.

### EV-02 — Days left on the edge band
- Requirement: UI-028, DEC-686.
- Method: playwright
- How: after day 1's drop with 2 heroes.
- Pass evidence: the band reads days left 23 (24 − 1), not "23 skulls".
- Fails if: skulls shown instead of days.

### EV-03 — A won quest shows +1 day
- Requirement: DEC-699, UI-022.
- Method: playwright
- How: win The Herald on day 2.
- Pass evidence: the effects panel lists "+1 day" and no drop line; days left unchanged.
- Fails if: a drop line shows.

### EV-04 — No numbers on the effects panel
- Requirement: DEC-115.
- Method: playwright
- How: any day's end.
- Pass evidence: one line per effect, no recap of the day.
- Fails if: a recap or a totals table shows.

### EV-05 — Regroup on the iPad only
- Requirement: DEC-640, SCR-016.
- Method: playwright
- How: 2 heroes, day 2 start.
- Pass evidence: each iPad offers split or join; the board shows the waiting line; nothing on the board is pressable.
- Fails if: the board takes a press.

### EV-06 — Screenshots match the screen spec
- Requirement: SCR-014, UI-021, UI-022, UI-028, UI-047.
- Method: screenshot
- How: board 1920×1080 and iPad 768×1024 portrait (locked by Bob) at: day roll, mid-turn, effects panel; compare side by side with ./mockup.html (Illusionist, from ./screen-spec.md) sections `#roll`, `#band`, `#effects`.
- Pass evidence: six images, parts and order matching.
- Fails if: a part is missing.

## Survival evals (one per survival invariant in plan.md)

### EV-07 — Continue shows the same clock
- Requirement: DEC-686.
- Method: playwright
- How: quit on day 3, Continue.
- Pass evidence: the band reads the same days left; buildings show the same skulls.
- Fails if: the count resets.

## Assumptions surfaced

- EV-06 needs ./mockup.html, which Illusionist draws from ./screen-spec.md before approval.

## OPEN questions

- Q-C3-04 (days left for 3–4 heroes)
- DEFAULT Q-C3-19 (Gamewright default, pending Bob's review): the threat bar shows only the coming drop.
