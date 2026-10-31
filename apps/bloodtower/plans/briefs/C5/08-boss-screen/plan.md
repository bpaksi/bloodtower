Keep this a checklist; do not write a second design doc.

# Brief: C5 / 08-boss-screen — The Warden on screen: phases and the tower show

## Meta

- Plan: [C5-finale-polish.md](../../../C5-finale-polish.md)
- Feature: 08-boss-screen
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, DEC-567, DEC-327, UI-026
- Evals: ./evals.md
- Screen spec: ./screen-spec.md
- Mockup: none yet; Illusionist draws ./mockup.html from ./screen-spec.md before Bob approves the evals
- Depends on: 02, C4 09, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/BossPhase.tsx` (new)
- Builds: DEC-567, DEC-327
- Deps change: no
- Runs: cloud

## What it does

The foe panel for The Warden with a phase change: new painting (Gamewright pick, pending Bob) (Q-C5-02) and a full tower show; with no tower, a board-only show (Gamewright pick, pending Bob) (Q-C5-08).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - The phase painting is redrawn after Continue.
  - After a restart and Continue, the Menu and any gear panel come back closed.
  - A beat interrupted by restart shows again or the next one shows, its effect applied once.

## Done-when (e2e)

Contract is ./evals.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-15 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; 1.1 work (DEC-502).

## AREA / DEC checklist

- [ ] DEC-567: closed before coding (`decided`).
- [ ] DEC-327: closed before coding (`decided`).
- [ ] UI-026: closed before coding (`decided`).

## OPEN questions

- Q-C4-17 (auto-advance timing, Gamewright pick (a), pending Bob) applies to this screen; see C4 plan.

- OPEN Q-C5-02 **[Bob taste call]**: The Warden's three phases (DEC-567): three paintings or one? Options: (a) three paintings, one per phase; (b) one painting, darkening at each phase. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C5-08: The boss's full tower show (DEC-567, DEC-327) with no tower connected: Options: (a) a board-only show: the painting change, a shake and the sound on the board speakers; (b) skip the show. Gamewright pick: (a) (Gamewright pick, pending Bob).

## Eval approval

- See ./approval.md (must be filled before coding).
