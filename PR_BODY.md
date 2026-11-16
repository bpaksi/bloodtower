Fixes #482

Step 56 / CU/09: DEC-571 first-time hints, a Hints toggle on Game settings, and the Rules group in Look up. All words come from the Copy table in `plan.md` (checked by a test).

## How it works
- `engine/hints/`: the copy, the registry of five hint ids (loop id to hint id), `hintsOn`, `applyHints`, `endHint`. A hint shows once per game; the shown set (`hintsShown`) is kept in the checkpoint.
- `stepShell` is wrapped: a loop the step entered earns its hint. Triggers on main: `encounter` enter = building visit, the day's night phases = skull drop, `day` loop end = day's end. `battle` and `event` have no loop on main; they are registry entries tested with a synthetic loop-entered event. C4-02's checklist already carries "wire `hint.first-battle`" (step 44).
- The hint is the loop's first beat: the view has `hint` on the board, the iPads are offered no action until a `hint-end` event. The host appends `hint-end` from a timer of `AUTO_ADVANCE_MS`. It is a Scroll, or a caption under the art when a place still is showing.
- Hints row: after the engine's rows (`length`, `difficulty`, `party-size`), before the story's own. Setup only: a later `set-setting` is refused with `hints-after-setup`.
- Look up: a "Rules" group of five pages. A pick sends the page id; the board shows the title and page, display only. The old placeholders are gone. A pick with no page logs `rules-page-missing`.
- Survival: an old checkpoint has no hint record, so Hints is on and nothing is shown; a showing hint is not kept across a restart; Play again keeps `settingValues.hints` and clears the shown set.

## Files changed
- New: `src/engine/hints/{copy,registry,flow,index}.ts`, `src/web/components/board/HintScroll.tsx`, `src/e2e/tests/c3-hints.spec.ts`, `src/server/core/{hints,hintsCopy,hintsCheckpoint}.test.ts`
- Engine: `loops/game/setupFlow.ts`, `loops/session/{effects,events,gear,hub,state,stepShell,view}.ts`, `views/{project,state}.ts`
- Protocol: `protocols/index.ts`, `protocols/v2/{index,views}.ts`
- Server: `server/core/{serialize,session}.ts`; `audit-r07-fault-injection.test.ts` and `towerLost.test.ts` set Hints off so their press loops are not held by a hint
- Web: `board/{CoreStoryBoard,GearBoardPanel}.tsx`, `device/CoreDeviceScreen.tsx`
- `e2e/tests/w1-chrome.spec.ts` (the Look up step now uses the Rules pages), `apps/bloodtower/spec.md`
- Not touched: `CoreStoryBoard.test.ts`, `board.css` (step 57)

## Verifier table
`pnpm check` passed locally (Biome, repo checks, typecheck, unit tests in every package). Playwright could not run here (no browser, download blocked), so every e2e row is **not run**.

| EV | Covered by | Status |
|---|---|---|
| EV-01 | unit `hints.test.ts` "EV-01 …Hints row"; e2e `c3-hints.spec.ts` EV-01 | unit pass, e2e not run |
| EV-02 | unit `hints.test.ts` registry and "over a game" | pass |
| EV-03 | unit `hints.test.ts` "EV-03 synthetic battle" | pass |
| EV-04 | unit `hints.test.ts` "EV-04 first beat"; e2e `c3-hints.spec.ts` EV-04 | unit pass, e2e not run |
| EV-05 | unit `hints.test.ts` "EV-05" (two); e2e `c3-hints.spec.ts` EV-05 | unit pass, e2e not run |
| EV-06 | unit `hints.test.ts` "EV-06"; e2e `c3-hints.spec.ts` EV-06 and `w1-chrome.spec.ts` | unit pass, e2e not run |
| EV-07 | unit `hintsCopy.test.ts` (reads plan.md) | pass |
| EV-08 | screenshots written by `c3-hints.spec.ts`; not compared with the mockup | not run (gap) |
| EV-09 | unit `hints.test.ts` "EV-09" (two) | pass |
| EV-11 | unit `hints.test.ts` "EV-11" (checkpoint round trip, no repeat after restore) | unit pass; no Continue e2e (gap) |
| EV-12 | unit `hintsCheckpoint.test.ts` (real `pre-c2-05` fixture) and `hints.test.ts` | pass |
| EV-13 | unit `hints.test.ts` "EV-13" (Play again keeps choice, clears shown set); the gear and `paused: false` part rests on the existing C2/04 serialize tests | unit pass; no e2e (gap) |
| EV-14 | unit `hints.test.ts` "EV-14"; e2e `c3-hints.spec.ts` EV-01/14 | unit pass, e2e not run |
| EV-15 | unit `hints.test.ts` "EV-04" (caption true under a place still); e2e `c3-hints.spec.ts` EV-04/15 | unit pass, e2e not run |

## Deviations and TODOs
- **Narrator voice (TODO):** the repo has narrate/packed-line plumbing but no hint clips. The Scroll/caption ships; `voiceId` in the hint view is `null` with a TODO in `view.ts`. Nothing was generated or downloaded. Once asset-studio packs a clip per hint id, set `voiceId` and have the board play it.
- **Engine's three rows:** Length, Difficulty and Party size are not built on main. Hints goes after any story setting with those ids (`length`, `difficulty`, `party-size`) and before the rest.
- **Board settings cap** raised from 4 to 5 levels (and the startup levels from 6 to 7) so Hints always shows.
- **4 s timing:** the end is a host timer (real clock) appended as a `hint-end` event, so replay is deterministic. The e2e waits on the board instead of faking a 3.9/4.1 s clock.
- **iPads during a hint:** they are offered no action until the hint ends (the board hides the day panel behind a Scroll). An iPad shows its waiting state, not necessarily its prior screen.
- **Skull-drop trigger** reads the day's night phases directly, because the loop runtime mutates the stack in place. Skulls drop on night 1 here, so the order in a game is building, skull drop, day's end.
- The first-battle and first-event hints have no live trigger yet (registry and synthetic test only).
