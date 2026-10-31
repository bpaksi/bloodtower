Keep this a checklist; do not write a second design doc.

# Brief: C2 / 08-tower-lost-pause — A tower lost mid-game: Reconnect, Go on without, or Quit

## Meta

- Plan: C2 ([plan](../../../C2-session-shell.md), feature 08). AREA-100 scene 7a, in a game.
- Feature: 08-tower-lost-pause
- Owner: Claude (brief). A Wright developer builds it.
- Related AREA/docs: DEC-301, DEC-305, DEC-275, DEC-229, DEC-230, DEC-711, MEC-018, MEC-032; audit: the pause still offers Reconnect or Quit only (DEC-155)
- Evals: ./eval.md
- Mockup: ./mockup.html
- Risk: High (tower safety, seeded draws, restore)
- Touches: `apps/bloodtower/src/engine/loops/{session,game,play,day}/**`, `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/protocols/v2/**`, `apps/bloodtower/src/server/core/**`, `apps/bloodtower/src/web/components/board/{CoreStoryBoard,WaitingDialog}.tsx`, `apps/bloodtower/src/web/components/device/{CoreDeviceScreen,ChromeBar}.tsx`, `apps/bloodtower/src/e2e/tests/{area-077,acceptance}.spec.ts`, `apps/bloodtower/src/e2e/tests/c2-tower-lost.spec.ts` (new)

## Cutover

Cutover: Y

- The tower-lost pause's two buttons (Reconnect, Quit story) become three (DEC-301). DEC-155's pause is gone.
- Without the tower, the skull drop prompt ("where did it land?") is replaced by a seeded simulated drop (DEC-305). This covers Play without Tower from feature 05 and Go on without from this feature.

## Survival invariants

- Continue, restore, and restart must keep:
  - Whether the game went on without the tower. A Continue of such a game does not ask for the tower.
  - Each simulated skull drop: replaying the log gives the same landing buildings.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-09 all pass (verifier table on PR).
- Not required: seals and glyphs without the tower (Q-193; the day slice has neither). The tower check's piece pictures (feature 11); until then Reconnect runs the tower check as C1 built it.
- Copy (mockup): pause title "Tower lost"; buttons "Reconnect", "Go on without", "Quit". After Go on without the session status line reads "without the tower".

## AREA / DEC checklist

- [ ] DEC-301: closed before coding (`decided`). Three buttons; Go on without asks to confirm; Reconnect stays in the Menu; Reconnect runs the tower check (MEC-018) before play goes on; Reconnect only on a press.
- [ ] DEC-305: closed before coding (`decided`). Without the tower every sound or light node is skipped; the board does not change; the skull drop is simulated by a seeded draw.
- [ ] DEC-711: closed before coding (`decided`). A tower lost once a game has started, piece setup included, pauses that game.

## Mockup alignment (Bob 2026-10-31: the approved mockup wins)

- Pause buttons: "Reconnect" / "Go on without" / "Quit" (mockup).
- Tower wording: "Tower lost" for the mid-game drop; "without the tower" as the status line after Go on without.

## Eval approval

- See ./approval.md (must be filled before coding).
