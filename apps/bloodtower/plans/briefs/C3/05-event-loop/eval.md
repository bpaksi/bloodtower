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
- How: 10,000 seeded draws at Standard, and 10,000 at Short.
- Pass evidence: Standard 40% ±2 fire; Short 30% ±2 fire; types near 30/15/20/20/5/10; the same seed gives the same sequence.
- Fails if: weights or chance off by more than 2 points, or unseeded.

### EV-03 — Hazard: the group picks one of two costs
- Requirement: DEC-027.
- Method: unit
- How: two cases with a fixed hazard seed (plague). (a) No present hero holds the counter: pick the hit-point cost. (b) A present Healer holds the counter (DEC-027, DEC-100).
- Pass evidence: (a) exactly two cost options; after the pick each present hero has −2 hit points (DEC-703), nothing else changes. (b) no cost options are offered, no hit points or gold change, the event logs `cancelled by counter`; the counter is a class, so it is not consumed and the Healer still counters the next plague.
- Fails if: (a) a cost is applied without a choice; (b) any cost is applied, a choice is offered, or the counter is removed.

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

### EV-07 — Fight is hidden until C4
- Requirement: Q-C3-02 (Bob, 2026-10-31): hide Fight until C4.
- Method: unit
- How: seeds that draw foes and disaster; read the offered choices; then set `fight_enabled: true` in a test tuning file.
- Pass evidence: C3 tuning: only Go around and Pay them off are offered, and the battle loop is never entered. Switch on: Fight is offered too.
- Fails if: Fight is offered, shown disabled, or auto-resolved in C3, or the battle loop is called.

### EV-08 — Pay them off costs `events.pay_off`
- Requirement: DEC-023; tuning key `events.pay_off` = 5 gold (Bob approved 2026-10-31).
- Method: unit
- How: a foes event with purse 12, then with purse 4.
- Pass evidence: purse 12: Pay them off takes 5 gold (purse 7) and ends the event; Go around takes no gold. Purse 4: Pay them off is disabled; Go around still works.
- Fails if: a different amount, the amount is hardcoded rather than read from tuning, or Pay them off works below 5 gold.

## Survival evals (one per survival invariant in plan.md)

### EV-09 — Continue resumes an open event
- Requirement: DEC-675.
- Method: unit
- How: autosave at .15 (the foes choice); Continue.
- Pass evidence: the same event card and choices; no new draw.
- Fails if: the event is redrawn.

## Assumptions surfaced

- A people event in 1.0 resolves without the talk and buy picks' NPC content (DEC-502). Bob: ? (Q-C3-03, answered)

## OPEN questions

- ANSWERED Q-C3-02 (Bob, 2026-10-31 10:09 AM ET): hide Fight until C4.
- ANSWERED Q-C3-03 (Bob approved 2026-10-31): in 1.0 people events offer rumour and trick only; the people weight stays 10. Was: DEC-502 cuts NPCs and shops from 1.0, but the people track draws trade, rumour, companion or trick (DEC-024). Which offers are in 1.0? Does the people weight (10) move to another type?
- ANSWERED Q-C3-12 (Bob approved 2026-10-31): no placeholder; Fight is hidden, so the disaster offers Go around and Pay them off only. Was: does the disaster event's boss-level foe (DEC-028) need a C3 placeholder, as P-003 day 11 met one?
