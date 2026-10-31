Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 04-fight-in-play — Fight in events and scenes: foes, disasters, The Ambush, The Last Stand

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-08; survival evals last (EV-08).

## Checks

### EV-01 — Fight on a foes or disaster event starts the event's battle
- Requirement: DEC-023, DEC-028; the button itself is owned by C4 14.
- Method: unit
- How: draw a foes event (level-2 foe), pick `fight`; then a disaster, pick `fight`.
- Pass evidence: each starts MEC-038 with the event's foe (level 2; level 4); Go around and Pay them off still resolve as in C3.
- Fails if: no battle, the wrong foe, or Go around / Pay them off changed.

### EV-02 — Disaster foe level 4 (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)
- Requirement: DEC-028, Q-C4-03.
- Method: unit
- How: draw a disaster, Fight.
- Pass evidence: battle foe level 4.
- Fails if: other level.

### EV-03 — The Ambush: Fight or toll (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)
- Requirement: DEC-662, Q-C4-04.
- Method: sim
- How: short purse; pick toll.
- Pass evidence: purse 4, 3 present heroes at 10 HP: purse 0, each hero 8 HP, The Ambush done.
- Fails if: the toll is refused, a hero drops below 1 HP, or the quest stays open.

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

### EV-06 — A plain-scene battle option runs a battle
- Requirement: DEC-642, Q-C4-02 (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Method: unit
- How: a scene fixture whose option B holds a level-2 battle; pick B.
- Pass evidence: MEC-038 starts with a level-2 foe; on win the option's effect applies once.
- Fails if: no battle, or the effect applies before the battle is won.

### EV-07 — Fight is never disabled by the engine
- Requirement: Q-C4-02 (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Method: unit
- How: purse 0, every hero at 1 HP, a foes event.
- Pass evidence: the event's option list has `fight` with `enabled: true`.
- Fails if: `fight` missing or `enabled: false`.

## Survival evals (one per survival invariant in plan.md)

### EV-08 — Event choice survives Continue
- Requirement: DEC-675.
- Method: playwright
- How: quit at a foes event; Continue.
- Pass evidence: same three options.
- Fails if: redrawn.

## Assumptions surfaced

- Picks marked "(Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- Resolved Q-C4-02: Where does Fight show once `fight_enabled` is on? Options: (a) on every foes and disaster event and on every plain-scene option that holds a battle, always enabled; (b) on foes events only; disasters stay Go around / Pay them off until C5. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Resolved Q-C4-03: The disaster event's boss-level foe (DEC-028): what level in 1.0? Options: (a) level 4, one under The Warden's 5, as `events.disaster_foe_level` in base tuning; (b) level 5, The Warden's level. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Resolved Q-C4-04: The Ambush with Fight on (DEC-662): keep the C3 short-purse toll rule (Q-C3-22)? Options: (a) keep it: Fight or pay the toll; a short group still pays all gold + 2 HP per present hero; (b) drop it: a short group must Fight. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
