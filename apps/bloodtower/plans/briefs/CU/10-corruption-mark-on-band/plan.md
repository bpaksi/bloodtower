Keep this a checklist; do not write a second design doc.

# Brief: CU / 10-corruption-mark-on-band — A hero one corruption from defeat gets a mark on the band

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (step 57, #483)
- Feature: 10-corruption-mark-on-band
- Kind: screen
- Owner: Gamewright (brief, evals); a Wright developer (build); Illusionist replaces the mockup
- Related AREA/docs: PT-17 in [the playtest](../../../../../../research/game-design/playtests/2026-11-12-paper-playtest-v1-v1.2.md); [design-freeze.md](../../../catchup/design-freeze.md) section H; UI-028, UI-030, DEC-043, DEC-676 (AREA-043, AREA-096); C3 11 (merged)
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: ./mockup.html (a Gamewright draft for the Illusionist to replace)
- Risk: Low
- Depends on: its approval.md on main; step 43 (#469) PT-17 DEC; step 45 Copy table; step 02 (C3 11, #384, merged)
- Touches: `apps/bloodtower/src/web/components/board/CoreStoryBoard.tsx` (the band), `apps/bloodtower/src/web/components/board/DayPanels.tsx` (the mark), `apps/bloodtower/src/web/components/board/board.css`, `apps/bloodtower/src/web/components/board/CoreStoryBoard.test.ts`, `apps/bloodtower/src/e2e/tests/c3-corruption-mark.spec.ts` (new), the engine constant for the corruption loss limit (one exported constant, in the engine module that holds the corruption rule; C3-08 reuses it), and a narrow test-only seed for hero corruption counts (the server's existing test-seed route or hook; step 12 owns the general seed hook and can grow from it)
- Builds: PT-17 (band mark only); the exported corruption loss limit constant (3, DEC-043, DEC-676); a narrow test-only corruption seed
- Deps change: no
- Runs: cloud

## What it does

A hero who stands one corruption from defeat (the mark threshold is the loss limit minus 1; the limit is 3, so 2 corruptions; a third loses the game at once, DEC-043, DEC-676) gets a mark on that hero's health mark in the edge band (UI-028). Display only: no button, no act, no engine change; DEC-676 is untouched.

Not here: the warning line on the Fight/Retreat board line and the mark on the foe panel's hero list. Both belong to C4-09 (#452).

What main does today: the band (`CoreStoryBoard.tsx`, `data-band`) draws one `[data-hero-panel]` per group with a `[data-health="unavailable"]` mark and `HeroCorruptions` text from `table.corruptions` (count per hero, `panelHeroId` the group lead). No mark exists.

The Illusionist's `mockup.html` replaces the Gamewright draft before Bob approves.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - The mark on exactly the heroes at 2 corruptions, recomputed from the restored game, not stored.
  - The Menu and any gear panel closed, the game not paused, the toolbar on every iPad.
  - Display only: the mark never sends a frame and never changes game state.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-10 all pass (verifier table on PR).
- Not required: the Fight/Retreat warning line and the foe-panel mark (C4-09); any scene at a third corruption (C3-10).

## AREA / DEC checklist

- [ ] PT-17 ruling recorded as a DEC by step 43 (#469); closed before coding.
- [ ] UI-028: closed before coding (`decided`; step 43 may add the mark).
- [ ] UI-030: closed before coding (`decided`).
- [ ] DEC-043: closed before coding (`decided`).
- [ ] DEC-676: closed before coding (`decided`); untouched.

## Copy

Exact player-facing text is Loremaster's, step 45 (LQ-2). Until then every slot is a `[COPY: ...]` placeholder; a build must not invent words.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `band.mark.label` | [COPY: spoken label for the mark, with {hero}] | Loremaster, step 45; the aria-label of the icon (decided: icon plus aria-label, no visible words) |
| 2 | `band.mark.glyph` | (icon, no text) | Gamewright draft; Illusionist draws the final icon |

## Decided (was OPEN)

All below: Bob, 2026-11-14, adopted from the Opus recommendation.

- The mark is an icon plus an aria-label, no visible words; the words belong to C4-09's Fight/Retreat line (LQ-2).
- The mark is per hero, inside the lead's span, as UI-028 asks.
- This step adds a narrow test-only seed for hero corruption counts and lists it in Touches; step 12 owns the general seed hook and can grow from it.
- This step defines one exported engine constant for the corruption loss limit (3, from DEC-043 and DEC-676) that C3-08 reuses; the mark threshold is that constant minus one. A third corruption loses the game at once (ruled), so no mark or eval exists for it.

## Eval approval

- See ./approval.md (must be filled before coding).
