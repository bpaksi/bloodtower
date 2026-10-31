Keep this a checklist; do not write a second design doc.

# Brief: C4 / 13-seal-break-live — The seal break live on the board, chapters 1 and 2

## Meta

- Plan: [C4-battle-tomb.md](../../../C4-battle-tomb.md)
- Feature: 13-seal-break-live
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, UI-044, DEC-303
- Evals: ./evals.md
- Screen spec: ./screen-spec.md
- Mockup: none yet; Illusionist draws ./mockup.html from ./screen-spec.md before Bob approves the evals
- Depends on: 07, C3 15, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/SealBreak.tsx`, `apps/bloodtower/src/web/components/device/SkullPlacer.tsx`
- Builds: UI-044
- Deps change: no
- Runs: cloud

## What it does

C3 built UI-044's seal step behind the switch; C4 turns it on. The close Scroll, the lit seal, the glyph and boon on a Reveal with the Loremaster's seal line (Gamewright pick, pending Bob) (Q-C4-10), then the freed-skull prompts on the iPad (kingdom, then building). The C3 "Done" confirm becomes the real pick: the iPad confirms which seal broke on the tower.

## Cutover

Cutover: N

- Nothing dies or is renamed beyond the tuning switches named above.

## Survival invariants

- Continue, restore, and restart must keep:
  - A half-placed set of freed skulls resumes at the next skull.
  - After a restart and Continue, the Menu and any gear panel come back closed.
  - A beat interrupted by restart shows again or the next one shows, its effect applied once.

## Done-when (e2e)

Contract is ./evals.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-13 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; the Tower finale and A1 art (C5).

## AREA / DEC checklist

- [ ] UI-044: closed before coding (`decided`).
- [ ] DEC-303: closed before coding (`decided`).

## OPEN questions

- OPEN Q-C4-17: Does the C2-04 auto-advance rule (advance when narration or cue ends, or after 4 s with no audio) also apply to battle round results and Reveals? Options: (a) yes, every beat in C4 and C5 (round results, victory, reward/retreat/fall, trap, close Scroll, glyph/boon Reveal, boss phase show, win line) follows it; (b) battle beats wait for a press on any iPad; (c) round results hold 2 s, other beats follow the rule. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C4 09, 11, 12, 13; C5 08, 09)

- OPEN Q-C4-10 **[Bob taste call]**: Who speaks the seal-break line at each chapter win? Options: (a) the Loremaster, one line per chapter: `[COPY: seal break ch1, Loremaster = "The roads are clear and a seal breaks. Ahead stands the Ruined Keep."]`, `[COPY: seal break ch2, Loremaster = "The Keep gives up its dead, and a second seal cracks. The Tower waits."]`, `[COPY: seal break ch3, Loremaster = "The last stand holds, and the third seal breaks. Only the Warden remains."]`; (b) the Narrator, one shared line `[COPY: seal break, Narrator]`. Gamewright pick: (a) (Gamewright pick, pending Bob).

## Eval approval

- See ./approval.md (must be filled before coding).

> Note (Q-C4-10): the docs use pick (a), the Loremaster per chapter. If Bob picks (b), the Narrator line kept for it is: "A seal breaks. The tower shudders."
