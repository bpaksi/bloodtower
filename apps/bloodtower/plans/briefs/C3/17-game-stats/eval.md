Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 17-game-stats — Game stats: the game in numbers

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Risk: Low.

## Checks

### EV-01 — Every stat in order
- Requirement: SCR-019, DEC-627.
- Method: playwright
- How: `c3-stats.spec.ts` after a fixture loss.
- Pass evidence: outcome, time played, days, quests done, corruptions taken, gold left, key moments, then the rating.
- Fails if: a stat missing.

### EV-02 — The rating never blocks Next
- Requirement: SCR-019.
- Method: playwright
- How: press Next with no rating.
- Pass evidence: the session screen.
- Fails if: Next disabled.

### EV-03 — Best and average
- Requirement: DEC-116.
- Method: unit
- How: three stored games of this story.
- Pass evidence: active length shown against best and average.
- Fails if: shown only for this game.

### EV-04 — Drill-in shows the same stats
- Requirement: SCR-021, C2 07.
- Method: playwright
- How: from tonight's games, open the game.
- Pass evidence: the same numbers and the rating given.
- Fails if: different numbers.

### EV-05 — Screenshots match
- Requirement: SCR-019.
- Method: screenshot
- How: board and iPad; compare with ./mockup.html `#stats`.
- Pass evidence: two images matching.
- Fails if: a part out of order.

### EV-06 — No Seals broken stat in C3
- Requirement: Q-C3-01 (no seal breaks in C3); DEC-627.
- Method: unit
- How: project the stats view after a C3 game won on chapter 1, and after one lost.
- Pass evidence: no Seals broken row, label or zero value in either.
- Fails if: Seals broken shows, even as 0.

## Survival evals (one per survival invariant in plan.md)

### EV-07 — The rating is kept
- Requirement: SCR-019.
- Method: unit
- How: rate 4, restart, drill in.
- Pass evidence: 4 shown.
- Fails if: lost.

## Assumptions surfaced

- Each iPad gives its own rating (default Q-C3-21, pending Bob).

## OPEN questions

- Q-C3-18 (key moments)
- DEFAULT Q-C3-21 (Gamewright default, pending Bob's review): the fun rating is per iPad.
