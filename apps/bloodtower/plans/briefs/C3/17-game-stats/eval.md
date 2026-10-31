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

## Survival evals (one per survival invariant in plan.md)

### EV-06 — The rating is kept
- Requirement: SCR-019.
- Method: unit
- How: rate 4, restart, drill in.
- Pass evidence: 4 shown.
- Fails if: lost.

## Assumptions surfaced

- Who gives the rating (one iPad or each) is OPEN Q-C3-21.

## OPEN questions

- Q-C3-18 (key moments)
- Q-C3-21: the fun rating: one for the table, or one per iPad?
