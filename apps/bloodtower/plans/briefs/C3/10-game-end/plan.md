Keep this a checklist; do not write a second design doc.

# Brief: C3 / 10-game-end — The game ends: won or lost, the record and the stats

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 10-game-end
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-099, MEC-032, MEC-039
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no screen change)
- Risk: High
- Depends on: C3 feature 09 merged, C2 feature 08 merged, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/game/**` (body .41, .42, close .43, end .44 to .49), `apps/bloodtower/src/server/events/**` (stats read-out, tap and length counts), `apps/bloodtower/src/engine/loops/game/*.test.ts` (new, per the C2 audit), `apps/bloodtower/src/engine/loops/session/**` (tonight's games row, Continue reopens the quit record), `apps/bloodtower/src/server/core/**` (the quit write); Touches amended 2026-11-16 by the coordinator under Bob's standing delegation (Bob to review in the PR): `packs/base/tuning.yaml` (repo root; a read-only `game_length_targets` block with `short` and `standard`, no `long`, EV-20), `apps/bloodtower/src/protocols/pack-v2/base.ts` (`tuningSchema` accepts the two targets and rejects a Long one), `apps/bloodtower/src/server/pack/tuning.test.ts` (fixture and cases for a missing target and an extra `long` key), `apps/bloodtower/src/e2e/tests/c3-game-end.spec.ts` (new, EV-06 at three viewports), and `apps/bloodtower/src/e2e/tests/support/acceptance.ts` only if the existing `allowTestSeed` cannot finish a game. The step ships as two PRs: 06a (engine and log: EV-01, 02, 03, 07 to 14, 18, 19, 21) and 06b (stats projection, best key, tonight's games row, tuning targets: EV-05, 06, 15 to 17, 20).
- Builds: MEC-032, DEC-116, DEC-117, DEC-144, DEC-627, DEC-676
- Deps change: no
- Runs: cloud
- Amended 2026-11-14 for PT-02, PT-03, PT-04, PT-10 (step 44): added EV-10 to EV-21 and edited EV-02 in place ("anywhere on the board"; marked Amended 2026-11-14 (PT-02)). Rulings adopted by Bob 2026-11-14 are applied to EV-12, EV-17, EV-18 and EV-20. Touches gains the session and server core files the quit record and Continue use. Needs Bob's new approval row.

## What it does

MEC-032's body runs one chapter per pass (DEC-133) and exits on won (in C3, chapter 1 won, Q-C3-01; from C5, the finale) or lost (any chapter, or a third corruption at once). The close writes the game's record (DEC-116, DEC-117); the end plays the outcome scene data and the stats from stored stats (DEC-627, SCR-019). The result goes up to the session (MEC-039), where C2's tonight's games list shows it as won or lost instead of quit. Gives `engine/loops/game` its own tests (C2 audit).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - A finished game clears the autosave: Continue is not offered for a game that has ended (DEC-208, DEC-709).
  - The game's record and stats survive a host restart; tonight's games lists it with its outcome.
  - One record per game id: a quit then Continue then a win leaves one record, the win, across a host restart (EV-21).

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-21 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [ ] MEC-032: closed before coding (`decided`).
- [ ] MEC-039: closed before coding (`decided`).
- [ ] DEC-116: closed before coding (`decided`).
- [ ] DEC-117: closed before coding (`decided`).
- [ ] DEC-133: closed before coding (`decided`).
- [ ] DEC-142: closed before coding (`decided`).
- [ ] DEC-144: closed before coding (`decided`).
- [ ] DEC-627: closed before coding (`decided`).
- [ ] DEC-676: closed before coding (`decided`).
- [ ] DEC-208: closed before coding (`decided`).
- [ ] DEC-214: closed before coding (`decided`).
- [ ] PT-02 ruling recorded as a DEC by step 43 (#469); closed before coding.
- [ ] PT-03 ruling recorded as a DEC by step 43 (#469); closed before coding.
- [ ] PT-04 ruling recorded as a DEC by step 43 (#469); closed before coding.
- [ ] PT-10 ruling recorded as a DEC by step 43 (#469); closed before coding.

## OPEN questions

- ANSWERED Q-C3-01 (Bob, 2026-10-31 10:09 AM ET): clearing chapter 1 counts as the C3 win.
- ANSWERED Q-C3-23 (Bob approved 2026-10-31): the DEC-144 win scene plays, then the Loremaster line `[COPY: chapter 1 win, Loremaster]`. Was: which win scene and line play for the C3 win? DEC-663 and DEC-664 write the win for the finale, after the last choice, which C3 never reaches. Use a placeholder `[COPY: chapter 1 win]`, or the finale's win scene without the line?
- ANSWERED Q-C3-18 (Bob approved 2026-10-31): key moments are quest done, item gained, building fallen, corruption taken, chapter won. Was: "key moments" on the stats screen (SCR-019): which events count as one? No card lists them.

## Eval approval

- See ./approval.md (must be filled before coding).
