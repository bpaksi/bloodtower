Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 04-fight-in-play — Fight in events and scenes: foes, disasters, The Ambush, The Last Stand

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-06; the survival eval is last (EV-06).

## Checks

### EV-01 — Foes events offer three choices
- Requirement: DEC-023.
- Method: unit
- How: draw a foes event.
- Pass evidence: Fight, Go around, Pay them off.
- Fails if: Fight missing.

### EV-02 — Disaster foe level 4 (Gamewright pick, pending Bob)
- Requirement: DEC-028, Q-C4-03.
- Method: unit
- How: draw a disaster, Fight.
- Pass evidence: battle foe level 4.
- Fails if: other level.

### EV-03 — The Ambush: Fight or toll (Gamewright pick, pending Bob)
- Requirement: DEC-662, Q-C4-04.
- Method: sim
- How: short purse; pick toll.
- Pass evidence: toll rule applies; quest done.
- Fails if: toll refused.

### EV-04 — The Ambush won by Fight
- Requirement: DEC-662.
- Method: sim
- How: pick Fight, win.
- Pass evidence: quest done, reward given.
- Fails if: not done.

### EV-05 — The Last Stand is a level-3 battle
- Requirement: Q-C3-11.
- Method: sim
- How: reach The Last Stand.
- Pass evidence: level-3 battle starts.
- Fails if: plain scene only.

## Survival evals (one per survival invariant in plan.md)

### EV-06 — Event choice survives Continue
- Requirement: DEC-675.
- Method: playwright
- How: quit at a foes event; Continue.
- Pass evidence: same three options.
- Fails if: redrawn.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C4-02: Where does Fight show once `fight_enabled` is on? Options: (a) on every foes and disaster event and on every plain-scene option that holds a battle, always enabled; (b) on foes events only; disasters stay Go around / Pay them off until C5. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-03: The disaster event's boss-level foe (DEC-028): what level in 1.0? Options: (a) level 4, one under The Warden's 5, as `events.disaster_foe_level` in base tuning; (b) level 5, The Warden's level. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-04: The Ambush with Fight on (DEC-662): keep the C3 short-purse toll rule (Q-C3-22)? Options: (a) keep it: Fight or pay the toll; a short group still pays all gold + 2 HP per present hero; (b) drop it: a short group must Fight. Gamewright pick: (a) (Gamewright pick, pending Bob).
