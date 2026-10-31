Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 12-event-scene — The event scene: the painting, the words and the choice

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Risk: Low.

## Checks

### EV-01 — Hazard: two costs on the iPad
- Requirement: DEC-027, UI-041.
- Method: playwright
- How: `c3-event.spec.ts` with a seed that draws a hazard.
- Pass evidence: board: the painting and a Scroll; iPad: two cost buttons; after pressing the hit-point cost the board shows the cost line `−2 hit points each` and each present hero's hit points drop by 2 on the hero panel.
- Fails if: the cost is applied with no choice.

### EV-02 — Foes: Go around and Pay them off, no Fight
- Requirement: DEC-023.
- Method: playwright
- How: seed that draws foes.
- Pass evidence: two choices, Go around and Pay them off; no Fight button, enabled or disabled (Q-C3-02); Pay them off shows its cost from `events.pay_off` = 5 gold (Gamewright proposal, pending Bob) and is disabled at purse 4, enabled at purse 5.
- Fails if: Go around missing, a Fight button shows, or Pay them off is enabled below 5 gold.

### EV-03 — Only present heroes' iPads choose
- Requirement: DEC-019, MEC-003.
- Method: playwright
- How: 2 groups; group B in the wild.
- Pass evidence: group B's iPads show the choice; group A's show the waiting line.
- Fails if: an absent hero can press.

### EV-04 — Quiet shows a mood line only
- Requirement: MEC-072 .2.
- Method: playwright
- How: seed for quiet.
- Pass evidence: a Scroll and Next; no cost.
- Fails if: a cost dialog shows.

### EV-05 — Screenshots match
- Requirement: UI-041.
- Method: screenshot
- How: board and iPad at the hazard and foes states; compare with ./mockup.html `#hazard`, `#foes`.
- Pass evidence: four images matching.
- Fails if: a part out of order.

### EV-06 — Windfall shows a Reveal
- Requirement: UI-036, DEC-029.
- Method: playwright
- How: seed for windfall, 2-hero group.
- Pass evidence: the board shows a Reveal with "+5 gold"; purse +5 on the edge band; iPad shows Next only.
- Fails if: no Reveal, or the amount differs.

### EV-07 — The counter saved them
- Requirement: DEC-027.
- Method: playwright
- How: seed for plague with a present Healer.
- Pass evidence: the board shows the saved state `[COPY: counter saved]`; no cost buttons on the iPad, only Next; no hit points change.
- Fails if: cost buttons show or a cost applies.

### EV-08 — Disaster: Go around and Pay them off, no Fight
- Requirement: DEC-028, Q-C3-02.
- Method: playwright
- How: seed that draws a disaster.
- Pass evidence: exactly two choices, Go around and Pay them off; no Fight, enabled or disabled.
- Fails if: Fight shows, or either choice is missing.

### EV-09 — Two iPads press different choices: first wins
- Requirement: DEC-019.
- Method: playwright
- How: 2 present heroes on two iPads at a hazard; press cost 1 on iPad A then cost 2 on iPad B within 200 ms.
- Pass evidence: cost 1 is applied once; iPad B's press changes nothing; both iPads move on to the same next step.
- Fails if: both costs apply, or cost 2 wins.

## Survival evals (one per survival invariant in plan.md)

### EV-10 — Continue keeps the open event
- Requirement: DEC-675.
- Method: playwright
- How: quit at a hazard's choice; Continue.
- Pass evidence: the same painting and two costs.
- Fails if: a new event.

## Assumptions surfaced

- None beyond the cards cited.

## OPEN questions

- ANSWERED Q-C3-02 (Bob, 2026-10-31 10:09 AM ET): hide Fight until C4.
- ANSWERED Q-C3-03 (Bob approved 2026-10-31): in 1.0 people events offer rumour and trick only; the people weight stays 10. (people offers in 1.0)
