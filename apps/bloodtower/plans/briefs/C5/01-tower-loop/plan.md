Keep this a checklist; do not write a second design doc.

# Brief: C5 / 01-tower-loop — The Tower: three levels, dealt rooms, stair guards, retreat keeps progress

## Meta

- Plan: [C5-finale-polish.md](../../../C5-finale-polish.md)
- Feature: 01-tower-loop
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, MEC-076, DEC-356, DEC-358, DEC-360, DEC-363, DEC-364, DEC-540, DEC-566, DEC-645, DEC-657, DEC-658, DEC-702
- Evals: ./evals.md
- Screen spec: none (engine only; screens are in this cycle's screen features)
- Mockup: none (no screen change)
- Depends on: C4 02, C4 03, C4 06, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/tower/**` (new level), `packs/test/**` (the Tower unlock)
- Builds: MEC-076, DEC-566, DEC-363, DEC-360, DEC-356, DEC-645, DEC-702
- Deps change: no
- Runs: cloud

## What it does

MEC-076: unlocked once the Last Stand is done (DEC-645), entered from a Tower-adjacent space for 1 move. Three levels of three rooms (guard, trap or shrine, then the stair guard), dealt from the seed on first visit and kept (Gamewright pick, pending Bob) (Q-C5-11); the adversary at the top. A retreat costs as a battle retreat (Gamewright pick, pending Bob) (Q-C5-04) and keeps every cleared room.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - Cleared rooms, the level reached and the adversary's wounds are kept across Continue and visits (DEC-360).

## Done-when (e2e)

Contract is ./evals.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-07 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; 1.1 work (DEC-502).

## AREA / DEC checklist

- [ ] MEC-076: closed before coding (`decided`).
- [ ] DEC-356: closed before coding (`decided`).
- [ ] DEC-358: closed before coding (`decided`).
- [ ] DEC-360: closed before coding (`decided`).
- [ ] DEC-363: closed before coding (`decided`).
- [ ] DEC-364: closed before coding (`decided`).
- [ ] DEC-540: closed before coding (`decided`).
- [ ] DEC-566: closed before coding (`decided`).
- [ ] DEC-645: closed before coding (`decided`).
- [ ] DEC-657: closed before coding (`decided`).
- [ ] DEC-658: closed before coding (`decided`).
- [ ] DEC-702: closed before coding (`decided`).

## Values (filled from cards)

- Tower: 3 levels (basement, main, tower) of 3 rooms; rooms 1–2 guard, trap or shrine, 1 in 3 each; room 3 the stair guard; The Warden in the tower level's last room (DEC-566).
- Guard level: the adversary's level − 2 (level 3 under The Warden) (DEC-702).
- Trap −2 HP each hero; shrine +2 HP each hero, once (DEC-566, DEC-703).

## OPEN questions

- OPEN Q-C5-11: The Tower's guards and traps (DEC-566, DEC-702): fixed or dealt? Options: (a) dealt fresh on the first visit from the seed, then kept; (b) fixed by the story pack. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C5-04: The Tower's retreat (DEC-360): what does it cost? Options: (a) the same as a battle retreat (C4 feature 03); the rooms stay cleared; (b) nothing beyond the moves spent. Gamewright pick: (a) (Gamewright pick, pending Bob).

## Eval approval

- See ./approval.md (must be filled before coding).
