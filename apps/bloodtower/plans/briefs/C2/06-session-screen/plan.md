Keep this a checklist; do not write a second design doc.

# Brief: C2 / 06-session-screen — The session screen and Done for tonight

## Meta

- Plan: C2 ([plan](../../../C2-session-shell.md), feature 06). AREA-100 scenes 4, 6, 7a and the between-games half of 7b.
- Feature: 06-session-screen
- Owner: Claude (brief). A Wright developer builds it.
- Related AREA/docs: SCR-021, MEC-039 body and close (.26 to .32), DEC-214, DEC-218, DEC-283, DEC-629, DEC-628, DEC-709, DEC-711, DEC-712, DEC-713, DEC-230, CUE-012, SCR-002; audit: Goodbye components are for a parked screen, `server/core/goodbyeIdle`
- Evals: ./eval.md
- Mockup: ./mockup.html
- Risk: High (session state, autosave, tower)
- Touches: as feature 05, plus `apps/bloodtower/src/web/components/GoodbyeTeardown.tsx` and `apps/bloodtower/src/web/lib/goodbye.ts` (deleted), `apps/bloodtower/src/server/core/goodbyeIdle*.ts`
- Size: may pass 400 lines; the same review split as feature 05 applies.

## Cutover

Cutover: Y

- Pick Game goes. Continue moves to the session screen and stays on Pick story (DEC-709, DEC-283).
- Goodbye goes (DEC-628). Done for tonight returns the board to the landing painting. `GoodbyeTeardown.tsx`, `lib/goodbye.ts` and the `goodbye` screen id are removed; the idle-on-close test moves to Done for tonight.
- The session screen's slice version (New game and Done for tonight only, DEC-219) is replaced by the full SCR-021 layout.

## Survival invariants

- Continue, restore, and restart must keep:
  - The autosave after a quit and after Done for tonight (DEC-208, DEC-713). Continue resumes it with the same day, positions, purse and seed.
  - Tonight's games after a host restart in the same session.
  - "Tower lost" between games until the next game's start runs the tower block.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-17 all pass (verifier table on PR).
- Not required: drilling in to a game's stats and Play again (feature 07). Continue's piece check (feature 11; until then Continue behaves as today: checkpoint reload and the tower check). Past sessions (DEC-629).

## AREA / DEC checklist

- [ ] SCR-021: closed before coding (`decided`). Continue (only with an autosave), New game, tonight's games, Done for tonight, the tower's state. Board shows; iPads press.
- [ ] DEC-709: closed before coding (`decided`). Continue first, hidden from New game → Yes until Begin even though the old save survives until Begin (Bob 2026-10-31); New game asks "This replaces the saved game. Are you sure?" while an autosave exists.
- [ ] DEC-713: closed before coding (`decided`). Confirm; landing painting; tower to idle if in play; iPads "The session is over" with no buttons, then leave; the autosave stays.
- [ ] DEC-711: closed before coding (`decided`). "Tower lost" on the session screen; the next New game or Continue runs MEC-039 .5 to .25 again first; no Reconnect button there.
- [ ] DEC-712: closed before coding (`decided`). Between games a drop blocks nothing; if every iPad has dropped, the board shows the join QR until one joins.
- [ ] DEC-628: closed before coding (`decided`). No Goodbye in 1.0.

## Mockup alignment (Bob 2026-10-31: the approved mockup wins)

- Tower line: "tower: in play" / "without the tower" / "Tower lost" (tower wording ruling).
- Game rows read "Game 1", "Game 2"…; rows are pressable on the iPad (feature 07 drill-in).
- Session over: no body buttons. The bottom toolbar stays ("?" and gear, Bob 2026-10-31 10:37 AM ET); every gear item is disabled with the reason "The session is over.".
- There is no delete-game action and no delete confirm.
- Continue is hidden from New game → Yes until Begin (Bob ruling, C-2).
- Confirms use "<action>" / "Back".

## Eval approval

- See ./approval.md (must be filled before coding).
