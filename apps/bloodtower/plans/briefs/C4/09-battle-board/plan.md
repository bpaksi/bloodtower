Keep this a checklist; do not write a second design doc.

# Brief: C4 / 09-battle-board — The battle on the board: horn, foe panel, round results

## Meta

- Plan: [C4-battle-tomb.md](../../../C4-battle-tomb.md)
- Feature: 09-battle-board
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, UI-026, CUE-010, UI-030, UI-036, DEC-466
- Evals: ./evals.md
- Screen spec: ./screen-spec.md
- Mockup: none yet; Illusionist draws ./mockup.html from ./screen-spec.md before Bob approves the evals
- Depends on: 02, 05, C3 11, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/Battle*.tsx` (new), `apps/bloodtower/src/web/components/board/FoePanel.tsx` (new), `apps/bloodtower/src/e2e/tests/c4-battle.spec.ts`
- Builds: UI-026, CUE-010
- Deps change: no
- Runs: cloud

## What it does

UI-026 on the board: the foe painting (one placeholder per level (Gamewright pick, pending Bob), Q-C4-15), traits, strength left, the present heroes; each round's result; the horn, hit and victory cues (CUE-010), on the board speakers when no tower (Gamewright pick, pending Bob) (Q-C4-14). A Cursed hero's panel shows "4 of N count" (Gamewright pick, pending Bob) (Q-C4-05).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - After Continue mid-battle the board redraws the same foe, wounds and heroes.
  - After a restart and Continue, the Menu and any gear panel come back closed.
  - A beat interrupted by restart shows again or the next one shows, its effect applied once.

## Done-when (e2e)

Contract is ./evals.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-14 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; the Tower finale and A1 art (C5).

## AREA / DEC checklist

- [ ] UI-026: closed before coding (`decided`).
- [ ] CUE-010: closed before coding (`decided`).
- [ ] UI-030: closed before coding (`decided`).
- [ ] UI-036: closed before coding (`decided`).
- [ ] DEC-466: closed before coding (`decided`).

## OPEN questions

- OPEN Q-C4-17: Does the C2-04 auto-advance rule (advance when narration or cue ends, or after 4 s with no audio) also apply to battle round results and Reveals? Options: (a) yes, every beat in C4 and C5 (round results, victory, reward/retreat/fall, trap, close Scroll, glyph/boon Reveal, boss phase show, win line) follows it; (b) battle beats wait for a press on any iPad; (c) round results hold 2 s, other beats follow the rule. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C4 09, 11, 12, 13; C5 08, 09)

- OPEN Q-C4-14: The battle horn and hits (CUE-010) with no tower connected: Options: (a) play them through the Story board's speakers; (b) silent; the board shows the hit only. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-15 **[Bob taste call]**: Foe paintings in C4, before the A1 art run (C5): Options: (a) one placeholder painting per foe level, swapped by A1 in C5; (b) A1 draft art now, as the art lands. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-05: Cursed (DEC-466): does the board show which 4 Advantages counted? Options: (a) yes: the hero panel shows "4 of N count" and dims the rest during the round; (b) no: the app picks silently; only the round result shows. Gamewright pick: (a) (Gamewright pick, pending Bob).

## Eval approval

- See ./approval.md (must be filled before coding).
