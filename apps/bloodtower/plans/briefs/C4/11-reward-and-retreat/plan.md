Keep this a checklist; do not write a second design doc.

# Brief: C4 / 11-reward-and-retreat — The battle's end on screen: reward, retreat and fall

## Meta

- Plan: [C4-battle-tomb.md](../../../C4-battle-tomb.md)
- Feature: 11-reward-and-retreat
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, UI-039, UI-040, UI-036, DEC-120, DEC-016, DEC-177
- Evals: ./evals.md
- Screen spec: ./screen-spec.md
- Mockup: none yet; Illusionist draws ./mockup.html from ./screen-spec.md before Bob approves the evals
- Depends on: 03, 09, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/{BattleReward,RetreatResult}.tsx` (new), `apps/bloodtower/src/web/components/device/RewardTaker.tsx` (new)
- Builds: UI-039, UI-040
- Deps change: no
- Runs: cloud

## What it does

UI-040: the gold and drawn card on a Reveal; the iPads pick who takes the card. UI-039: what a retreat or fall cost, the foe painting and its step-up.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - An untaken reward card is still waiting after Continue.

## Done-when (e2e)

Contract is ./evals.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-05 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; the Tower finale and A1 art (C5).

## AREA / DEC checklist

- [ ] UI-039: closed before coding (`decided`).
- [ ] UI-040: closed before coding (`decided`).
- [ ] UI-036: closed before coding (`decided`).
- [ ] DEC-120: closed before coding (`decided`).
- [ ] DEC-016: closed before coding (`decided`).
- [ ] DEC-177: closed before coding (`decided`).

## OPEN questions

- None.

## Eval approval

- See ./approval.md (must be filled before coding).
