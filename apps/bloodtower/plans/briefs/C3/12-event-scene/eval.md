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
- Pass evidence: board: the painting and a Scroll; iPad: two cost buttons; after a press the effect line shows.
- Fails if: the cost is applied with no choice.

### EV-02 — Foes: Go around and Pay them off, no Fight
- Requirement: DEC-023.
- Method: playwright
- How: seed that draws foes.
- Pass evidence: two choices, Go around and Pay them off; no Fight button, enabled or disabled (Q-C3-02); Pay them off disabled when the purse is short.
- Fails if: Go around missing.

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

## Survival evals (one per survival invariant in plan.md)

### EV-06 — Continue keeps the open event
- Requirement: DEC-675.
- Method: playwright
- How: quit at a hazard's choice; Continue.
- Pass evidence: the same painting and two costs.
- Fails if: a new event.

## Assumptions surfaced

- None beyond the cards cited.

## OPEN questions

- ANSWERED Q-C3-02 (Bob, 2026-10-31 10:09 AM ET): hide Fight until C4.
- Q-C3-03 (people offers in 1.0)
