Keep this a checklist; do not write a second design doc.

# Brief: C2 / 09-ipad-awake — Joined iPads stay awake

## Meta

- Plan: C2 ([plan](../../../C2-session-shell.md), feature 09). AREA-100 scene 7b.
- Feature: 09-ipad-awake
- Owner: Claude (brief). A Wright developer builds it.
- Related AREA/docs: DEC-712, DEC-154, SCR-016, decision 0003 (errors)
- Evals: ./eval.md
- Mockup: none (no new screen; a refused request uses the existing `DeviceErrorBanner`)
- Risk: Med (browser API, error path)
- Touches: `apps/bloodtower/src/web/components/device/LiveDevice.tsx`, `apps/bloodtower/src/web/lib/wakeLock.ts` (new), `apps/bloodtower/src/web/lib/wakeLock.test.ts` (new), `apps/bloodtower/src/web/lib/pageLogCodes.ts`, `apps/bloodtower/src/e2e/tests/c2-ipad-awake.spec.ts` (new)

## Cutover

Cutover: N

- Adds a screen wake lock to the device page. Nothing is removed.

## Survival invariants

- Continue, restore, and restart must keep: a joined iPad asks for the wake lock again after the page comes back (visible again, reload, or a host restart that reconnects it).

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-11 all pass (verifier table on PR).
- Not required: keeping the Mac or the TV awake. A drop between games (DEC-712: it blocks nothing; feature 06 covers the session screen side).

## AREA / DEC checklist

- [ ] DEC-712: closed before coding (`decided`). While joined, the device page asks the browser to keep the screen on. A refused request is logged and shown on that iPad. If the iPad sleeps anyway, it is a drop (DEC-154).
- [ ] DEC-154: closed before coding (`decided`). A drop mid-game pauses until every hero has a device again. Already built in C1; this feature does not change it.

## Mockup alignment (Bob 2026-10-31: the approved mockup wins)

- The refused notice is one element: DeviceErrorBanner with the mockup copy and the code, dismissible, above the bottom bar.

## Eval approval

- See ./approval.md (must be filled before coding).
