Keep this a checklist; do not write a second design doc.

# Brief: C2 / 02-ambient-bed — The ambient bed plays on every Story board screen

## Meta

- Plan: C2 ([plan](../../../C2-session-shell.md), feature 02). G-C1 note GC1-01.
- Feature: 02-ambient-bed
- Owner: Claude (brief). A Wright developer builds it.
- Related AREA/docs: DEC-704, SCR-003, SCR-002, DEC-231, DEC-500; audit: `components/title` is the only place that makes `BoardAudio`
- Evals: ./eval.md
- Mockup: none (no screen change)
- Risk: Med (audio unlock is browser policy)
- Touches: `apps/bloodtower/src/web/components/title/**`, `apps/bloodtower/src/web/components/board/{LiveBoard,SoundDialog}.tsx`, `apps/bloodtower/src/web/lib/audio/**`, `apps/bloodtower/src/web/app/{layout.tsx,page.tsx,board/**}`, `apps/bloodtower/src/e2e/tests/sound-*.spec.ts`, `apps/bloodtower/src/e2e/playwright.config.ts` (autoplay flag only)

## Cutover

Cutover: N

- Today `/` opens the board with `window.location.assign("/board")`, a full page load that drops the audio context. The way to the board must keep the one context alive (for example a client-side route change). The landing page and the board still have their own URLs.

## Survival invariants

- Continue, restore, and restart must keep: the music, ambient and voice levels set on the landing page (SCR-003). A host restart does not reset them.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-06 all pass (verifier table on PR).
- Not required: a story or screen choosing its own bed (DEC-500: the landing page's bed plays throughout until one does). Stopping at Goodbye (parked, DEC-628).

## AREA / DEC checklist

- [ ] DEC-704: closed before coding (`decided`, Bob 2026-10-31). The bed plays on every board screen, no second gesture, levels apply everywhere, iPads play nothing.
- [ ] SCR-003: closed before coding (`decided`). The landing page's Sound control sets the levels.
- [ ] DEC-231: closed before coding (`decided`). iPads play no sound.

## Eval approval

- See ./approval.md (must be filled before coding).
