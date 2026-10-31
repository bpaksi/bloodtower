Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 17-game-stats — Game stats: the game in numbers

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Risk: Low.

## Checks

### EV-01 — Every stat in order
- Requirement: SCR-019, DEC-627.
- Method: playwright
- How: `c3-stats.spec.ts` after fixture `c3-stats-loss` (lost on skulls, active 42 min, 12 days, 1 quest done, 2 corruptions taken, 7 gold left).
- Pass evidence: in this order: outcome "Lost", time played "42 min", days 12, quests done 1, corruptions taken 2, gold left 7, key moments (contents wait on Q-C3-18), then the rating.
- Fails if: a stat is missing, out of order, or differs from the fixture.

### EV-02 — The rating never blocks Next
- Requirement: SCR-019.
- Method: playwright
- How: press Next with no rating.
- Pass evidence: the session screen.
- Fails if: Next disabled.

### EV-03 — Best and average
- Requirement: DEC-116.
- Method: unit
- How: three stored won games of this story with active lengths 40, 50 and 60 min, plus one lost game of 30 min; view the 50-min game.
- Pass evidence: best 40 min (shortest winning game, (Bob approved 2026-10-31)); average 45 min (mean of all four finished games: 40, 50, 60, 30); this game 50 min.
- Fails if: best is 30 (a loss) or 60, the average is wrong, or only this game shows.

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

### EV-07 — Drill-in Play again and Back
- Requirement: C2 07, SCR-021.
- Method: playwright
- How: from tonight's games open a finished game; press Back; open it again; press Play again.
- Pass evidence: Back returns to the session screen; Play again starts Pick setup for the same story with the same heroes.
- Fails if: either button is missing or goes elsewhere.

## Survival evals (one per survival invariant in plan.md)

### EV-08 — The rating is kept
- Requirement: SCR-019.
- Method: unit
- How: two iPads rate 4 and 2 (Q-C3-21 per iPad); restart the host; drill in.
- Pass evidence: both ratings are stored per iPad and shown as "4 · 2" (one value per iPad, in seat order).
- Fails if: a rating is lost, averaged into one, or only the last kept.

## Assumptions surfaced

- Each iPad gives its own rating (Q-C3-21, Bob approved 2026-10-31).

## OPEN questions

- ANSWERED Q-C3-18 (Bob approved 2026-10-31): key moments are quest done, item gained, building fallen, corruption taken, chapter won. (key moments)
- ANSWERED Q-C3-21 (Bob approved 2026-10-31): the fun rating is per iPad, shown per seat.
