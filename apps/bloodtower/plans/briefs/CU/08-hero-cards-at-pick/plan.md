Keep this a checklist; do not write a second design doc.

# Brief: CU / 08-hero-cards-at-pick — The Story board shows hero cards during Pick

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (step 55, #481)
- Feature: 08-hero-cards-at-pick
- Kind: screen
- Owner: Gamewright (brief, evals); a Wright developer (build); Illusionist replaces the mockup
- Related AREA/docs: PT-15 in [the playtest](../../../../../../research/game-design/playtests/2026-11-12-paper-playtest-v1-v1.2.md); [design-freeze.md](../../../catchup/design-freeze.md) section H; SCR-010, DEC-232, DEC-098, DEC-201 (AREA-049, AREA-075); C2 feature 05
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: ./mockup.html (a Gamewright draft for the Illusionist to replace)
- Risk: Low
- Depends on: its approval.md on main; step 43 (#469) PT-15 DEC; step 45 Copy table
- Touches: `apps/bloodtower/src/web/components/board/StartupBoard.tsx` (ClaimPanel), `apps/bloodtower/src/web/components/board/HeroCard.tsx` (new), `apps/bloodtower/src/web/components/board/board.css`, `apps/bloodtower/src/protocols/v2/common.ts` and `views.ts` (public hero card fields), `apps/bloodtower/src/engine/loops/session/view.ts` (fills them from the pack and tuning), `apps/bloodtower/src/web/components/board/CoreStoryBoard.test.ts`, `apps/bloodtower/src/e2e/tests/w4-party.spec.ts`
- Builds: PT-15 (board cards only)
- Deps change: no
- Runs: cloud

## What it does

During Pick (screen `claim-heroes`) the Story board's pool shows one card per hero: portrait, class, fight number, hit points and one line from the hero. A seated hero's card greys out (DEC-098). Art stays on the board (DEC-201): the iPad shows no portraits and no new words. The iPad words are unchanged: "Pick Hero A", "N of N picked", "Who this iPad speaks for at the table" (DEC-232).

What main does today: `ClaimPanel` in `StartupBoard.tsx` draws a roster of `PortraitCard` (initial or image, name) with "Picked" or "Open"; no class, fight number, hit points or line. The pack holds `role`, `might` ... `ability`, `portrait` per hero (`packs/base/pack.yaml`) and `packs/base/tuning.yaml` holds `fight` and `hit_points` per role. The public hero view carries only id, name and held.

The Illusionist's `mockup.html` replaces the Gamewright draft before Bob approves.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - Held heroes stay greyed from the restored game, and the iPad words stay exactly as locked.
  - No card data reaches an iPad (DEC-201); the Menu and any gear panel come back closed, the toolbar on every iPad.
  - Pick stays by iPad press only: the cards are display only (DEC-278).

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-12 all pass (verifier table on PR).
- Not required: a per-iPad cap on picks; the line "Another iPad is waiting for a hero" (not built in 1.0, decided below); Look up content (PT-16).

## AREA / DEC checklist

- [ ] PT-15 ruling recorded as a DEC by step 43 (#469); closed before coding. The DEC says "Another iPad is waiting for a hero" is not built in 1.0.
- [ ] SCR-010: closed before coding (`decided`).
- [ ] DEC-232: closed before coding (`decided`); copy untouched.
- [ ] DEC-098: closed before coding (`decided`).
- [ ] DEC-201: closed before coding (`decided`).

## Copy

Exact player-facing text is Loremaster's, step 45. A build shows the locked rows below and fills every `[COPY: ...]` row from the final table, never from the mockup.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `pick.button` | Pick Hero A | locked: DEC-232 (Bob 2026-10-25); unchanged, iPad |
| 2 | `pick.count` | N of N picked | locked: DEC-232; unchanged |
| 3 | `pick.help` | Who this iPad speaks for at the table | locked: DEC-232; unchanged |
| 4 | `card.class` | [COPY: class names, from the pack role] | Loremaster, step 45 |
| 5 | `card.fight` | [COPY: label for the fight number {N}] | Loremaster, step 45 |
| 6 | `card.hp` | [COPY: label for hit points {N}] | Loremaster, step 45 |
| 7 | `card.line` | the pack's `ability` word for the hero (for example "Duel") | decided: Bob, 2026-11-14, adopted |
| 7a | `card.ability.<word>` | [COPY: one line per ability word, optional] | Loremaster, step 45; until filled the card shows the pack's `ability` as is |
| 8 | `card.state.seated` | Picked / Open (kept from main) | decided: Bob, 2026-11-14, adopted; Loremaster may reword in step 45 |

## Decided (was OPEN)

- "One virtue line" is the pack's `ability`. Loremaster may give each ability word a line in the Copy table (row 7a). Bob, 2026-11-14, adopted.
- "Another iPad is waiting for a hero" is NOT built in 1.0 (design-freeze section H omits it); step 43's DEC says so. Bob, 2026-11-14, adopted.
- The card words "Picked" and "Open" stay; Loremaster may reword in step 45. Bob, 2026-11-14, adopted.

## Eval approval

- See ./approval.md (must be filled before coding).
