Keep this a checklist; do not write a second design doc.

# Brief: C4 / 04-fight-in-play — Fight in events and scenes: foes, disasters, The Ambush, The Last Stand

## Meta

- Plan: [C4-battle-tomb.md](../../../C4-battle-tomb.md)
- Feature: 04-fight-in-play
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, DEC-023, DEC-028, DEC-647, DEC-662
- Evals: ./evals.md
- Screen spec: none (engine only; screens are in this cycle's screen features)
- Mockup: none (no screen change)
- Depends on: 02, 03, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/event/**`, `apps/bloodtower/src/engine/loops/scene/**` (battle option), `packs/test/**` (The Last Stand)
- Builds: DEC-023, DEC-028, DEC-647, AREA-097
- Deps change: no
- Runs: cloud

## What it does

Fight shows on every foes and disaster event and every plain-scene battle option, always enabled (Gamewright pick, pending Bob) (Q-C4-02). The disaster foe is level 4 (Gamewright pick, pending Bob) (Q-C4-03). The Ambush offers Fight or the toll, keeping the short-purse rule (Gamewright pick, pending Bob) (Q-C4-04). The Last Stand is a level-3 battle (Q-C3-11).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - An event left mid-choice resumes with the same options, Fight included.

## Done-when (e2e)

Contract is ./evals.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-08 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; the Tower finale and A1 art (C5).

## AREA / DEC checklist

- [ ] DEC-023: closed before coding (`decided`).
- [ ] DEC-028: closed before coding (`decided`).
- [ ] DEC-647: closed before coding (`decided`).
- [ ] DEC-662: closed before coding (`decided`).

## OPEN questions

- OPEN Q-C4-02: Where does Fight show once `fight_enabled` is on? Options: (a) on every foes and disaster event and on every plain-scene option that holds a battle, always enabled; (b) on foes events only; disasters stay Go around / Pay them off until C5. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-03: The disaster event's boss-level foe (DEC-028): what level in 1.0? Options: (a) level 4, one under The Warden's 5, as `events.disaster_foe_level` in base tuning; (b) level 5, The Warden's level. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-04: The Ambush with Fight on (DEC-662): keep the C3 short-purse toll rule (Q-C3-22)? Options: (a) keep it: Fight or pay the toll; a short group still pays all gold + 2 HP per present hero; (b) drop it: a short group must Fight. Gamewright pick: (a) (Gamewright pick, pending Bob).

## Eval approval

- See ./approval.md (must be filled before coding).
