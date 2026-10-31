Keep this a checklist; do not write a second design doc.

# Brief: C4 / 01-tuning-switches — The C4 switches: Fight on, all chapters on, the C4 end rule

## Meta

- Plan: [C4-battle-tomb.md](../../../C4-battle-tomb.md)
- Feature: 01-tuning-switches
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, DEC-500, DEC-133, DEC-662, DEC-144
- Evals: ./evals.md
- Screen spec: ./screen-spec.md
- Mockup: none (no screen change)
- Depends on: C3 02, C3 09, C3 10, and its `approval.md` on `main`
- Touches: `packs/base/tuning.yaml`, `apps/bloodtower/src/protocols/pack-v2/base.ts` (tuning schema), `apps/bloodtower/src/engine/loops/{chapter,game}/**` (switch reads only)
- Builds: DEC-500, DEC-133
- Deps change: no
- Runs: cloud

## What it does

Turns C3's switches: `fight_enabled: true`, `c3_end_after_chapter_1: false`. Adds `c4_end_after_chapter_3: true`: the game ends won when chapter 3 is won (Gamewright pick, pending Bob), Q-C4-01. C5 feature 04 turns it off.

## Cutover

Cutover: N

- Nothing dies or is renamed beyond the tuning switches named above.

## Survival invariants

- Continue, restore, and restart must keep:
  - A game saved under C3 switches is not resumed under C4 switches; tuning stays fixed at Begin (C3 B2).

## Done-when (e2e)

Contract is ./evals.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-05 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; the Tower finale and A1 art (C5).

## AREA / DEC checklist

- [ ] DEC-500: closed before coding (`decided`).
- [ ] DEC-133: closed before coding (`decided`).
- [ ] DEC-662: closed before coding (`decided`).
- [ ] DEC-144: closed before coding (`decided`).

## OPEN questions

- OPEN Q-C4-01: What ends a C4 game won, before the C5 finale exists? Options: (a) chapter 3 won (The Lock and The Last Stand done) ends the game won, behind tuning switch `c4_end_after_chapter_3` (on in C4, off in C5), with the DEC-144 win scene and `[COPY: chapter 3 win, Loremaster = "The last seal of the lowlands is broken. Vellmoor sleeps easier tonight. The Count does not."]`; (b) chapter 3 has no end: the game plays until it is lost, and the win is tested only by fixture until C5. Gamewright pick: (a) (Gamewright pick, pending Bob).

## Eval approval

- See ./approval.md (must be filled before coding).
