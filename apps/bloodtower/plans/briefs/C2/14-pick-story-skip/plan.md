Keep this a checklist; do not write a second design doc.

# Brief: C2 / 14-pick-story-skip — Bugfix: Pick story always shows and waits for a press

## Meta

- Plan: C2 ([plan](../../../C2-session-shell.md), feature 14). G-C1 note GC1-06.
- Feature: 14-pick-story-skip
- Owner: Claude (brief). A Wright developer fixes it with the `bugfix` skill, on `fix/bloodtower-pick-story-skip`.
- Related AREA/docs: DEC-715 (keep the carousel; the skip is a bug), SCR-007, UI-016, SCR-009 (Dracula is a door that stops on not-ready), [G-C1 notes](../../../../docs/playtests/2026-10-31-G-C1.md) (GC1-06)
- Evals: ./eval.md
- Mockup: none (no design change: SCR-007 and UI-016 as built in W3)
- Risk: Medium (a regression in the startup flow)
- Touches: `apps/bloodtower/src/engine/loops/{session,game}/**`, `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/server/core/loadStories.ts`, `apps/bloodtower/src/web/components/board/StartupBoard.tsx`, `apps/bloodtower/src/web/components/device/CoreDeviceScreen.tsx`, `apps/bloodtower/src/e2e/tests/w3-pick-story.spec.ts`
- Depends on: feature 08 merged (the session shell is serial)

## The bug

Bob, G-C1: "In the c1 build there was no picking, just new story came up." The W3 carousel worked before C1.

Leads, not yet traced:

- The iPad's `StoryNav` in `CoreDeviceScreen.tsx` renders only when `view.doors.length > 1`. If the C1 build loads one door, the iPad shows a single primary button and no carousel, so the pick looks skipped.
- Doors come from `state.levels` entries named `door-*` (`engine/views/project.ts`). Check whether Dracula (`packs/dracula`, `playable: false`) still loads as a door through `server/core/loadStories.ts`, as SCR-007 and SCR-009 need.
- The engine's `pick-story` phase waits for `continue-pick-story-<id>` (`engine/loops/game/loop.ts`). Check that no path after features 05 to 08 enters the game loop past it.

## Steps (the `bugfix` skill)

1. Reproduce on `main` after feature 08: cold start, the Enter, New game. Write down what the board and the iPad show.
2. Failing test first, committed alone. If the bug cannot be reproduced on `main` after feature 08, stop and tell Bob what was tried; features 05 to 08 may have fixed it on the way.
3. Fix the code, not the test.
4. If the cause was a story not loading, log it as an error (decision 0003): a story pack that fails to load must never just vanish from Pick story.

## Cutover

Cutover: N

- A fix to the built flow. No screen, protocol or save change.

## Survival invariants

- Continue, restore, and restart must keep: Continue on Pick story (DEC-283) while an autosave exists, and the focused door after a host restart on Pick story.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-05 all pass (verifier table on PR).
- Not required: any change to the carousel's look (DEC-715: unchanged).

## AREA / DEC checklist

- [ ] DEC-715: closed before coding (`decided`). The carousel stays; Pick story always shows every loaded story and waits for a press before Game settings.
- [ ] SCR-007: closed before coding (`decided`). Dracula is a door; choosing it stops on not-ready and binds nothing.
- [ ] UI-016: closed before coding (`decided`). Focused cover large, previous and next peeking.

## Eval approval

- See ./approval.md (must be filled before coding).
