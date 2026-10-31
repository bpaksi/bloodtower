Keep this a checklist; do not write a second design doc.

# Brief: C2 / 01-dracula-length — Take Long out of the Dracula settings

## Meta

- Plan: C2 ([plan](../../../C2-session-shell.md), feature 01). Punch list item 6.
- Feature: 01-dracula-length
- Owner: Claude (brief). A Wright developer builds it.
- Related AREA/docs: DEC-502, DEC-508
- Evals: ./eval.md
- Mockup: none (no screen change; Game settings loses one button)
- Risk: Low
- Touches: `packs/dracula/pack.yaml`, `apps/bloodtower/src/server/pack/load.test.ts` (one new case), `apps/bloodtower/src/e2e/tests/{opening-screens,w3-pick-story}.spec.ts`

## Cutover

Cutover: N

- Only Dracula's Length options change. No code changes.

## Survival invariants

- Continue, restore, and restart must keep: a Dracula autosave is impossible (Dracula is `playable: false`), so there is nothing to keep. The test pack's settings stay as they are.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-06 all pass (verifier table on PR).
- Not required: any change to `packs/test` or to how settings are drawn.

## AREA / DEC checklist

- [ ] DEC-502: closed before coding (`decided`). 1.0 keeps Short and Standard; Long waits.
- [ ] DEC-508: closed before coding (`decided`). Dracula's 1.0 cut has no Long.

## Mockup alignment (Bob 2026-10-31: the approved mockup wins)

- No summary line under Length (mockup); EV-02 no longer asserts "Length: Standard".
- Long is removed from pack data, not greyed (mockup shows two buttons only).

## Eval approval

- See ./approval.md (must be filled before coding).
