Keep this a checklist; do not write a second design doc.

# Brief: C4 / 07-chapters-and-seals — Chapters 2 and 3 in play, the seal break and the seal lines

## Meta

- Plan: [C4-battle-tomb.md](../../../C4-battle-tomb.md)
- Feature: 07-chapters-and-seals
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, MEC-033, DEC-303, DEC-306, DEC-409, DEC-662, Q-C3-17
- Evals: ./evals.md
- Screen spec: none (engine only; screens are in this cycle's screen features)
- Mockup: none (no screen change)
- Depends on: 01, 06, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/chapter/close.ts`, `packs/test/**` (chapter 2 and 3 cards, seal lines)
- Builds: DEC-303, DEC-306, DEC-409, AREA-097
- Deps change: no
- Runs: cloud

## What it does

Chapters 2 (The Keep: The Barrow, The Shrine) and 3 (The Tower: The Lock, The Last Stand) play. Each chapter win breaks one seal (tower only): the glyph and its boon from the base pack (Q-C3-17), then the freed skulls. Each break plays a Loremaster line per chapter (Gamewright pick, pending Bob) (Q-C4-10): `[COPY: seal break ch1, Loremaster = "The roads are clear and a seal breaks. Ahead stands the Ruined Keep."]`, `[COPY: seal break ch2, Loremaster = "The Keep gives up its dead, and a second seal cracks. The Tower waits."]`, `[COPY: seal break ch3, Loremaster = "The last stand holds, and the third seal breaks. Only the Warden remains."]`.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - A chapter won but not yet closed resumes at its seal break, not past it.

## Done-when (e2e)

Contract is ./evals.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-08 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; the Tower finale and A1 art (C5).

## AREA / DEC checklist

- [ ] MEC-033: closed before coding (`decided`).
- [ ] DEC-303: closed before coding (`decided`).
- [ ] DEC-306: closed before coding (`decided`).
- [ ] DEC-409: closed before coding (`decided`).
- [ ] DEC-662: closed before coding (`decided`).
- [ ] Q-C3-17: closed before coding (`decided`).

## OPEN questions

- OPEN Q-C4-10 **[Bob taste call]**: Who speaks the seal-break line at each chapter win? Options: (a) the Loremaster, one line per chapter: `[COPY: seal break ch1, Loremaster = "The roads are clear and a seal breaks. Ahead stands the Ruined Keep."]`, `[COPY: seal break ch2, Loremaster = "The Keep gives up its dead, and a second seal cracks. The Tower waits."]`, `[COPY: seal break ch3, Loremaster = "The last stand holds, and the third seal breaks. Only the Warden remains."]`; (b) the Narrator, one shared line `[COPY: seal break, Narrator]`. Gamewright pick: (a) (Gamewright pick, pending Bob).

## Eval approval

- See ./approval.md (must be filled before coding).

> Note (Q-C4-10): the docs use pick (a), the Loremaster per chapter. If Bob picks (b), the Narrator line kept for it is: "A seal breaks. The tower shudders."
