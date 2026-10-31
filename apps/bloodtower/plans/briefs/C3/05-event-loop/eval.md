Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 05-event-loop — Events in the wild: the seeded draw and its six tracks

- Brief: ./plan.md
- Mockup: none
- Risk: Med.

## Checks

### EV-01 — Only groups in the wild or at a skulled building draw
- Requirement: DEC-017, DEC-080, DEC-093.
- Method: unit
- How: `event.test.ts`: three groups end at a clean building, a wild space and a 1-skull building.
- Pass evidence: the clean-building group never draws; the other two roll at the length's chance.
- Fails if: the clean-building group draws.

### EV-02 — The draw is seeded and weighted
- Requirement: DEC-022 weights, DEC-669 chances.
- Method: unit
- How: 10,000 seeded draws at Standard.
- Pass evidence: about 40% fire; types near 30/15/20/20/5/10; the same seed gives the same sequence.
- Fails if: weights or chance off by more than 2 points, or unseeded.

### EV-03 — Hazard: the group picks one of two costs
- Requirement: DEC-027.
- Method: unit
- How: hazard with no counter held.
- Pass evidence: two cost options; the picked one is paid (e.g. −2 hit points to each present hero, DEC-703); a held counter cancels it instead.
- Fails if: the cost is applied without a choice.

### EV-04 — Go around never fells
- Requirement: Go around −2 hit points, never below 1 (DEC-018, MEC-013).
- Method: unit
- How: foes event; a hero at 2; pick Go around.
- Pass evidence: that hero ends at 1, not 0.
- Fails if: a hero falls from Go around.

### EV-05 — Windfall splits across the present heroes
- Requirement: 5 gold, split (DEC-029, DEC-178).
- Method: unit
- How: windfall for a 2-hero group.
- Pass evidence: each hero's share +2 or +3 per DEC-178's split; the pooled purse +5.
- Fails if: only one hero's share grows.

### EV-06 — No event can lose the game by itself
- Requirement: MEC-013.
- Method: unit
- How: sim 5,000 seeded event draws on a party at 1 hit point.
- Pass evidence: no draw sets lost.
- Fails if: any draw loses.

## Survival evals (one per survival invariant in plan.md)

### EV-07 — Continue resumes an open event
- Requirement: DEC-675.
- Method: unit
- How: autosave at .15 (the foes choice); Continue.
- Pass evidence: the same event card and choices; no new draw.
- Fails if: the event is redrawn.

## Assumptions surfaced

- A people event in 1.0 resolves without the talk and buy picks' NPC content (DEC-502). Bob: ? (OPEN Q-C3-03)

## OPEN questions

- Q-C3-02: a foes or disaster event's Fight calls the battle loop (MEC-038), which is C4. In C3, is Fight hidden, auto-resolved, or is C4's battle pulled into C3?
- Q-C3-03: DEC-502 cuts NPCs and shops from 1.0, but the people track draws trade, rumour, companion or trick (DEC-024). Which offers are in 1.0? Does the people weight (10) move to another type?
- Q-C3-12: does the disaster event's boss-level foe (DEC-028) need a C3 placeholder, as P-003 day 11 met one?
