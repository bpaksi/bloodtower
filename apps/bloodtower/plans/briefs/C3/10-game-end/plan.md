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
- Touches: `apps/bloodtower/src/engine/loops/game/**` (body .41, .42, close .43, end .44 to .49), `apps/bloodtower/src/server/events/**` (stats read-out), `apps/bloodtower/src/engine/loops/game/*.test.ts` (new, per the C2 audit)
- Builds: MEC-032, DEC-116, DEC-117, DEC-144, DEC-627, DEC-676
- Deps change: no
- Runs: cloud

## What it does

MEC-032's body runs one chapter per pass (DEC-133) and exits on won (in C3, chapter 1 won, Q-C3-01; from C5, the finale) or lost (any chapter, or a third corruption at once). The close writes the game's record (DEC-116, DEC-117); the end plays the outcome scene data and the stats from stored stats (DEC-627, SCR-019). The result goes up to the session (MEC-039), where C2's tonight's games list shows it as won or lost instead of quit. Gives `engine/loops/game` its own tests (C2 audit).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - A finished game clears the autosave: Continue is not offered for a game that has ended (DEC-208, DEC-709).
  - The game's record and stats survive a host restart; tonight's games lists it with its outcome.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-09 all pass (verifier table on PR).
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

## OPEN questions

- ANSWERED Q-C3-01 (Bob, 2026-10-31 10:09 AM ET): clearing chapter 1 counts as the C3 win.
- Q-C3-23: which win scene and line play for the C3 win? DEC-663 and DEC-664 write the win for the finale, after the last choice, which C3 never reaches. Use a placeholder `[COPY: chapter 1 win]`, or the finale's win scene without the line?
- Q-C3-18: "key moments" on the stats screen (SCR-019): which events count as one? No card lists them.

## Eval approval

- See ./approval.md (must be filled before coding).
